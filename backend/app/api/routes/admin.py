from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DB, AdminUser
from app.api.routes.catalog import _review_out
from app.core.cache import invalidate
from app.models import (
    Category,
    ContactMessage,
    Coupon,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductImage,
    Review,
    User,
    Variant,
)
from app.services import catalog, images, order_notify
from app.services import orders as order_service

router = APIRouter(prefix="/admin", tags=["admin"])

LOW_STOCK = 3


async def _bust_catalog() -> None:
    await invalidate("product:*", "products:*", "related:*", "suggest:*", "categories")


@router.get("/stats", response_model=schemas.Stats)
async def stats(_: AdminUser, db: DB):
    now = datetime.now(UTC)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month = today.replace(day=1)
    count_between = lambda a, b: select(func.count(Order.id)).where(Order.created_at >= a, Order.created_at < b)  # noqa: E731
    return schemas.Stats(
        orders_today=await db.scalar(count_between(today, now + timedelta(seconds=1))) or 0,
        orders_yesterday=await db.scalar(count_between(today - timedelta(days=1), today)) or 0,
        pending_orders=await db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.pending)) or 0,
        revenue_month=await db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.status == OrderStatus.delivered, Order.created_at >= month
            )
        )
        or 0,
        low_stock_variants=await db.scalar(select(func.count(Variant.id)).where(Variant.stock <= LOW_STOCK)) or 0,
        customers=await db.scalar(select(func.count(User.id)).where(User.is_admin.is_(False))) or 0,
        pending_reviews=await db.scalar(select(func.count(Review.id)).where(Review.is_published.is_(False))) or 0,
        unread_messages=await db.scalar(select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))) or 0,
    )


# ---------- orders ----------


@router.get("/orders", response_model=list[schemas.OrderSummary])
async def orders(
    _: AdminUser,
    db: DB,
    status_: Annotated[OrderStatus | None, Query(alias="status")] = None,
    q: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
):
    stmt = (
        select(Order, func.coalesce(func.sum(OrderItem.quantity), 0))
        .outerjoin(OrderItem)
        .group_by(Order.id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * 50)
        .limit(50)
    )
    if status_:
        stmt = stmt.where(Order.status == status_)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Order.number.ilike(like), Order.name.ilike(like), Order.phone.ilike(like)))
    rows = (await db.execute(stmt)).all()
    return [
        schemas.OrderSummary(
            number=o.number, status=o.status, total=o.total, created_at=o.created_at,
            item_count=c, city=o.city, name=o.name, phone=o.phone,
        )
        for o, c in rows
    ]


@router.get("/orders/{number}", response_model=schemas.OrderOut)
async def order(number: str, _: AdminUser, db: DB):
    return await order_service.load_order(db, number)


@router.patch("/orders/{number}", response_model=schemas.OrderOut)
async def update_order(number: str, data: schemas.OrderStatusIn, _: AdminUser, db: DB, tasks: BackgroundTasks):
    o = await order_service.load_order(db, number)
    o = await order_service.change_status(db, o, data)
    await _bust_catalog()
    tasks.add_task(order_notify.send, order_notify.snapshot(o, o.status.value))
    return o


# ---------- products ----------


async def _admin_detail(db, product_id: int) -> dict:
    p = await db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images), selectinload(Product.variants), selectinload(Product.category))
    )
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    data = await catalog.serialize_detail(db, p)
    return {**data, "is_active": p.is_active, "is_featured": p.is_featured, "category_id": p.category_id}


async def _category_and_descendants(db, category_id: int) -> list[int]:
    rows = (await db.execute(select(Category.id, Category.parent_id))).all()
    out, stack = [], [category_id]
    while stack:
        cid = stack.pop()
        out.append(cid)
        stack.extend(c for c, parent in rows if parent == cid)
    return out


def _sku_match(q: str):
    return select(Variant.id).where(Variant.product_id == Product.id, Variant.sku.ilike(f"%{q}%")).exists()


def _low_stock():
    return select(Variant.id).where(Variant.product_id == Product.id, Variant.stock <= LOW_STOCK).exists()


PRODUCT_SORTS = {
    "newest": Product.created_at.desc(),
    "oldest": Product.created_at.asc(),
    "name": Product.name.asc(),
    "price_asc": Product.min_price.asc(),
    "price_desc": Product.min_price.desc(),
    "stock_asc": Product.total_stock.asc(),
}


@router.get("/products", response_model=schemas.AdminProductList)
async def products(
    _: AdminUser,
    db: DB,
    q: str | None = None,
    category_id: int | None = None,
    status_: Annotated[Literal["all", "active", "hidden", "featured"], Query(alias="status")] = "all",
    stock: Literal["all", "in", "low", "out"] = "all",
    sort: Literal["newest", "oldest", "name", "price_asc", "price_desc", "stock_asc"] = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
):
    base = []  # filters shared by the list and the status counts
    if q := (q or "").strip():
        base.append(or_(Product.name.ilike(f"%{q}%"), _sku_match(q)))
    if category_id:
        base.append(Product.category_id.in_(await _category_and_descendants(db, category_id)))
    if stock == "in":
        base.append(Product.total_stock > 0)
    elif stock == "low":
        base.append(and_(Product.total_stock > 0, _low_stock()))
    elif stock == "out":
        base.append(Product.total_stock == 0)

    by_status = {
        "all": [],
        "active": [Product.is_active.is_(True)],
        "hidden": [Product.is_active.is_(False)],
        "featured": [Product.is_featured.is_(True)],
    }
    count = lambda extra: select(func.count(Product.id)).where(*base, *extra)  # noqa: E731
    counts = schemas.AdminProductCounts(
        all=await db.scalar(count([])) or 0,
        active=await db.scalar(count(by_status["active"])) or 0,
        hidden=await db.scalar(count(by_status["hidden"])) or 0,
        out_of_stock=await db.scalar(count([Product.total_stock == 0])) or 0,
    )
    filters = [*base, *by_status[status_]]
    total = await db.scalar(count(by_status[status_])) or 0
    rows = (
        await db.scalars(
            select(Product)
            .where(*filters)
            .options(selectinload(Product.images), selectinload(Product.variants), selectinload(Product.category))
            .order_by(PRODUCT_SORTS[sort], Product.id.desc())
            .offset((page - 1) * 50)
            .limit(50)
        )
    ).all()
    return schemas.AdminProductList(
        items=[
            schemas.AdminProductRow(
                id=p.id,
                slug=p.slug,
                name=p.name,
                category=p.category.name,
                category_id=p.category_id,
                image=p.images[0].url if p.images else None,
                price=p.min_price,
                badge=p.badge,
                is_active=p.is_active,
                is_featured=p.is_featured,
                total_stock=p.total_stock,
                variant_count=len(p.variants),
                low_stock_variants=sum(1 for v in p.variants if v.stock <= LOW_STOCK),
                rating_avg=round(p.rating_avg, 1),
                rating_count=p.rating_count,
                created_at=p.created_at,
            )
            for p in rows
        ],
        total=total,
        page=page,
        pages=-(-total // 50),
        counts=counts,
    )


@router.get("/products/{product_id}", response_model=schemas.AdminProductOut)
async def product(product_id: int, _: AdminUser, db: DB):
    return await _admin_detail(db, product_id)


async def _apply_product(db, p: Product, data: schemas.AdminProductIn) -> None:
    for field in ("name", "slug", "category_id", "description", "material_care", "badge", "is_active", "is_featured"):
        setattr(p, field, getattr(data, field))

    by_id = {v.id: v for v in p.variants}
    by_sku = {v.sku: v for v in p.variants}
    keep: list[Variant] = []
    for pos, vin in enumerate(data.variants):
        # Match on id, falling back to SKU so a re-sent row updates in place instead of colliding.
        v = by_id.get(vin.id) if vin.id else by_sku.get(vin.sku)
        if v is None:
            v = Variant()
        for field in ("sku", "size", "color", "color_hex", "quality", "price", "compare_at_price", "stock"):
            setattr(v, field, getattr(vin, field))
        v.position = pos
        keep.append(v)
    p.variants = keep
    p.images = [ProductImage(url=i.url, alt=i.alt, color=i.color, position=n) for n, i in enumerate(data.images)]


@router.post("/products", response_model=schemas.AdminProductOut, status_code=201)
async def create_product(data: schemas.AdminProductIn, _: AdminUser, db: DB):
    p = Product(variants=[], images=[])
    await _apply_product(db, p, data)
    db.add(p)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug or SKU already in use.") from exc
    await catalog.refresh_product_stats(db, p.id)
    await db.commit()
    await _bust_catalog()
    return await _admin_detail(db, p.id)


@router.put("/products/{product_id}", response_model=schemas.AdminProductOut)
async def update_product(product_id: int, data: schemas.AdminProductIn, _: AdminUser, db: DB):
    p = await db.scalar(
        select(Product).where(Product.id == product_id).options(selectinload(Product.variants), selectinload(Product.images))
    )
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    await _apply_product(db, p, data)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug or SKU already in use.") from exc
    await catalog.refresh_product_stats(db, p.id)
    await db.commit()
    await _bust_catalog()
    return await _admin_detail(db, p.id)


@router.delete("/products/{product_id}", status_code=204)
async def archive_product(product_id: int, _: AdminUser, db: DB):
    """Products are archived (hidden), not deleted, so old orders keep their links."""
    p = await db.get(Product, product_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    p.is_active = False
    await db.commit()
    await _bust_catalog()


@router.patch("/products/{product_id}", status_code=204)
async def set_product_flags(product_id: int, data: schemas.ProductFlagsIn, _: AdminUser, db: DB):
    """Quick show/hide and feature toggles from the product list."""
    p = await db.get(Product, product_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    await db.commit()
    await _bust_catalog()


@router.post("/products/bulk")
async def bulk_products(data: schemas.BulkProductsIn, _: AdminUser, db: DB):
    field, value = {
        "show": ("is_active", True),
        "hide": ("is_active", False),
        "feature": ("is_featured", True),
        "unfeature": ("is_featured", False),
    }[data.action]
    result = await db.execute(update(Product).where(Product.id.in_(data.ids)).values({field: value}))
    await db.commit()
    await _bust_catalog()
    return {"updated": result.rowcount}


async def _free_value(db, column, wanted: str) -> str:
    """`wanted`, or `wanted-2`, `wanted-3`… — the first value not already used in `column`."""
    taken = set((await db.scalars(select(column).where(column.like(f"{wanted}%")))).all())
    if wanted not in taken:
        return wanted
    n = 2
    while f"{wanted}-{n}" in taken:
        n += 1
    return f"{wanted}-{n}"


@router.post("/products/{product_id}/duplicate", response_model=schemas.AdminProductOut, status_code=201)
async def duplicate_product(product_id: int, _: AdminUser, db: DB):
    """Copy a product as a hidden draft with zero stock, so the copy never oversells."""
    src = await db.scalar(
        select(Product).where(Product.id == product_id).options(selectinload(Product.variants), selectinload(Product.images))
    )
    if src is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    copy = Product(
        name=f"{src.name} (copy)"[:160],
        slug=await _free_value(db, Product.slug, f"{src.slug}-copy"[:150]),
        category_id=src.category_id,
        description=src.description,
        material_care=src.material_care,
        badge=src.badge,
        is_active=False,
        is_featured=False,
        variants=[
            Variant(
                sku=await _free_value(db, Variant.sku, f"{v.sku}-C"[:55]),
                size=v.size,
                color=v.color,
                color_hex=v.color_hex,
                quality=v.quality,
                price=v.price,
                compare_at_price=v.compare_at_price,
                stock=0,
                position=v.position,
            )
            for v in src.variants
        ],
        images=[ProductImage(url=i.url, alt=i.alt, color=i.color, position=i.position) for i in src.images],
    )
    db.add(copy)
    await db.flush()
    await catalog.refresh_product_stats(db, copy.id)
    await db.commit()
    return await _admin_detail(db, copy.id)


# ---------- inventory ----------


@router.get("/inventory", response_model=schemas.InventoryPage)
async def inventory(
    _: AdminUser,
    db: DB,
    q: str | None = None,
    stock: Literal["all", "low", "out"] = "low",
    category_id: int | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
):
    filters = []
    if q := (q or "").strip():
        filters.append(or_(Product.name.ilike(f"%{q}%"), Variant.sku.ilike(f"%{q}%")))
    if stock == "low":
        filters.append(Variant.stock <= LOW_STOCK)
    elif stock == "out":
        filters.append(Variant.stock == 0)
    if category_id:
        filters.append(Product.category_id.in_(await _category_and_descendants(db, category_id)))
    total = await db.scalar(select(func.count(Variant.id)).join(Product).where(*filters)) or 0
    rows = (
        await db.execute(
            select(Variant, Product)
            .join(Product)
            .where(*filters)
            .options(selectinload(Product.images))
            .order_by(Variant.stock.asc(), Product.name.asc(), Variant.position.asc())
            .offset((page - 1) * 100)
            .limit(100)
        )
    ).all()
    return schemas.InventoryPage(
        items=[
            schemas.InventoryRow(
                id=v.id,
                product_id=p.id,
                product_name=p.name,
                product_slug=p.slug,
                product_active=p.is_active,
                image=next((i.url for i in p.images if i.color and i.color == v.color), p.images[0].url if p.images else None),
                sku=v.sku,
                label=v.label or "Default",
                price=v.price,
                stock=v.stock,
            )
            for v, p in rows
        ],
        total=total,
        page=page,
        pages=-(-total // 100),
        low_threshold=LOW_STOCK,
    )


@router.put("/inventory")
async def update_inventory(data: schemas.StockUpdateIn, _: AdminUser, db: DB):
    wanted = {i.id: i.stock for i in data.items}
    variants = (await db.scalars(select(Variant).where(Variant.id.in_(wanted)))).all()
    if len(variants) != len(wanted):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Some variants no longer exist. Reload the page.")
    for v in variants:
        v.stock = wanted[v.id]
    await db.flush()
    for product_id in {v.product_id for v in variants}:
        await catalog.refresh_product_stats(db, product_id)
    await db.commit()
    await _bust_catalog()
    return {"updated": len(variants)}


@router.post("/uploads", status_code=201)
async def upload_image(_: AdminUser, file: Annotated[UploadFile, File()]):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please upload an image file.")
    try:
        url = await images.save_image(await file.read())
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read that image.") from exc
    return {"url": url}


# ---------- categories ----------


@router.get("/categories")
async def categories(_: AdminUser, db: DB):
    rows = (await db.scalars(select(Category).order_by(Category.sort_order, Category.name))).all()
    counts = dict((await db.execute(select(Product.category_id, func.count(Product.id)).group_by(Product.category_id))).all())
    return [
        {
            **schemas.AdminCategoryIn.model_validate(c, from_attributes=True).model_dump(),
            "id": c.id,
            "product_count": counts.get(c.id, 0),
            "child_count": sum(1 for x in rows if x.parent_id == c.id),
        }
        for c in rows
    ]


async def _check_parent(db, category_id: int | None, parent_id: int | None) -> None:
    """Categories are two levels deep (e.g. Home & Living › Blankets), which also rules out loops."""
    if parent_id is None:
        return
    if parent_id == category_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A category cannot be its own parent.")
    parent = await db.get(Category, parent_id)
    if parent is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That parent category no longer exists.")
    if parent.parent_id is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a top-level category as the parent.")
    if category_id and await db.scalar(select(Category.id).where(Category.parent_id == category_id).limit(1)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This category has sub-categories, so it must stay top-level.")


@router.post("/categories", status_code=201)
async def create_category(data: schemas.AdminCategoryIn, _: AdminUser, db: DB):
    await _check_parent(db, None, data.parent_id)
    c = Category(**data.model_dump())
    db.add(c)
    try:
        await db.commit()
    except IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already in use.") from exc
    await _bust_catalog()
    return {**data.model_dump(), "id": c.id}


@router.put("/categories/{category_id}")
async def update_category(category_id: int, data: schemas.AdminCategoryIn, _: AdminUser, db: DB):
    c = await db.get(Category, category_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    await _check_parent(db, category_id, data.parent_id)
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    try:
        await db.commit()
    except IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already in use.") from exc
    await _bust_catalog()
    return {**data.model_dump(), "id": c.id}


@router.put("/categories-order", status_code=204)
async def order_categories(data: schemas.CategoryOrderIn, _: AdminUser, db: DB):
    """Save the display order of sibling categories (ids in their new order)."""
    rows = {c.id: c for c in (await db.scalars(select(Category).where(Category.id.in_(data.ids)))).all()}
    if len(rows) != len(set(data.ids)) or len({c.parent_id for c in rows.values()}) != 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only categories with the same parent can be reordered together.")
    for position, cid in enumerate(data.ids):
        rows[cid].sort_order = position
    await db.commit()
    await _bust_catalog()


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, _: AdminUser, db: DB):
    c = await db.get(Category, category_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if await db.scalar(select(Category.id).where(Category.parent_id == category_id).limit(1)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Move or delete its sub-categories first.")
    products = await db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id)) or 0
    if products:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"{products} product{'s' if products != 1 else ''} still use this category. Move them first, or hide the category instead."
        )
    await db.delete(c)
    await db.commit()
    await _bust_catalog()


# ---------- reviews ----------


@router.get("/reviews", response_model=list[schemas.ReviewOut])
async def reviews(_: AdminUser, db: DB):
    rows = (
        await db.scalars(
            select(Review)
            .options(selectinload(Review.user), selectinload(Review.product))
            .order_by(Review.is_published, Review.created_at.desc())
            .limit(200)
        )
    ).all()
    return [{**_review_out(r), "is_published": r.is_published} for r in rows]


@router.patch("/reviews/{review_id}", status_code=204)
async def moderate_review(review_id: int, publish: bool, _: AdminUser, db: DB):
    r = await db.scalar(select(Review).where(Review.id == review_id).options(selectinload(Review.product)))
    if r is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    r.is_published = publish
    await catalog.refresh_product_stats(db, r.product_id)
    await db.commit()
    await invalidate(f"product:{r.product.slug}", "products:*")


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(review_id: int, _: AdminUser, db: DB):
    r = await db.get(Review, review_id)
    if r is None:
        return
    pid = r.product_id
    await db.execute(delete(Review).where(Review.id == review_id))
    await catalog.refresh_product_stats(db, pid)
    await db.commit()
    await _bust_catalog()


# ---------- coupons ----------


@router.get("/coupons", response_model=list[schemas.CouponOut])
async def coupons(_: AdminUser, db: DB):
    return (await db.scalars(select(Coupon).order_by(Coupon.created_at.desc()))).all()


@router.post("/coupons", response_model=schemas.CouponOut, status_code=201)
async def create_coupon(data: schemas.CouponIn, _: AdminUser, db: DB):
    c = Coupon(**{**data.model_dump(), "code": data.code.strip().upper()})
    db.add(c)
    try:
        await db.commit()
    except IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "That code already exists.") from exc
    return c


@router.put("/coupons/{coupon_id}", response_model=schemas.CouponOut)
async def update_coupon(coupon_id: int, data: schemas.CouponIn, _: AdminUser, db: DB):
    c = await db.get(Coupon, coupon_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")
    for k, v in {**data.model_dump(), "code": data.code.strip().upper()}.items():
        setattr(c, k, v)
    await db.commit()
    return c


# ---------- contact messages ----------


@router.get("/messages", response_model=list[schemas.ContactMessageOut])
async def messages(_: AdminUser, db: DB, unread: bool = False, topic: str | None = None):
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(200)
    if unread:
        stmt = stmt.where(ContactMessage.is_read.is_(False))
    if topic:
        stmt = stmt.where(ContactMessage.topic == topic)
    return (await db.scalars(stmt)).all()


@router.patch("/messages/{message_id}", status_code=204)
async def mark_message(message_id: int, _: AdminUser, db: DB, read: bool = True):
    msg = await db.get(ContactMessage, message_id)
    if msg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    msg.is_read = read
    await db.commit()


# ---------- customers ----------


@router.get("/customers")
async def customers(_: AdminUser, db: DB, q: str | None = None):
    stmt = (
        select(User, func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
        .outerjoin(Order, Order.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .limit(200)
    )
    if q:
        stmt = stmt.where(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"), User.phone.ilike(f"%{q}%")))
    return [
        {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "orders": n, "spent": s, "joined": u.created_at}
        for u, n, s in (await db.execute(stmt)).all()
    ]
