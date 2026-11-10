API = "/api/v1/admin"

# Fixture catalog (conftest): Home & Living › Blankets (Fleece Blanket: stock 5, 1, 0) and › Towels (Bath Towel: stock 50).


async def _ids(client, admin) -> dict[str, int]:
    items = (await client.get(f"{API}/products", headers=admin)).json()["items"]
    return {p["slug"]: p["id"] for p in items}


async def test_product_list_filters_and_counts(client, admin, customer):
    assert (await client.get(f"{API}/products", headers=customer)).status_code == 403

    data = (await client.get(f"{API}/products", headers=admin)).json()
    assert data["counts"] == {"all": 2, "active": 2, "hidden": 0, "out_of_stock": 0}
    blanket = next(p for p in data["items"] if p["slug"] == "fleece-blanket")
    assert blanket["total_stock"] == 6 and blanket["variant_count"] == 3 and blanket["low_stock_variants"] == 2

    by_sku = (await client.get(f"{API}/products", headers=admin, params={"q": "t-h-wh"})).json()
    assert [p["slug"] for p in by_sku["items"]] == ["bath-towel"]

    cats = {c["slug"]: c["id"] for c in (await client.get(f"{API}/categories", headers=admin)).json()}
    in_home = (await client.get(f"{API}/products", headers=admin, params={"category_id": cats["home-living"]})).json()
    assert in_home["total"] == 2  # includes sub-categories

    low = (await client.get(f"{API}/products", headers=admin, params={"stock": "low"})).json()
    assert [p["slug"] for p in low["items"]] == ["fleece-blanket"]

    cheapest_first = (await client.get(f"{API}/products", headers=admin, params={"sort": "price_asc"})).json()
    assert [p["slug"] for p in cheapest_first["items"]] == ["bath-towel", "fleece-blanket"]


async def test_quick_and_bulk_visibility(client, admin):
    ids = await _ids(client, admin)
    r = await client.patch(f"{API}/products/{ids['bath-towel']}", headers=admin, json={"is_active": False})
    assert r.status_code == 204
    assert (await client.get("/api/v1/products/bath-towel")).status_code == 404

    hidden = (await client.get(f"{API}/products", headers=admin, params={"status": "hidden"})).json()
    assert hidden["total"] == 1 and hidden["counts"]["hidden"] == 1

    r = await client.post(f"{API}/products/bulk", headers=admin, json={"ids": list(ids.values()), "action": "show"})
    assert r.json() == {"updated": 2}
    assert (await client.get("/api/v1/products/bath-towel")).status_code == 200


async def test_duplicate_is_hidden_with_no_stock(client, admin):
    ids = await _ids(client, admin)
    first = (await client.post(f"{API}/products/{ids['fleece-blanket']}/duplicate", headers=admin)).json()
    second = (await client.post(f"{API}/products/{ids['fleece-blanket']}/duplicate", headers=admin)).json()
    assert first["slug"] == "fleece-blanket-copy" and second["slug"] == "fleece-blanket-copy-2"
    assert first["is_active"] is False and all(v["stock"] == 0 for v in first["variants"])
    assert {v["sku"] for v in first["variants"]} == {"B-S-IV-S-C", "B-D-IV-P-C", "B-D-CH-P-C"}
    assert {v["sku"] for v in second["variants"]} == {"B-S-IV-S-C-2", "B-D-IV-P-C-2", "B-D-CH-P-C-2"}


async def test_inventory_lists_low_stock_and_updates(client, admin):
    low = (await client.get(f"{API}/inventory", headers=admin)).json()
    assert [(v["sku"], v["stock"]) for v in low["items"]] == [("B-D-CH-P", 0), ("B-D-IV-P", 1)]
    assert (await client.get(f"{API}/inventory", headers=admin, params={"stock": "all"})).json()["total"] == 4

    r = await client.put(f"{API}/inventory", headers=admin, json={"items": [{"id": v["id"], "stock": 12} for v in low["items"]]})
    assert r.json() == {"updated": 2}
    assert (await client.get(f"{API}/inventory", headers=admin)).json()["total"] == 0
    blanket = next(p for p in (await client.get(f"{API}/products", headers=admin)).json()["items"] if p["slug"] == "fleece-blanket")
    assert blanket["total_stock"] == 29  # stats recomputed: 5 + 12 + 12

    r = await client.put(f"{API}/inventory", headers=admin, json={"items": [{"id": 99999, "stock": 1}]})
    assert r.status_code == 404
    r = await client.put(f"{API}/inventory", headers=admin, json={"items": [{"id": low["items"][0]["id"], "stock": -1}]})
    assert r.status_code == 422


async def test_category_rules_order_and_delete(client, admin):
    cats = {c["slug"]: c for c in (await client.get(f"{API}/categories", headers=admin)).json()}
    home, blankets, towels = cats["home-living"], cats["blankets"], cats["towels"]
    assert blankets["product_count"] == 1 and home["child_count"] == 2

    body = lambda c, **kw: {k: c[k] for k in ("name", "slug", "description", "image_url", "parent_id", "sort_order", "is_active")} | kw  # noqa: E731
    # Two levels only: no parent under a sub-category, and a parent can't move under another category.
    r = await client.post(f"{API}/categories", headers=admin, json={"name": "Fleece", "slug": "fleece", "parent_id": blankets["id"]})
    assert r.status_code == 400
    r = await client.put(f"{API}/categories/{home['id']}", headers=admin, json=body(home, parent_id=blankets["id"]))
    assert r.status_code == 400

    r = await client.put(f"{API}/categories-order", headers=admin, json={"ids": [towels["id"], blankets["id"]]})
    assert r.status_code == 204
    tree = (await client.get("/api/v1/categories")).json()
    assert [c["slug"] for c in tree[0]["children"]] == ["towels", "blankets"]
    r = await client.put(f"{API}/categories-order", headers=admin, json={"ids": [home["id"], blankets["id"]]})
    assert r.status_code == 400  # not siblings

    assert (await client.delete(f"{API}/categories/{home['id']}", headers=admin)).status_code == 409  # has children
    r = await client.delete(f"{API}/categories/{blankets['id']}", headers=admin)
    assert r.status_code == 409 and "1 product still" in r.json()["detail"]
    r = await client.post(f"{API}/categories", headers=admin, json={"name": "Rugs", "slug": "rugs", "parent_id": home["id"]})
    assert r.status_code == 201
    assert (await client.delete(f"{API}/categories/{r.json()['id']}", headers=admin)).status_code == 204
