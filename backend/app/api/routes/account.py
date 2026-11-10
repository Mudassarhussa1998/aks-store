from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DB, CurrentUser
from app.api.routes.catalog import _review_out
from app.core.cache import invalidate
from app.models import Address, Product, RecentlyViewed, Review, WishlistItem
from app.services import catalog

router = APIRouter(prefix="/me", tags=["account"])


# ----- wishlist -----


@router.get("/wishlist", response_model=list[schemas.ProductCard])
async def wishlist(user: CurrentUser, db: DB):
    ids = (
        await db.scalars(
            select(WishlistItem.product_id).where(WishlistItem.user_id == user.id).order_by(WishlistItem.created_at.desc())
        )
    ).all()
    return await catalog.cards_by_ids(db, list(ids))


@router.get("/wishlist/ids", response_model=list[int])
async def wishlist_ids(user: CurrentUser, db: DB):
    return (await db.scalars(select(WishlistItem.product_id).where(WishlistItem.user_id == user.id))).all()


@router.put("/wishlist/{product_id}", status_code=204)
async def add_wishlist(product_id: int, user: CurrentUser, db: DB):
    if await db.get(Product, product_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    await db.execute(insert(WishlistItem).values(user_id=user.id, product_id=product_id).on_conflict_do_nothing())
    await db.commit()


@router.delete("/wishlist/{product_id}", status_code=204)
async def remove_wishlist(product_id: int, user: CurrentUser, db: DB):
    await db.execute(delete(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id))
    await db.commit()


# ----- recently viewed -----


@router.get("/recent", response_model=list[schemas.ProductCard])
async def recent(user: CurrentUser, db: DB):
    ids = (
        await db.scalars(
            select(RecentlyViewed.product_id)
            .where(RecentlyViewed.user_id == user.id)
            .order_by(RecentlyViewed.viewed_at.desc())
            .limit(12)
        )
    ).all()
    return await catalog.cards_by_ids(db, list(ids))


@router.put("/recent/{product_id}", status_code=204)
async def track_view(product_id: int, user: CurrentUser, db: DB):
    await db.execute(
        insert(RecentlyViewed)
        .values(user_id=user.id, product_id=product_id)
        .on_conflict_do_update(index_elements=["user_id", "product_id"], set_={"viewed_at": func.now()})
    )
    await db.commit()


# ----- my reviews -----


@router.get("/reviews", response_model=list[schemas.ReviewOut])
async def my_reviews(user: CurrentUser, db: DB):
    rows = (
        await db.scalars(
            select(Review)
            .where(Review.user_id == user.id)
            .options(selectinload(Review.user), selectinload(Review.product))
            .order_by(Review.created_at.desc())
        )
    ).all()
    return [_review_out(r) for r in rows]


async def _own_review(db, user, review_id: int) -> Review:
    review = await db.scalar(
        select(Review).where(Review.id == review_id, Review.user_id == user.id).options(selectinload(Review.user), selectinload(Review.product))
    )
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    return review


@router.put("/reviews/{review_id}", response_model=schemas.ReviewOut)
async def edit_review(review_id: int, data: schemas.ReviewIn, user: CurrentUser, db: DB):
    review = await _own_review(db, user, review_id)
    review.rating, review.title, review.body = data.rating, data.title.strip(), data.body.strip()
    await db.flush()
    await catalog.refresh_product_stats(db, review.product_id)
    await db.commit()
    await invalidate(f"product:{review.product.slug}", "products:*")
    return _review_out(review)


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(review_id: int, user: CurrentUser, db: DB):
    review = await _own_review(db, user, review_id)
    product_id, slug = review.product_id, review.product.slug
    await db.delete(review)
    await db.flush()
    await catalog.refresh_product_stats(db, product_id)
    await db.commit()
    await invalidate(f"product:{slug}", "products:*")


# ----- addresses -----


@router.get("/addresses", response_model=list[schemas.AddressOut])
async def addresses(user: CurrentUser, db: DB):
    return (
        await db.scalars(select(Address).where(Address.user_id == user.id).order_by(Address.is_default.desc(), Address.id))
    ).all()


async def _clear_default(db, user_id: int) -> None:
    await db.execute(update(Address).where(Address.user_id == user_id).values(is_default=False))


@router.post("/addresses", response_model=schemas.AddressOut, status_code=201)
async def add_address(data: schemas.AddressIn, user: CurrentUser, db: DB):
    if data.is_default:
        await _clear_default(db, user.id)
    address = Address(user_id=user.id, **data.model_dump())
    db.add(address)
    await db.commit()
    return address


@router.put("/addresses/{address_id}", response_model=schemas.AddressOut)
async def edit_address(address_id: int, data: schemas.AddressIn, user: CurrentUser, db: DB):
    address = await db.get(Address, address_id)
    if address is None or address.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Address not found")
    if data.is_default:
        await _clear_default(db, user.id)
    for k, v in data.model_dump().items():
        setattr(address, k, v)
    await db.commit()
    return address


@router.delete("/addresses/{address_id}", status_code=204)
async def delete_address(address_id: int, user: CurrentUser, db: DB):
    await db.execute(delete(Address).where(Address.id == address_id, Address.user_id == user.id))
    await db.commit()
