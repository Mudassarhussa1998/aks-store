from math import ceil

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import schemas
from app.models import Category, Product, Review, Variant

SORTS = {
    "recommended": (Product.is_featured.desc(), Product.rating_count.desc(), Product.id.desc()),
    "newest": (Product.created_at.desc(), Product.id.desc()),
    "price_asc": (Product.min_price.asc(), Product.id.asc()),
    "price_desc": (Product.min_price.desc(), Product.id.desc()),
    "rating": (Product.rating_avg.desc(), Product.rating_count.desc()),
}


async def category_tree(db: AsyncSession) -> list[dict]:
    rows = (
        await db.scalars(select(Category).where(Category.is_active).order_by(Category.sort_order, Category.name))
    ).all()
    nodes = {
        c.id: {
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url,
            "parent_id": c.parent_id,
            "children": [],
        }
        for c in rows
    }
    roots = []
    for c in rows:
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id]["children"].append(nodes[c.id])
        else:
            roots.append(nodes[c.id])
    return roots


async def descendant_ids(db: AsyncSession, category: Category) -> list[int]:
    rows = (await db.execute(select(Category.id, Category.parent_id))).all()
    children: dict[int, list[int]] = {}
    for cid, pid in rows:
        if pid:
            children.setdefault(pid, []).append(cid)
    out, stack = [], [category.id]
    while stack:
        cid = stack.pop()
        out.append(cid)
        stack.extend(children.get(cid, []))
    return out


def to_card(p: Product) -> dict:
    image = p.images[0].url if p.images else None
    colors: list[str] = []
    for v in p.variants:
        if v.color_hex and v.color_hex not in colors:
            colors.append(v.color_hex)
    cheapest = min(p.variants, key=lambda v: v.price) if p.variants else None
    badge = p.badge
    if cheapest and cheapest.compare_at_price and cheapest.compare_at_price > cheapest.price and not badge:
        badge = "Sale"
    return schemas.ProductCard(
        id=p.id,
        slug=p.slug,
        name=p.name,
        category=p.category.name,
        badge=badge,
        price=p.min_price,
        compare_at_price=cheapest.compare_at_price if cheapest else None,
        rating_avg=round(p.rating_avg, 1),
        rating_count=p.rating_count,
        image=image,
        colors=colors[:5],
        in_stock=p.total_stock > 0,
    ).model_dump()


def _card_query() -> Select:
    return select(Product).where(Product.is_active).options(
        selectinload(Product.images), selectinload(Product.variants), selectinload(Product.category)
    )


async def list_products(
    db: AsyncSession,
    *,
    category_slug: str | None = None,
    q: str | None = None,
    sizes: list[str] | None = None,
    colors: list[str] | None = None,
    qualities: list[str] | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    min_rating: float | None = None,
    sort: str = "recommended",
    page: int = 1,
    page_size: int = 24,
    with_facets: bool = False,
) -> dict:
    base = select(Product.id).where(Product.is_active)
    if category_slug:
        cat = await db.scalar(select(Category).where(Category.slug == category_slug))
        if cat is None:
            return schemas.ProductPage(items=[], total=0, page=page, page_size=page_size, pages=0).model_dump()
        base = base.where(Product.category_id.in_(await descendant_ids(db, cat)))
    if q:
        like = f"%{q.strip()}%"
        base = base.where(or_(Product.name.ilike(like), Product.description.ilike(like)))
    facet_base = base  # facets reflect category/search but not the variant filters themselves

    variant_conds = []
    if sizes:
        variant_conds.append(Variant.size.in_(sizes))
    if colors:
        variant_conds.append(Variant.color.in_(colors))
    if qualities:
        variant_conds.append(Variant.quality.in_(qualities))
    if variant_conds:
        base = base.where(exists().where(and_(Variant.product_id == Product.id, *variant_conds)))
    if min_price is not None:
        base = base.where(Product.min_price >= min_price)
    if max_price is not None:
        base = base.where(Product.min_price <= max_price)
    if min_rating is not None:
        base = base.where(Product.rating_avg >= min_rating)

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    order = SORTS.get(sort, SORTS["recommended"])
    rows = (
        await db.scalars(
            _card_query()
            .where(Product.id.in_(base))
            .order_by(*order)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    result = schemas.ProductPage(
        items=[to_card(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total else 0,
    ).model_dump()

    if with_facets:
        vrows = (
            await db.execute(
                select(Variant.size, Variant.color, Variant.color_hex, Variant.quality, Variant.price).where(
                    Variant.product_id.in_(facet_base)
                )
            )
        ).all()
        size_order = ["XS", "S", "M", "L", "XL", "XXL", "Single", "Double", "Queen", "King"]
        sizes_found = {r.size for r in vrows if r.size}
        colors_found: dict[str, str] = {}
        for r in vrows:
            if r.color and r.color not in colors_found:
                colors_found[r.color] = r.color_hex or "#CCCCCC"
        result["facets"] = schemas.Facets(
            sizes=sorted(sizes_found, key=lambda s: (size_order.index(s) if s in size_order else 99, s)),
            colors=[{"name": n, "hex": h} for n, h in colors_found.items()],
            qualities=sorted({r.quality for r in vrows if r.quality}, key=lambda s: ["Standard", "Premium", "Luxury"].index(s) if s in ("Standard", "Premium", "Luxury") else 9),
            price_min=min((r.price for r in vrows), default=0),
            price_max=max((r.price for r in vrows), default=0),
        ).model_dump()
    return result


async def product_detail(db: AsyncSession, slug: str) -> dict | None:
    p = await db.scalar(
        select(Product)
        .where(Product.slug == slug, Product.is_active)
        .options(selectinload(Product.images), selectinload(Product.variants), selectinload(Product.category))
    )
    if p is None:
        return None
    return await serialize_detail(db, p)


async def serialize_detail(db: AsyncSession, p: Product) -> dict:
    breakdown = {i: 0 for i in range(1, 6)}
    for rating, count in (
        await db.execute(
            select(Review.rating, func.count())
            .where(Review.product_id == p.id, Review.is_published)
            .group_by(Review.rating)
        )
    ).all():
        breakdown[rating] = count

    crumbs: list[Category] = []
    node = p.category
    while node is not None:
        crumbs.insert(0, node)
        node = await db.get(Category, node.parent_id) if node.parent_id else None

    def uniq(values):
        seen: list[str] = []
        for v in values:
            if v and v not in seen:
                seen.append(v)
        return seen

    def cat_out(c: Category) -> dict:
        return {
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url,
            "parent_id": c.parent_id,
            "children": [],
        }

    return schemas.ProductDetail(
        id=p.id,
        slug=p.slug,
        name=p.name,
        description=p.description,
        material_care=p.material_care,
        badge=p.badge,
        category=cat_out(p.category),
        breadcrumbs=[cat_out(c) for c in crumbs],
        rating_avg=round(p.rating_avg, 1),
        rating_count=p.rating_count,
        rating_breakdown=breakdown,
        images=[schemas.ImageOut.model_validate(i) for i in p.images],
        variants=[schemas.VariantOut.model_validate(v) for v in p.variants],
        options={
            "size": uniq(v.size for v in p.variants),
            "color": uniq(v.color for v in p.variants),
            "quality": uniq(v.quality for v in p.variants),
        },
    ).model_dump()


async def related_products(db: AsyncSession, slug: str, limit: int = 4) -> list[dict]:
    p = await db.scalar(select(Product).where(Product.slug == slug))
    if p is None:
        return []
    rows = (
        await db.scalars(
            _card_query()
            .where(Product.id != p.id, Product.category_id == p.category_id)
            .order_by(Product.rating_count.desc())
            .limit(limit)
        )
    ).all()
    if len(rows) < limit:
        more = (
            await db.scalars(
                _card_query()
                .where(Product.id.not_in([p.id, *[r.id for r in rows]]))
                .order_by(Product.rating_count.desc())
                .limit(limit - len(rows))
            )
        ).all()
        rows = [*rows, *more]
    return [to_card(r) for r in rows]


async def cards_by_ids(db: AsyncSession, ids: list[int]) -> list[dict]:
    if not ids:
        return []
    rows = {p.id: p for p in (await db.scalars(_card_query().where(Product.id.in_(ids)))).all()}
    return [to_card(rows[i]) for i in ids if i in rows]


async def refresh_product_stats(db: AsyncSession, product_id: int) -> None:
    """Recompute denormalised price/stock/rating columns after variant or review changes."""
    price, compare, stock = (
        await db.execute(
            select(func.min(Variant.price), func.max(Variant.compare_at_price), func.coalesce(func.sum(Variant.stock), 0)).where(
                Variant.product_id == product_id
            )
        )
    ).one()
    avg, count = (
        await db.execute(
            select(func.coalesce(func.avg(Review.rating), 0), func.count(Review.id)).where(
                Review.product_id == product_id, Review.is_published
            )
        )
    ).one()
    p = await db.get(Product, product_id)
    if p is None:
        return
    p.min_price = price or 0
    p.max_compare_price = compare
    p.total_stock = stock
    p.rating_avg = float(avg)
    p.rating_count = count


async def suggest(db: AsyncSession, q: str, limit: int = 6) -> list[dict]:
    like = f"%{q.strip()}%"
    rows = (
        await db.scalars(_card_query().where(Product.name.ilike(like)).order_by(Product.rating_count.desc()).limit(limit))
    ).all()
    return [to_card(r) for r in rows]
