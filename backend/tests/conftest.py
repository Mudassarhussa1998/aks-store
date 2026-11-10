import os

os.environ["DATABASE_URL"] = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://localhost/aks_test")
os.environ["REDIS_URL"] = ""  # no cache in tests: every assertion should see fresh data

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import models  # noqa: E402,F401
from app.core.db import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, Coupon, Product, User, Variant  # noqa: E402
from app.services.catalog import refresh_product_stats  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def data():
    async with SessionLocal() as db:
        await db.execute(text(
            "TRUNCATE order_events, order_items, orders, reviews, wishlist_items, recently_viewed, product_images, "
            "variants, products, categories, coupons, addresses, users RESTART IDENTITY CASCADE"))
        home = Category(slug="home-living", name="Home & Living")
        blankets = Category(slug="blankets", name="Blankets", parent=home)
        towels = Category(slug="towels", name="Towels", parent=home)
        db.add_all([home, blankets, towels])
        blanket = Product(slug="fleece-blanket", name="Fleece Blanket", category=blankets, variants=[
            Variant(sku="B-S-IV-S", size="Single", color="Ivory", color_hex="#EAE3D6", quality="Standard", price=4200, stock=5),
            Variant(sku="B-D-IV-P", size="Double", color="Ivory", color_hex="#EAE3D6", quality="Premium", price=7300, stock=1),
            Variant(sku="B-D-CH-P", size="Double", color="Charcoal", color_hex="#4A4A4A", quality="Premium", price=7300, stock=0),
        ])
        towel = Product(slug="bath-towel", name="Bath Towel", category=towels, variants=[
            Variant(sku="T-H-WH", size="Hand", color="White", color_hex="#FFFFFF", price=650, stock=50),
        ])
        db.add_all([blanket, towel])
        db.add_all([
            User(name="Admin", email="admin@test.pk", password_hash=hash_password("admin-pass-123"), is_admin=True),
            Coupon(code="WINTER10", kind="percent", value=10, min_subtotal=3000),
        ])
        await db.flush()
        for p in (blanket, towel):
            await refresh_product_stats(db, p.id)
        await db.commit()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def _token(client: AsyncClient, email: str, password: str) -> dict:
    r = await client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
async def admin(client):
    return await _token(client, "admin@test.pk", "admin-pass-123")


@pytest.fixture
async def customer(client):
    r = await client.post("/api/v1/auth/register", json={
        "name": "Ayesha Khan", "email": "ayesha@test.pk", "phone": "03001234567", "password": "secret-pass-1"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
