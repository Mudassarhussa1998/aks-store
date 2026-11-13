import secrets
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import schemas
from app.core.config import settings
from app.models import Address, Coupon, Order, OrderEvent, OrderItem, OrderStatus, Product, User, Variant
from app.services.catalog import refresh_product_stats


async def _coupon_discount(db: AsyncSession, code: str | None, subtotal: int) -> tuple[int, str | None, str | None]:
    """Returns (discount, applied_code, error)."""
    if not code:
        return 0, None, None
    coupon = await db.scalar(select(Coupon).where(Coupon.code == code.strip().upper(), Coupon.is_active))
    if coupon is None or (coupon.expires_at and coupon.expires_at < datetime.now(UTC)):
        return 0, None, "This coupon code is not valid."
    if subtotal < coupon.min_subtotal:
        return 0, None, f"Add Rs {coupon.min_subtotal - subtotal:,} more to use {coupon.code}."
    discount = subtotal * coupon.value // 100 if coupon.kind == "percent" else coupon.value
    return min(discount, subtotal), coupon.code, None


async def quote(db: AsyncSession, data: schemas.QuoteIn, *, lock: bool = False) -> tuple[dict, dict[int, Variant]]:
    ids = [line.variant_id for line in data.items]
    stmt = select(Variant).where(Variant.id.in_(ids)).options(
        selectinload(Variant.product).selectinload(Product.images)
    )
    if lock:
        stmt = stmt.with_for_update(of=Variant)
    variants = {v.id: v for v in (await db.scalars(stmt)).all()}

    lines, subtotal = [], 0
    for line in data.items:
        v = variants.get(line.variant_id)
        if v is None or not v.product.is_active:
            continue
        images = v.product.images
        image = next((i.url for i in images if i.color and i.color == v.color), images[0].url if images else None)
        available = v.stock >= line.quantity
        total = v.price * line.quantity
        if available:
            subtotal += total
        lines.append(
            schemas.QuoteLine(
                variant_id=v.id,
                product_id=v.product_id,
                product_slug=v.product.slug,
                product_name=v.product.name,
                variant_label=v.label,
                sku=v.sku,
                image=image,
                unit_price=v.price,
                compare_at_price=v.compare_at_price,
                quantity=line.quantity,
                line_total=total,
                stock=v.stock,
                available=available,
            )
        )

    discount, code, coupon_error = await _coupon_discount(db, data.coupon, subtotal)
    fee = 0 if subtotal == 0 or subtotal >= settings.free_delivery_threshold else settings.delivery_fee
    out = schemas.QuoteOut(
        lines=lines,
        subtotal=subtotal,
        delivery_fee=fee,
        discount=discount,
        total=subtotal - discount + fee,
        coupon=code,
        coupon_error=coupon_error,
        free_delivery_threshold=settings.free_delivery_threshold,
    ).model_dump()
    return out, variants


def _order_number() -> str:
    return "VLZ-" + "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))


async def place_order(db: AsyncSession, data: schemas.CheckoutIn, user: User | None) -> Order:
    # Row locks on the variants make concurrent checkouts for the last unit safe.
    q, variants = await quote(db, data, lock=True)
    bad = [line for line in q["lines"] if not line["available"]]
    if bad or not q["lines"]:
        names = ", ".join(f"{b['product_name']} ({b['variant_label']})" for b in bad) or "your items"
        raise HTTPException(status.HTTP_409_CONFLICT, f"Not enough stock for {names}. Please update your cart.")

    order = Order(
        number=_order_number(),
        user_id=user.id if user else None,
        status=OrderStatus.pending,
        payment_method="cod",
        subtotal=q["subtotal"],
        delivery_fee=q["delivery_fee"],
        discount=q["discount"],
        total=q["total"],
        coupon_code=q["coupon"],
        name=data.name,
        phone=data.phone,
        email=data.email or (user.email if user else None),
        city=data.city,
        area=data.area,
        address=data.address,
        note=data.note,
    )
    for line in q["lines"]:
        v = variants[line["variant_id"]]
        v.stock -= line["quantity"]
        order.items.append(
            OrderItem(
                product_id=line["product_id"],
                variant_id=v.id,
                product_name=line["product_name"],
                product_slug=line["product_slug"],
                variant_label=line["variant_label"],
                sku=line["sku"],
                image_url=line["image"],
                unit_price=line["unit_price"],
                quantity=line["quantity"],
            )
        )
    order.events.append(OrderEvent(status=OrderStatus.pending, note="Order placed — Cash on Delivery"))
    db.add(order)

    if user and data.save_address:
        exists_already = await db.scalar(
            select(Address).where(Address.user_id == user.id, Address.line == data.address, Address.city == data.city)
        )
        if not exists_already:
            has_any = await db.scalar(select(Address.id).where(Address.user_id == user.id).limit(1))
            db.add(
                Address(
                    user_id=user.id,
                    name=data.name,
                    phone=data.phone,
                    city=data.city,
                    area=data.area,
                    line=data.address,
                    is_default=has_any is None,
                )
            )

    await db.flush()
    for pid in {line["product_id"] for line in q["lines"]}:
        await refresh_product_stats(db, pid)
    await db.commit()
    return await load_order(db, order.number)


async def load_order(db: AsyncSession, number: str) -> Order:
    order = await db.scalar(
        select(Order).where(Order.number == number).options(selectinload(Order.items), selectinload(Order.events))
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


# Allowed admin transitions; cancelling/returning puts stock back.
TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.confirmed, OrderStatus.cancelled},
    OrderStatus.confirmed: {OrderStatus.shipped, OrderStatus.cancelled},
    OrderStatus.shipped: {OrderStatus.delivered, OrderStatus.returned},
    OrderStatus.delivered: {OrderStatus.returned},
    OrderStatus.cancelled: set(),
    OrderStatus.returned: set(),
}


async def change_status(db: AsyncSession, order: Order, data: schemas.OrderStatusIn) -> Order:
    if data.status not in TRANSITIONS[order.status]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot move an order from {order.status} to {data.status}.")
    if data.status in (OrderStatus.cancelled, OrderStatus.returned):
        for item in order.items:
            if item.variant_id:
                v = await db.get(Variant, item.variant_id, with_for_update=True)
                if v:
                    v.stock += item.quantity
    order.status = data.status
    if data.courier is not None:
        order.courier = data.courier
    if data.tracking_number is not None:
        order.tracking_number = data.tracking_number
    order.events.append(OrderEvent(status=data.status, note=data.note))
    await db.flush()
    for pid in {i.product_id for i in order.items if i.product_id}:
        await refresh_product_stats(db, pid)
    await db.commit()
    return await load_order(db, order.number)
