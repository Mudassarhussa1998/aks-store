from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Variant

API = "/api/v1"
ADDRESS = {"name": "Ayesha Khan", "phone": "0300 1234567", "city": "Lahore", "area": "DHA", "address": "House 24, Street 5"}


async def variant_id(sku: str) -> int:
    async with SessionLocal() as db:
        return await db.scalar(select(Variant.id).where(Variant.sku == sku))


async def stock(sku: str) -> int:
    async with SessionLocal() as db:
        return await db.scalar(select(Variant.stock).where(Variant.sku == sku))


async def test_category_listing_includes_subcategories_and_facets(client):
    r = await client.get(f"{API}/products", params={"category": "home-living", "facets": True})
    body = r.json()
    assert r.status_code == 200
    assert body["total"] == 2
    assert body["facets"]["qualities"] == ["Standard", "Premium"]
    assert {c["name"] for c in body["facets"]["colors"]} == {"Ivory", "Charcoal", "White"}


async def test_variant_filter_and_price_sort(client):
    r = await client.get(f"{API}/products", params={"color": "Charcoal"})
    assert [p["slug"] for p in r.json()["items"]] == ["fleece-blanket"]
    r = await client.get(f"{API}/products", params={"sort": "price_asc"})
    assert [p["price"] for p in r.json()["items"]] == [650, 4200]


async def test_product_detail_lists_options_and_variants(client):
    r = await client.get(f"{API}/products/fleece-blanket")
    body = r.json()
    assert body["options"] == {"size": ["Single", "Double"], "color": ["Ivory", "Charcoal"], "quality": ["Standard", "Premium"]}
    assert [c["slug"] for c in body["breadcrumbs"]] == ["home-living", "blankets"]
    assert (await client.get(f"{API}/products/nope")).status_code == 404


async def test_quote_prices_delivery_and_coupon(client):
    towel = await variant_id("T-H-WH")
    r = await client.post(f"{API}/cart/quote", json={"items": [{"variant_id": towel, "quantity": 2}]})
    q = r.json()
    assert (q["subtotal"], q["delivery_fee"], q["total"]) == (1300, 250, 1550)

    r = await client.post(f"{API}/cart/quote", json={"items": [{"variant_id": towel, "quantity": 2}], "coupon": "winter10"})
    assert r.json()["coupon_error"].startswith("Add Rs 1,700 more")

    blanket = await variant_id("B-S-IV-S")
    r = await client.post(f"{API}/cart/quote", json={"items": [{"variant_id": blanket, "quantity": 1}], "coupon": "WINTER10"})
    q = r.json()
    assert (q["subtotal"], q["discount"], q["delivery_fee"], q["total"]) == (4200, 420, 0, 3780)


async def test_guest_cod_order_reserves_stock_and_is_trackable(client):
    vid = await variant_id("B-S-IV-S")
    r = await client.post(f"{API}/orders", json={**ADDRESS, "items": [{"variant_id": vid, "quantity": 2}]})
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "pending" and order["payment_method"] == "cod" and order["total"] == 8400
    assert await stock("B-S-IV-S") == 3

    r = await client.get(f"{API}/orders/track", params={"number": order["number"], "phone": "+92 300 1234567"})
    assert r.status_code == 200
    r = await client.get(f"{API}/orders/track", params={"number": order["number"], "phone": "03119999999"})
    assert r.status_code == 404


async def test_cannot_order_more_than_stock(client):
    vid = await variant_id("B-D-IV-P")  # stock 1
    r = await client.post(f"{API}/orders", json={**ADDRESS, "items": [{"variant_id": vid, "quantity": 2}]})
    assert r.status_code == 409
    assert await stock("B-D-IV-P") == 1


async def test_customer_flow_wishlist_order_history_review(client, customer):
    products = (await client.get(f"{API}/products")).json()["items"]
    pid = next(p["id"] for p in products if p["slug"] == "bath-towel")
    assert (await client.put(f"{API}/me/wishlist/{pid}", headers=customer)).status_code == 204
    assert (await client.put(f"{API}/me/wishlist/{pid}", headers=customer)).status_code == 204  # idempotent
    assert [p["id"] for p in (await client.get(f"{API}/me/wishlist", headers=customer)).json()] == [pid]

    vid = await variant_id("T-H-WH")
    r = await client.post(f"{API}/orders", headers=customer,
                          json={**ADDRESS, "save_address": True, "items": [{"variant_id": vid, "quantity": 1}]})
    assert r.status_code == 201
    history = (await client.get(f"{API}/orders", headers=customer)).json()
    assert len(history) == 1 and history[0]["item_count"] == 1
    assert len((await client.get(f"{API}/me/addresses", headers=customer)).json()) == 1

    r = await client.post(f"{API}/products/bath-towel/reviews", headers=customer,
                          json={"rating": 4, "title": "Soft", "body": "Very soft towel."})
    assert r.status_code == 201 and r.json()["verified"] is False and r.json()["author"] == "Ayesha K."
    r = await client.post(f"{API}/products/bath-towel/reviews", headers=customer,
                          json={"rating": 5, "title": "Again", "body": "Second try."})
    assert r.status_code == 409
    detail = (await client.get(f"{API}/products/bath-towel")).json()
    assert detail["rating_count"] == 1 and detail["rating_breakdown"]["4"] == 1


async def test_admin_status_flow_and_cancel_restores_stock(client, admin, customer):
    vid = await variant_id("B-S-IV-S")
    number = (await client.post(f"{API}/orders", json={**ADDRESS, "items": [{"variant_id": vid, "quantity": 2}]})).json()["number"]
    assert await stock("B-S-IV-S") == 3

    assert (await client.get(f"{API}/admin/orders", headers=customer)).status_code == 403
    r = await client.patch(f"{API}/admin/orders/{number}", headers=admin, json={"status": "delivered"})
    assert r.status_code == 400  # must be confirmed and shipped first

    r = await client.patch(f"{API}/admin/orders/{number}", headers=admin, json={"status": "confirmed", "note": "Called customer"})
    assert r.json()["status"] == "confirmed"
    r = await client.patch(f"{API}/admin/orders/{number}", headers=admin, json={"status": "cancelled"})
    assert r.json()["status"] == "cancelled"
    assert [e["status"] for e in r.json()["events"]] == ["pending", "confirmed", "cancelled"]
    assert await stock("B-S-IV-S") == 5


async def test_admin_product_upsert_recomputes_listing_price(client, admin):
    cats = (await client.get(f"{API}/admin/categories", headers=admin)).json()
    towels = next(c["id"] for c in cats if c["slug"] == "towels")
    payload = {
        "name": "Waffle Set", "slug": "waffle-set", "category_id": towels, "badge": "New",
        "variants": [
            {"sku": "W-1", "size": "4-piece", "color": "Green", "color_hex": "#4F7A43", "price": 3900, "stock": 10},
            {"sku": "W-2", "size": "6-piece", "color": "Green", "color_hex": "#4F7A43", "price": 5200, "stock": 4},
        ],
    }
    r = await client.post(f"{API}/admin/products", headers=admin, json=payload)
    assert r.status_code == 201, r.text
    product = r.json()
    payload["variants"][0] = {**payload["variants"][0], "id": product["variants"][0]["id"], "price": 3500}
    r = await client.put(f"{API}/admin/products/{product['id']}", headers=admin, json=payload)
    assert r.status_code == 200
    listed = next(p for p in (await client.get(f"{API}/products")).json()["items"] if p["slug"] == "waffle-set")
    assert listed["price"] == 3500

    stats = (await client.get(f"{API}/admin/stats", headers=admin)).json()
    assert stats["low_stock_variants"] >= 2
