"""The shopping assistant must only ever reach the caller's own data.

Tool tests call the tools directly with a ToolContext, the way the agent does. API tests replace the Gemini
call with a scripted fake model, so they show what happens when the model asks for another customer's data.
"""

import json
from datetime import UTC, datetime, timedelta

import pytest
from google.genai import types
from sqlalchemy import select
from starlette._utils import is_async_callable

from app.assistant import agent
from app.assistant.context import ToolContext
from app.assistant.tools import build_tools
from app.core.config import settings
from app.core.db import SessionLocal
from app.models import Address, AssistantConversation, AssistantMessage, OrderStatus, User, Variant
from app.schemas import CartLineIn

CHECKOUT = {"city": "Lahore", "area": "DHA", "address": "House 1, Street 2"}


async def _register(client, name: str, email: str, phone: str) -> dict:
    r = await client.post("/api/v1/auth/register", json={"name": name, "email": email, "phone": phone, "password": "secret-pass-1"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _order(client, headers: dict | None, name: str, phone: str) -> str:
    async with SessionLocal() as db:
        towel = await db.scalar(select(Variant.id).where(Variant.sku == "T-H-WH"))
    r = await client.post("/api/v1/orders", headers=headers or {}, json={
        "items": [{"variant_id": towel, "quantity": 1}], "name": name, "phone": phone, **CHECKOUT})
    assert r.status_code == 201, r.text
    return r.json()["number"]


@pytest.fixture
async def shop(client):
    """Two customers with one order each, plus a guest order."""
    ayesha = await _register(client, "Ayesha Khan", "ayesha@test.pk", "03001234567")
    bilal = await _register(client, "Bilal Ahmed", "bilal@test.pk", "03211234567")
    return {
        "ayesha": ayesha,
        "bilal": bilal,
        "ayesha_order": await _order(client, ayesha, "Ayesha Khan", "03001234567"),
        "bilal_order": await _order(client, bilal, "Bilal Ahmed", "03211234567"),
        "guest_order": await _order(client, None, "Guest Buyer", "03331234567"),
    }


async def _ctx(db, email: str | None, turn: int = 1, convo: AssistantConversation | None = None) -> ToolContext:
    user = await db.scalar(select(User).where(User.email == email)) if email else None
    if convo is None:
        convo = AssistantConversation(id=f"test-{email}-{turn}", user_id=user.id if user else None, turns=0)
        db.add(convo)
        await db.flush()
    return ToolContext(db=db, user=user, conversation=convo, turn=turn)


def _tools(ctx: ToolContext) -> dict:
    return {t.__name__: t for t in build_tools(ctx)}


# ---------- tools ----------


async def test_customer_sees_only_own_orders(shop):
    async with SessionLocal() as db:
        tools = _tools(await _ctx(db, "ayesha@test.pk"))
        assert (await tools["get_order"](shop["ayesha_order"]))["number"] == shop["ayesha_order"]
        assert (await tools["get_order"](shop["bilal_order"]))["error"] == "order_not_found"
        assert (await tools["get_order"](shop["guest_order"]))["error"] == "order_not_found"
        listed = [o["number"] for o in (await tools["list_my_orders"]())["orders"]]
        assert listed == [shop["ayesha_order"]]
        compared = (await tools["compare_orders"]([shop["ayesha_order"], shop["bilal_order"]]))["orders"]
        assert compared[0]["number"] == shop["ayesha_order"] and "total" in compared[0]
        assert compared[1] == {"number": shop["bilal_order"], "error": "order_not_found", "message": compared[1]["message"]}


async def test_guests_get_shop_tools_only(shop):
    async with SessionLocal() as db:
        guest = set(_tools(await _ctx(db, None)))
        member = set(_tools(await _ctx(db, "ayesha@test.pk")))
    private = {"list_my_orders", "get_order", "compare_orders", "cancel_order", "list_my_addresses", "place_order",
               "get_my_wishlist", "remember_preference", "forget_preferences"}
    assert not guest & private
    assert private <= member
    assert "ask_to_sign_in" in guest and "ask_to_sign_in" not in member
    assert {"search_products", "compare_products", "add_to_cart", "get_store_policies"} <= guest


async def test_ask_to_sign_in_saves_the_question(shop):
    async with SessionLocal() as db:
        ctx = await _ctx(db, None)
        ctx.message = "Where is my order?"
        out = await _tools(ctx)["ask_to_sign_in"]("check your order status")
        assert out["saved"] is True
        assert ctx.conversation.pending_prompt == "Where is my order?" and ctx.conversation.pending_prompt_at is not None
        assert ctx.actions == [{"type": "sign_in_required", "reason": "check your order status"}]


async def test_cancel_needs_confirmation_in_a_later_turn(shop):
    async with SessionLocal() as db:
        ctx = await _ctx(db, "ayesha@test.pk")
        tools = _tools(ctx)
        assert (await tools["cancel_order"](shop["ayesha_order"]))["needs_confirmation"] is True
        # Calling again in the same turn is not a confirmation.
        assert (await tools["cancel_order"](shop["ayesha_order"]))["needs_confirmation"] is True
        # Someone else's order can't even be prepared for cancelling.
        assert (await tools["cancel_order"](shop["bilal_order"]))["error"] == "order_not_found"

        ctx.turn = 2  # the customer replied "yes"
        result = await tools["cancel_order"](shop["ayesha_order"], "changed my mind")
        assert result["cancelled"] is True and result["order"]["status"] == OrderStatus.cancelled.value
        assert {"type": "stock_changed"} in ctx.actions
        # The cancellation email/SMS job must be awaitable, or FastAPI would silently never send it.
        assert len(ctx.after_response) == 1 and is_async_callable(ctx.after_response[0])


async def test_pending_confirmation_expires(shop):
    async with SessionLocal() as db:
        ctx = await _ctx(db, "ayesha@test.pk")
        tools = _tools(ctx)
        await tools["cancel_order"](shop["ayesha_order"])
        ctx.turn = 5  # too many messages later
        assert (await tools["cancel_order"](shop["ayesha_order"]))["needs_confirmation"] is True


async def test_place_order_uses_own_address_and_confirmation(shop):
    async with SessionLocal() as db:
        ayesha = await db.scalar(select(User).where(User.email == "ayesha@test.pk"))
        bilal = await db.scalar(select(User).where(User.email == "bilal@test.pk"))
        mine = Address(user_id=ayesha.id, name="Ayesha Khan", phone="+923001234567", city="Lahore", area="DHA", line="House 9, Street 4")
        theirs = Address(user_id=bilal.id, name="Bilal Ahmed", phone="+923211234567", city="Karachi", line="Flat 3, Block B")
        db.add_all([mine, theirs])
        await db.flush()
        towel = await db.scalar(select(Variant.id).where(Variant.sku == "T-H-WH"))

        ctx = await _ctx(db, "ayesha@test.pk")
        ctx.cart = [CartLineIn(variant_id=towel, quantity=2)]
        tools = _tools(ctx)
        assert (await tools["place_order"](theirs.id))["error"] == "address_not_found"
        first = await tools["place_order"](mine.id)
        assert first["needs_confirmation"] is True and first["total"] == "Rs 1,550"

        ctx.turn = 2
        ctx.cart = [CartLineIn(variant_id=towel, quantity=3)]  # cart changed: must confirm again
        assert (await tools["place_order"](mine.id))["needs_confirmation"] is True

        ctx.turn = 3
        placed = await tools["place_order"](mine.id)
        assert placed["placed"] is True
        assert {"type": "clear_cart"} in ctx.actions
        listed = [o["number"] for o in (await tools["list_my_orders"]())["orders"]]
        assert placed["order"]["number"] in listed


async def test_memories_belong_to_one_customer(shop):
    async with SessionLocal() as db:
        ayesha = _tools(await _ctx(db, "ayesha@test.pk"))
        bilal = _tools(await _ctx(db, "bilal@test.pk"))
        await ayesha["remember_preference"]("Prefers King size bedsheets")
        await bilal["remember_preference"]("Lives in Karachi")
        await db.commit()
    from app.assistant import conversations

    async with SessionLocal() as db:
        ay = await db.scalar(select(User).where(User.email == "ayesha@test.pk"))
        assert await conversations.memories(db, ay) == ["Prefers King size bedsheets"]
        assert await conversations.memories(db, None) == []


# ---------- API with a scripted model ----------


@pytest.fixture
def fake_model(monkeypatch):
    """A fake Gemini: on each user message it calls the scripted tool, then repeats the tool's answer as JSON."""
    script: dict = {}

    async def model_turn(contents, config):
        last = contents[-1].parts[0]
        if last.function_response is not None:
            return types.Content(role="model", parts=[types.Part(text=json.dumps(last.function_response.response))])
        if script.get("tool"):
            call = types.FunctionCall(id="1", name=script["tool"], args=script.get("args", {}))
            return types.Content(role="model", parts=[types.Part(function_call=call)])
        return types.Content(role="model", parts=[types.Part(text="Hello!")])

    monkeypatch.setattr(agent, "_model_turn", model_turn)
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    return script


async def test_model_cannot_fetch_another_customers_order(client, shop, fake_model):
    # Even if the model is tricked into asking for Bilal's order, Ayesha's session can't read it.
    fake_model.update(tool="get_order", args={"order_number": shop["bilal_order"]})
    r = await client.post("/api/v1/assistant/chat", headers=shop["ayesha"], json={"message": "Show order " + shop["bilal_order"]})
    assert r.status_code == 200, r.text
    assert json.loads(r.json()["reply"])["error"] == "order_not_found"

    fake_model.update(tool="get_order", args={"order_number": shop["ayesha_order"]})
    r = await client.post("/api/v1/assistant/chat", headers=shop["ayesha"], json={"message": "Where is my order?"})
    assert json.loads(r.json()["reply"])["number"] == shop["ayesha_order"]


async def test_conversations_cannot_be_borrowed(client, shop, fake_model):
    r = await client.post("/api/v1/assistant/chat", headers=shop["ayesha"], json={"message": "My size is King"})
    ayesha_convo = r.json()["conversation_id"]

    # Bilal and a guest who somehow got Ayesha's conversation id get their own fresh chats instead.
    for headers in (shop["bilal"], {}):
        r = await client.post("/api/v1/assistant/chat", headers=headers, json={"message": "hi", "conversation_id": ayesha_convo})
        assert r.status_code == 200 and r.json()["conversation_id"] != ayesha_convo
        r = await client.get("/api/v1/assistant/conversation", headers=headers, params={"conversation_id": ayesha_convo})
        assert all(m["content"] != "My size is King" for m in r.json()["messages"])
        await client.delete("/api/v1/assistant/conversation", headers=headers, params={"conversation_id": ayesha_convo})

    r = await client.get("/api/v1/assistant/conversation", headers=shop["ayesha"])
    assert r.json()["conversation_id"] == ayesha_convo
    assert [m["content"] for m in r.json()["messages"]] == ["My size is King", "Hello!"]


async def test_guest_question_is_answered_after_sign_in_once(client, shop, fake_model):
    fake_model.update(tool="ask_to_sign_in", args={"reason": "check your order"})
    r = await client.post("/api/v1/assistant/chat", json={"message": "Where is my order?"})
    assert r.status_code == 200 and {"type": "sign_in_required", "reason": "check your order"} in r.json()["actions"]
    guest_convo = r.json()["conversation_id"]

    # Still a guest: nothing is handed over.
    r = await client.get("/api/v1/assistant/conversation", params={"conversation_id": guest_convo})
    assert r.json()["resume_prompt"] is None

    # Signed in, same browser (it holds the guest chat id): the question comes back exactly once…
    r = await client.get("/api/v1/assistant/conversation", headers=shop["ayesha"], params={"conversation_id": guest_convo})
    assert r.json()["resume_prompt"] == "Where is my order?"
    assert r.json()["messages"] == []  # …in Ayesha's own chat, not the guest one
    r = await client.get("/api/v1/assistant/conversation", headers=shop["ayesha"], params={"conversation_id": guest_convo})
    assert r.json()["resume_prompt"] is None

    # The guest's messages stay saved in the database.
    async with SessionLocal() as db:
        convo = await db.get(AssistantConversation, guest_convo)
        assert convo.user_id is None and convo.pending_prompt is None
        first = await db.scalar(select(AssistantMessage.content).where(AssistantMessage.conversation_id == guest_convo).order_by(AssistantMessage.id))
        assert first == "Where is my order?"


async def test_old_or_other_peoples_questions_are_not_handed_over(client, shop, fake_model):
    fake_model.update(tool="ask_to_sign_in", args={"reason": "orders"})
    r = await client.post("/api/v1/assistant/chat", json={"message": "Show my orders"})
    guest_convo = r.json()["conversation_id"]
    async with SessionLocal() as db:
        convo = await db.get(AssistantConversation, guest_convo)
        convo.pending_prompt_at = datetime.now(UTC) - timedelta(hours=1)
        await db.commit()
    r = await client.get("/api/v1/assistant/conversation", headers=shop["ayesha"], params={"conversation_id": guest_convo})
    assert r.json()["resume_prompt"] is None

    # A signed-in user's own chat never holds a hand-over question.
    fake_model.update(tool="list_my_orders", args={})
    r = await client.post("/api/v1/assistant/chat", headers=shop["bilal"], json={"message": "my orders"})
    r = await client.get("/api/v1/assistant/conversation", headers=shop["ayesha"], params={"conversation_id": r.json()["conversation_id"]})
    assert r.json()["resume_prompt"] is None


async def test_memories_endpoint_is_per_user(client, shop, fake_model):
    fake_model.update(tool="remember_preference", args={"fact": "Likes ivory colour"})
    await client.post("/api/v1/assistant/chat", headers=shop["ayesha"], json={"message": "remember I like ivory"})
    assert [m["fact"] for m in (await client.get("/api/v1/assistant/memories", headers=shop["ayesha"])).json()] == ["Likes ivory colour"]
    assert (await client.get("/api/v1/assistant/memories", headers=shop["bilal"])).json() == []
    assert (await client.get("/api/v1/assistant/memories")).status_code == 401


async def test_chat_is_off_without_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", None)
    r = await client.post("/api/v1/assistant/chat", json={"message": "hi"})
    assert r.status_code == 503
