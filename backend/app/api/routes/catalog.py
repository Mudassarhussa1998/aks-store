from math import ceil
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DB, CurrentUser
from app.core.cache import cached, invalidate
from app.models import Order, OrderItem, OrderStatus, Product, Review
from app.services import catalog

router = APIRouter(tags=["catalog"])

Sort = Literal["recommended", "newest", "price_asc", "price_desc", "rating"]


@router.get("/categories", response_model=list[schemas.CategoryOut])
async def categories(db: DB):
    return await cached("categories", lambda: catalog.category_tree(db), ttl=600)


@router.get("/products", response_model=schemas.ProductPage)
async def products(
    db: DB,
    category: str | None = None,
    q: Annotated[str | None, Query(max_length=80)] = None,
    size: Annotated[list[str] | None, Query()] = None,
    color: Annotated[list[str] | None, Query()] = None,
    quality: Annotated[list[str] | None, Query()] = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    min_rating: Annotated[float | None, Query(ge=0, le=5)] = None,
    sort: Sort = "recommended",
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    page_size: Annotated[int, Query(ge=1, le=60)] = 24,
    facets: bool = False,
):
    params = dict(
        category_slug=category,
        q=q,
        sizes=size,
        colors=color,
        qualities=quality,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort=sort,
        page=page,
        page_size=page_size,
        with_facets=facets,
    )
    key = "products:" + "|".join(f"{k}={sorted(v) if isinstance(v, list) else v}" for k, v in params.items())
    return await cached(key, lambda: catalog.list_products(db, **params))


@router.get("/search/suggest", response_model=list[schemas.ProductCard])
async def suggest(db: DB, q: Annotated[str, Query(min_length=2, max_length=80)]):
    return await cached(f"suggest:{q.lower()}", lambda: catalog.suggest(db, q), ttl=300)


@router.get("/products/{slug}", response_model=schemas.ProductDetail)
async def product(slug: str, db: DB):
    data = await cached(f"product:{slug}", lambda: catalog.product_detail(db, slug))
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return data


@router.get("/products/{slug}/related", response_model=list[schemas.ProductCard])
async def related(slug: str, db: DB):
    return await cached(f"related:{slug}", lambda: catalog.related_products(db, slug))


def _review_out(r: Review) -> dict:
    first, *rest = r.user.name.split()
    author = f"{first} {rest[-1][0]}." if rest else first
    return schemas.ReviewOut(
        id=r.id,
        rating=r.rating,
        title=r.title,
        body=r.body,
        author=author,
        city=r.city,
        variant_label=r.variant_label,
        verified=r.verified,
        helpful_count=r.helpful_count,
        created_at=r.created_at,
        product_slug=r.product.slug,
        product_name=r.product.name,
    ).model_dump()


@router.get("/products/{slug}/reviews", response_model=schemas.ReviewPage)
async def reviews(
    slug: str,
    db: DB,
    page: Annotated[int, Query(ge=1)] = 1,
    rating: Annotated[int | None, Query(ge=1, le=5)] = None,
    sort: Literal["newest", "helpful"] = "helpful",
):
    product_id = await db.scalar(select(Product.id).where(Product.slug == slug))
    if product_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    where = [Review.product_id == product_id, Review.is_published]
    if rating:
        where.append(Review.rating == rating)
    total = await db.scalar(select(func.count(Review.id)).where(*where)) or 0
    order = (Review.helpful_count.desc(), Review.created_at.desc()) if sort == "helpful" else (Review.created_at.desc(),)
    rows = (
        await db.scalars(
            select(Review)
            .where(*where)
            .options(selectinload(Review.user), selectinload(Review.product))
            .order_by(*order)
            .offset((page - 1) * 10)
            .limit(10)
        )
    ).all()
    return {"items": [_review_out(r) for r in rows], "total": total, "page": page, "pages": ceil(total / 10)}


@router.post("/products/{slug}/reviews", response_model=schemas.ReviewOut, status_code=201)
async def write_review(slug: str, data: schemas.ReviewIn, user: CurrentUser, db: DB):
    product = await db.scalar(select(Product).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    # A review is "verified" when the user has a delivered order containing this product.
    bought = (
        await db.execute(
            select(OrderItem.variant_label, Order.city)
            .join(Order)
            .where(Order.user_id == user.id, Order.status == OrderStatus.delivered, OrderItem.product_id == product.id)
            .limit(1)
        )
    ).first()
    review = Review(
        product_id=product.id,
        user_id=user.id,
        rating=data.rating,
        title=data.title.strip(),
        body=data.body.strip(),
        verified=bought is not None,
        variant_label=bought.variant_label if bought else None,
        city=bought.city if bought else None,
    )
    db.add(review)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already reviewed this product. You can edit it in My Account → My reviews.") from None
    await catalog.refresh_product_stats(db, product.id)
    await db.commit()
    await invalidate(f"product:{slug}", "products:*")
    review.user, review.product = user, product
    return _review_out(review)


@router.post("/reviews/{review_id}/helpful", status_code=204)
async def helpful(review_id: int, db: DB):
    review = await db.get(Review, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    review.helpful_count += 1
    await db.commit()
