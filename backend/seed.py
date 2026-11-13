"""Load a sample catalog so the store has something to show.

    uv run python seed.py           # only seeds an empty database
    uv run python seed.py --reset   # wipes ALL data first (never run this against production)

Photos in seed_images/ are free-licence Unsplash placeholders; replace them with real product shots.
The admin login is taken from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (see .env.example).
"""

import asyncio
import os
import re
import sys
from itertools import product as combos
from pathlib import Path

from sqlalchemy import select, text

from app.core.cache import invalidate
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Category, Coupon, Product, ProductImage, Review, User, Variant
from app.services.catalog import refresh_product_stats
from app.services.images import save_image

IMAGES = Path(__file__).parent / "seed_images"
_uploaded: dict[str, str] = {}


async def img(name: str) -> str:
    if name not in _uploaded:
        _uploaded[name] = await save_image((IMAGES / f"{name}.jpg").read_bytes(), folder="seed")
    return _uploaded[name]


CATEGORIES = [
    # slug, name, parent, description, image
    ("women", "Women", None, "Lawn, kurtis, formals", "cat-women"),
    ("men", "Men", None, "Kurtas, shalwar kameez", "cat-men"),
    ("kids", "Kids", None, "Ages 2–12", "cat-kids"),
    ("shoes", "Shoes", None, "Chappals, sandals", "cat-shoes"),
    ("home-living", "Home & Living", None, "Bedding, bath and decor", "hero-bed-a"),
    ("blankets", "Blankets", "home-living", "Single to King", "cat-blankets"),
    ("pillows", "Pillows", "home-living", "Hotel, fibre, memory", "cat-pillows"),
    ("bedsheets", "Bedsheets", "home-living", "Percale and cotton sets", "hero-bed-a"),
    ("towels-bath", "Towels & Bath", "home-living", "Bath sheets, sets, hand towels", "cat-towels"),
    ("curtains", "Curtains", "home-living", "Blackout, sheer", "cat-curtains"),
]

COLORS = {
    "Ivory": "#EAE3D6", "Charcoal": "#4A4A4A", "Sage": "#A9B8A2", "Navy": "#2E3A55", "Mustard": "#C9962E",
    "White": "#FFFFFF", "Grey": "#9A9A9A", "Green": "#4F7A43", "Beige": "#D8CBB5", "Maroon": "#7A2A2A",
    "Sky Blue": "#9DB7D5", "Plum": "#5A2E4A", "Peach": "#F2C7B5", "Royal Blue": "#27458C", "Mint": "#BFD8C4",
    "Pink": "#F1B5C6", "Yellow": "#F2D46B", "Black": "#1A1A1A", "Brown": "#5A3E2B", "Red": "#A3262A",
}


def variants(code: str, sizes: dict[str, int], colors: list[str], qualities: dict[str, int] | None = None,
             stock: int = 25, sale: bool = False) -> list[Variant]:
    """Build every size × colour × quality combination; price = size base + quality add-on."""
    out = []
    for (size, base), color, (quality, add) in combos(sizes.items(), colors, (qualities or {None: 0}).items()):
        price = base + add
        sku = "-".join(x for x in ["VLZ", code, re.sub(r"[^A-Z0-9]", "", size.upper())[:6], color.replace(" ", "")[:4].upper(),
                                   (quality or "")[:1].upper()] if x)
        out.append(Variant(
            sku=sku, size=size, color=color, color_hex=COLORS[color], quality=quality, price=price,
            compare_at_price=round(price * 1.25 / 10) * 10 if sale else None,
            stock=3 if (size == list(sizes)[-1] and quality == list(qualities or {None: 0})[-1]) else stock,
            position=len(out),
        ))
    return out


BLANKET_DESC = ("A soft, warm fleece blanket for Pakistani winters. Lightweight Standard for mild nights, "
                "double-layer Premium for colder cities, and sherpa-lined Luxury for the north.")

PRODUCTS = [
    dict(slug="classic-fleece-blanket", name="Classic Fleece Blanket", cat="blankets", badge="Bestseller", featured=True,
         desc=BLANKET_DESC, care="100% polyester microfleece. Machine wash cold, tumble dry low.",
         images=[("p-blanket", None), ("hero-bed-b", None), ("cat-blankets", None)],
         v=lambda: variants("BLK", {"Single": 4200, "Double": 5800, "King": 7200}, ["Ivory", "Charcoal", "Sage"],
                            {"Standard": 0, "Premium": 1500, "Luxury": 3200}, sale=True)),
    dict(slug="sherpa-knit-throw", name="Sherpa Knit Throw", cat="blankets", badge="New", featured=True,
         desc="A chunky knit throw with a sherpa back. Drape it on the sofa or the foot of the bed.",
         care="Hand wash or gentle cycle, dry flat.",
         images=[("hero-bed-b", "Mustard"), ("cat-blankets", "Ivory")],
         v=lambda: variants("THR", {"Throw": 6900, "Double": 8400}, ["Mustard", "Ivory"], {"Luxury": 0})),
    dict(slug="percale-bedsheet-set", name="Percale Bedsheet Set", cat="bedsheets", badge=None, featured=False,
         desc="Crisp 200 thread-count percale with two matching pillow covers.",
         care="Machine wash warm. Iron on medium.",
         images=[("hero-bed-a", None), ("cat-pillows", None)],
         v=lambda: variants("BSH", {"Single": 3400, "Double": 4900, "King": 5900}, ["White", "Grey"],
                            {"Standard": 0, "Premium": 1200})),
    dict(slug="hotel-pillow-pair", name="Hotel Pillow Pair", cat="pillows", badge=None, featured=True,
         desc="Two plump hotel-style pillows filled with soft hollow fibre.",
         care="Spot clean. Air in the sun to keep fresh.",
         images=[("p-pillow", None), ("hero-bed-c", None), ("cat-pillows", None)],
         v=lambda: variants("PIL", {"Standard": 2200, "King": 2900}, ["White"], {"Fibre": 0, "Memory foam": 2400},
                            sale=True)),
    dict(slug="cotton-bath-towel", name="Cotton Bath Towel", cat="towels-bath", badge=None, featured=True,
         desc="Thick, absorbent 100% cotton terry that stays soft wash after wash.",
         care="Machine wash warm. Avoid fabric softener to keep it absorbent.",
         images=[("p-towel", "Grey"), ("hero-bath-c", "Green"), ("cat-towels", "White")],
         v=lambda: variants("TWL", {"Hand": 650, "Bath": 1450, "Bath sheet": 2100}, ["Grey", "White", "Green"],
                            {"Standard": 0, "Premium": 450})),
    dict(slug="waffle-towel-set", name="Waffle Towel Set", cat="towels-bath", badge="New", featured=False,
         desc="A four-piece waffle-weave set: two bath towels and two hand towels.",
         care="Machine wash warm, tumble dry low.",
         images=[("hero-bath-b", None)],
         v=lambda: variants("WTS", {"4-piece": 3900}, ["Green", "White"])),
    dict(slug="spa-bath-essentials", name="Spa Bath Essentials", cat="towels-bath", badge=None, featured=False,
         desc="Bath sheet, two hand towels, a face towel and a bath mat in one gift-ready box.",
         care="Machine wash warm.",
         images=[("hero-bath-a", None), ("cat-towels", None)],
         v=lambda: variants("SPA", {"Set": 5600}, ["White", "Grey"])),
    dict(slug="linen-blend-curtain", name="Linen Blend Curtain Panel", cat="curtains", badge=None, featured=False,
         desc="Soft linen-look panel that filters light. Sold as a single panel with rod pocket.",
         care="Gentle wash, hang to dry.",
         images=[("cat-curtains", None)],
         v=lambda: variants("CUR", {"4 × 7 ft": 3300, "4 × 9 ft": 3900}, ["Beige", "Grey"],
                            {"Sheer": 0, "Blackout": 1100})),
    dict(slug="embroidered-lawn-3-piece", name="Embroidered Lawn 3-Piece", cat="women", badge=None, featured=True,
         desc="Embroidered lawn shirt, dyed trouser and a printed chiffon dupatta.",
         care="Dry clean recommended for the first wash.",
         images=[("hero-lawn-a", "Maroon"), ("cat-women", "Sky Blue")],
         v=lambda: variants("LWN", {"S": 5490, "M": 5490, "L": 5490, "XL": 5790}, ["Maroon", "Sky Blue"],
                            {"Unstitched": 0, "Stitched": 1500}, sale=True)),
    dict(slug="velvet-formal-suit", name="Velvet Formal Suit", cat="women", badge="New", featured=False,
         desc="Plum velvet shirt with hand-finished neckline, straight trousers and a shawl.",
         care="Dry clean only.",
         images=[("hero-lawn-b", None)],
         v=lambda: variants("VLV", {"S": 12900, "M": 12900, "L": 12900}, ["Plum"], {"Stitched": 0})),
    dict(slug="pastel-pret-kurta", name="Pastel Pret Kurta", cat="women", badge=None, featured=True,
         desc="An easy everyday kurta with lace sleeves and matching cigarette pants.",
         care="Machine wash cold, inside out.",
         images=[("p-lawn", "Peach"), ("hero-lawn-c", "Ivory")],
         v=lambda: variants("PRT", {"S": 4290, "M": 4290, "L": 4290, "XL": 4490}, ["Peach", "Ivory"])),
    dict(slug="festive-lehenga", name="Festive Lehenga Set", cat="women", badge=None, featured=False,
         desc="Fully embroidered lehenga with blouse and net dupatta for weddings and Eid.",
         care="Dry clean only. Store folded in muslin.",
         images=[("ban-women", None)],
         v=lambda: variants("LHG", {"S": 34900, "M": 34900, "L": 34900}, ["Red"])),
    dict(slug="cotton-shalwar-kameez", name="Cotton Shalwar Kameez", cat="men", badge="New", featured=True,
         desc="A classic shalwar kameez with a band collar. Breathable for summer, smart for Jummah.",
         care="Machine wash, iron while damp.",
         images=[("p-kurta", "White"), ("cat-men", "Royal Blue")],
         v=lambda: variants("SKM", {"S": 3850, "M": 3850, "L": 3850, "XL": 4050}, ["White", "Royal Blue"],
                            {"Wash & wear": 0, "Egyptian cotton": 1200})),
    dict(slug="printed-linen-kurta", name="Printed Linen Kurta", cat="men", badge=None, featured=False,
         desc="A soft linen kurta with a fine block print. Pair it with white shalwar or jeans.",
         care="Machine wash cold.",
         images=[("ban-men", None)],
         v=lambda: variants("LKT", {"S": 3450, "M": 3450, "L": 3450, "XL": 3650}, ["Mint"], sale=True)),
    dict(slug="kids-cotton-tee-pack", name="Kids Cotton Tee Pack", cat="kids", badge=None, featured=False,
         desc="Three soft printed tees in a pack. Pre-washed so they won't shrink.",
         care="Machine wash warm.",
         images=[("cat-kids", None)],
         v=lambda: variants("KTP", {"2–3Y": 1990, "4–5Y": 1990, "6–8Y": 2190, "9–12Y": 2390}, ["Pink", "Yellow"])),
    dict(slug="leather-peshawari-chappal", name="Leather Peshawari Chappal", cat="shoes", badge="New", featured=True,
         desc="Hand-stitched leather chappal with a cushioned footbed.",
         care="Wipe clean. Condition the leather every few months.",
         images=[("cat-shoes", "Brown"), ("p-shoe", "Black")],
         v=lambda: variants("CHP", {"7": 4900, "8": 4900, "9": 4900, "10": 4900, "11": 4900}, ["Brown", "Black"])),
]

REVIEWERS = [("Ayesha Khan", "Lahore"), ("Bilal Raza", "Islamabad"), ("Sana Malik", "Karachi"),
             ("Hamza Ali", "Rawalpindi"), ("Fatima Noor", "Multan")]
REVIEW_TEXT = [
    (5, "Exactly like the photos", "Quality is great and it arrived in three days. Paid cash at the door — so easy."),
    (5, "Very good value", "Soft, well finished and no issues after a few washes. Will order again."),
    (4, "Good, sizing runs a little big", "Nice fabric. I would order one size down next time."),
]


async def main(reset: bool) -> None:
    async with SessionLocal() as db:
        if reset:
            await db.execute(text(
                "TRUNCATE order_events, order_items, orders, reviews, wishlist_items, recently_viewed, "
                "product_images, variants, products, categories, coupons, addresses, one_time_codes, users RESTART IDENTITY CASCADE"))
            await db.commit()
        elif await db.scalar(select(Product.id).limit(1)):
            print("Database already has products; use --reset to start over.")
            return

        admin = User(name="Velenzay Admin", email=os.getenv("SEED_ADMIN_EMAIL", "admin@velenzay.com"),
                     password_hash=hash_password(os.getenv("SEED_ADMIN_PASSWORD", "change-this-admin-password")),
                     is_admin=True)
        reviewers = [User(name=n, email=f"{n.split()[0].lower()}@example.com", phone=f"+92300000000{i}",
                          password_hash=hash_password("customer-password")) for i, (n, _) in enumerate(REVIEWERS)]
        db.add_all([admin, *reviewers])

        cats: dict[str, Category] = {}
        for pos, (slug, name, parent, desc, image) in enumerate(CATEGORIES):
            cats[slug] = Category(slug=slug, name=name, description=desc, image_url=await img(image),
                                  parent=cats.get(parent) if parent else None, sort_order=pos)
            db.add(cats[slug])
        await db.flush()

        for i, spec in enumerate(PRODUCTS):
            p = Product(slug=spec["slug"], name=spec["name"], category=cats[spec["cat"]], badge=spec["badge"],
                        is_featured=spec["featured"], description=spec["desc"], material_care=spec["care"])
            p.variants = spec["v"]()
            p.images = [ProductImage(url=await img(name), alt=f"{spec['name']}{' — ' + color if color else ''}",
                                     color=color, position=n) for n, (name, color) in enumerate(spec["images"])]
            db.add(p)
            await db.flush()
            for j, (rating, title, body) in enumerate(REVIEW_TEXT[: 1 + i % 3]):
                user, (_, city) = reviewers[(i + j) % len(reviewers)], REVIEWERS[(i + j) % len(reviewers)]
                db.add(Review(product_id=p.id, user_id=user.id, rating=rating, title=title, body=body, city=city,
                              verified=True, variant_label=p.variants[j % len(p.variants)].label, helpful_count=9 - j * 3))
            await db.flush()
            await refresh_product_stats(db, p.id)

        db.add(Coupon(code="WINTER10", kind="percent", value=10, min_subtotal=3000))
        await db.commit()
    await invalidate("*")
    print(f"Seeded {len(CATEGORIES)} categories, {len(PRODUCTS)} products, admin {admin.email}")


if __name__ == "__main__":
    asyncio.run(main(reset="--reset" in sys.argv))
