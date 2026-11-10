from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DB, CurrentUser, OptionalUser
from app.core.cache import invalidate
from app.models import Order, OrderItem, OrderStatus
from app.services import order_notify
from app.services import orders as order_service

router = APIRouter(tags=["orders"])


@router.post("/cart/quote", response_model=schemas.QuoteOut)
async def cart_quote(data: schemas.QuoteIn, db: DB):
    out, _ = await order_service.quote(db, data)
    return out


@router.post("/orders", response_model=schemas.OrderOut, status_code=201)
async def place_order(data: schemas.CheckoutIn, db: DB, user: OptionalUser, tasks: BackgroundTasks):
    order = await order_service.place_order(db, data, user)
    await invalidate("product:*", "products:*")  # stock changed
    tasks.add_task(order_notify.send, order_notify.snapshot(order, "placed"))
    return order


def _same_phone(a: str, b: str) -> bool:
    digits = lambda s: "".join(ch for ch in s if ch.isdigit())[-10:]  # noqa: E731
    return len(digits(a)) == 10 and digits(a) == digits(b)


@router.get("/orders", response_model=list[schemas.OrderSummary])
async def my_orders(user: CurrentUser, db: DB):
    rows = (
        await db.execute(
            select(Order, func.coalesce(func.sum(OrderItem.quantity), 0))
            .outerjoin(OrderItem)
            .where(Order.user_id == user.id)
            .group_by(Order.id)
            .order_by(Order.created_at.desc())
        )
    ).all()
    return [
        schemas.OrderSummary(
            number=o.number, status=o.status, total=o.total, created_at=o.created_at,
            item_count=count, city=o.city, name=o.name, phone=o.phone,
        )
        for o, count in rows
    ]


@router.get("/orders/track", response_model=schemas.OrderOut)
async def track(db: DB, number: Annotated[str, Query(max_length=20)], phone: Annotated[str, Query(max_length=20)]):
    """Guest order tracking: needs the order number and the phone used at checkout."""
    order = await db.scalar(
        select(Order).where(Order.number == number.upper()).options(selectinload(Order.items), selectinload(Order.events))
    )
    if order is None or not _same_phone(order.phone, phone):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find an order with that number and phone.")
    return order


@router.get("/orders/{number}", response_model=schemas.OrderOut)
async def order_detail(number: str, user: CurrentUser, db: DB):
    order = await order_service.load_order(db, number)
    if order.user_id != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


CANCELLABLE = (OrderStatus.pending, OrderStatus.confirmed)


@router.post("/orders/{number}/cancel", response_model=schemas.OrderOut)
async def cancel_order(number: str, data: schemas.CancelOrderIn, db: DB, user: OptionalUser, tasks: BackgroundTasks):
    """Customers can cancel until the order ships. Guests prove ownership with the checkout phone."""
    order = await db.scalar(
        select(Order).where(Order.number == number.upper()).options(selectinload(Order.items), selectinload(Order.events))
    )
    owns = order is not None and (
        (user is not None and order.user_id == user.id) or (data.phone is not None and _same_phone(order.phone, data.phone))
    )
    if not owns:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order.status not in CANCELLABLE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This order has already shipped, so it can't be cancelled online. Please contact us on WhatsApp.",
        )
    reason = data.reason.strip()
    order = await order_service.change_status(
        db, order, schemas.OrderStatusIn(status=OrderStatus.cancelled, note=f"Cancelled by customer{': ' + reason if reason else ''}")
    )
    await invalidate("product:*", "products:*")  # stock went back
    tasks.add_task(order_notify.send, order_notify.snapshot(order, "cancelled"))
    return order
