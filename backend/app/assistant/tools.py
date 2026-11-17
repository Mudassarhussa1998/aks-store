"""Tools the shopping assistant can call.

Each tool is a plain async function with type hints and a docstring (Gemini reads both). They are built per
request by `build_tools(ctx)` as closures over the ToolContext, so the customer's identity is fixed by the
server: no tool takes a user id, every order lookup goes through `ctx.owns_order`, and tools for a customer's
own data are only given to signed-in sessions (guests get `ask_to_sign_in` instead).

Tool results are data for the model, never instructions. Keep them short: only what an answer needs.
"""

from collections.abc import Callable
from datetime import UTC, datetime
from functools import partial
from typing import Any

from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.routes.orders import CANCELLABLE
from app.assistant.context import ToolContext
from app.core.cache import invalidate
from app.core.config import settings
from app.models import (
    Address,
    AssistantMemory,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Variant,
    WishlistItem,
)
from app.services import catalog, order_notify
from app.services import orders as order_service

MAX_MEMORIES = 20
NOT_FOUND = {
    "error": "order_not_found",
    "message": "No order with that number was found for this customer. Do not guess or reveal anything else.",
}

POLICIES = {
    "payment": "Cash on Delivery across Pakistan: pay the rider in cash. Card, JazzCash and Easypaisa are coming soon.",
    "order_confirmation": "The store calls or WhatsApps to confirm every Cash on Delivery order before it ships.",
    "delivery_time": "2–4 working days in major cities, 5–7 working days elsewhere in Pakistan.",
    "delivery_fee": f"Free on orders over Rs {settings.free_delivery_threshold:,}; below that a flat Rs {settings.delivery_fee:,}.",
    "returns": "Return or exchange unused items with tags within 7 days of delivery. Opened pillows and inner wear "
    "can't be returned unless faulty. To start a return, message the store from the Contact page (/contact) "
    "or WhatsApp with the order number.",
    "cancellation": "Orders can be cancelled until they ship. After that, contact the store.",
    "track_without_account": "Orders placed without an account can be tracked at /track with the order number and checkout phone.",
}


def _rs(amount: int | None) -> str | None:
    return None if amount is None else f"Rs {amount:,}"


def _mask_phone(phone: str) -> str:
    """Only the last 3 digits, whatever format the number was typed in."""
    digits = "".join(ch for ch in phone if ch.isdigit())
    return "*******" + digits[-3:] if len(digits) >= 10 else "****"


def _order_brief(o: Order, item_count: int | None = None) -> dict[str, Any]:
    return {
        "number": o.number,
        "status": o.status.value,
        "placed_on": o.created_at.date().isoformat(),
        "total": _rs(o.total),
        "items": item_count if item_count is not None else sum(i.quantity for i in o.items),
        "url": f"/account/orders/{o.number}",
    }


def _order_full(o: Order) -> dict[str, Any]:
    return {
        **_order_brief(o),
        "can_cancel": o.status in CANCELLABLE,
        "payment": "Cash on Delivery",
        "subtotal": _rs(o.subtotal),
        "delivery_fee": _rs(o.delivery_fee),
        "discount": _rs(o.discount) if o.discount else None,
        "coupon": o.coupon_code,
        "deliver_to": {"name": o.name, "city": o.city, "area": o.area, "address": o.address, "phone": _mask_phone(o.phone)},
        "courier": o.courier,
        "tracking_number": o.tracking_number,
        "products": [
            {"name": i.product_name, "option": i.variant_label, "qty": i.quantity, "unit_price": _rs(i.unit_price), "url": f"/p/{i.product_slug}"}
            for i in o.items
        ],
        "timeline": [{"status": e.status.value, "date": e.created_at.date().isoformat(), "note": e.note} for e in o.events],
    }


def _card(c: dict) -> dict[str, Any]:
    return {
        "name": c["name"],
        "slug": c["slug"],
        "category": c["category"],
        "price_from": _rs(c["price"]),
        "was": _rs(c["compare_at_price"]) if c["compare_at_price"] and c["compare_at_price"] > c["price"] else None,
        "rating": f"{c['rating_avg']} ({c['rating_count']} reviews)" if c["rating_count"] else "no reviews yet",
        "in_stock": c["in_stock"],
        "url": f"/p/{c['slug']}",
    }


def _variant(v: dict) -> dict[str, Any]:
    out = {
        "variant_id": v["id"],
        "option": " · ".join(x for x in (v["size"], v["color"], v["quality"]) if x) or "Standard",
        "price": _rs(v["price"]),
        "in_stock": v["stock"] > 0,
    }
    if v["compare_at_price"] and v["compare_at_price"] > v["price"]:
        out["was"] = _rs(v["compare_at_price"])
    if 0 < v["stock"] <= 5:
        out["only_left"] = v["stock"]
    return out


def build_tools(ctx: ToolContext) -> list[Callable[..., Any]]:
    db = ctx.db

    async def load_owned_order(number: str) -> Order | None:
        number = number.strip().upper()
        order = await db.scalar(
            select(Order).where(Order.number == number).options(selectinload(Order.items), selectinload(Order.events))
        )
        if order is None or not ctx.owns_order(order.user_id):
            return None
        return order

    # ---------- catalog (anyone) ----------

    async def search_products(
        query: str = "",
        category: str = "",
        min_price: int = 0,
        max_price: int = 0,
        color: str = "",
        size: str = "",
        sort: str = "recommended",
    ) -> dict:
        """Search the store's products. Use for any request to find, browse or recommend products.

        Args:
          query: Words to look for in product names and descriptions, e.g. "lawn suit" or "fleece blanket". Empty to browse.
          category: Optional category slug from list_categories, e.g. "blankets".
          min_price: Optional minimum price in rupees (0 = no minimum).
          max_price: Optional maximum price in rupees (0 = no maximum).
          color: Optional colour name, e.g. "Ivory".
          size: Optional size, e.g. "King" or "M".
          sort: One of recommended, newest, price_asc, price_desc, rating.
        """
        page = await catalog.list_products(
            db,
            category_slug=category or None,
            q=query.strip() or None,
            colors=[color.strip().title()] if color.strip() else None,
            sizes=[size.strip()] if size.strip() else None,
            min_price=min_price or None,
            max_price=max_price or None,
            sort=sort if sort in catalog.SORTS else "recommended",
            page_size=8,
        )
        return {"total_matches": page["total"], "products": [_card(c) for c in page["items"]]}

    async def list_categories() -> dict:
        """List the store's product categories (with their slugs) to help narrow a search."""
        tree = await catalog.category_tree(db)

        def flat(nodes: list[dict]) -> list[dict]:
            return [{"name": n["name"], "slug": n["slug"], "subcategories": flat(n["children"])} for n in nodes]

        return {"categories": flat(tree)}

    async def get_product_details(slug: str) -> dict:
        """Get full details of one product: description, material and care, every option with price and stock, rating.

        Args:
          slug: The product slug from search results (the part after /p/ in its url).
        """
        d = await catalog.product_detail(db, slug.strip())
        if d is None:
            return {"error": "product_not_found"}
        return {
            "name": d["name"],
            "url": f"/p/{d['slug']}",
            "category": d["category"]["name"],
            "description": d["description"][:700],
            "material_and_care": d["material_care"][:400],
            "rating": f"{d['rating_avg']} out of 5 from {d['rating_count']} reviews" if d["rating_count"] else "no reviews yet",
            "options": d["options"],
            "variants": [_variant(v) for v in d["variants"]],
        }

    async def compare_products(slugs: list[str]) -> dict:
        """Compare 2 to 4 products side by side: price range, options, stock, rating and material.

        Args:
          slugs: Product slugs to compare.
        """
        rows = []
        for slug in slugs[:4]:
            d = await catalog.product_detail(db, slug.strip())
            if d is None:
                rows.append({"slug": slug, "error": "product_not_found"})
                continue
            prices = [v["price"] for v in d["variants"]] or [0]
            rows.append({
                "name": d["name"],
                "url": f"/p/{d['slug']}",
                "price_range": f"{_rs(min(prices))} – {_rs(max(prices))}" if min(prices) != max(prices) else _rs(prices[0]),
                "sizes": d["options"]["size"],
                "colors": d["options"]["color"],
                "qualities": d["options"]["quality"],
                "in_stock": any(v["stock"] > 0 for v in d["variants"]),
                "rating": f"{d['rating_avg']} ({d['rating_count']} reviews)" if d["rating_count"] else "no reviews yet",
                "material_and_care": d["material_care"][:250],
            })
        return {"comparison": rows}

    def get_store_policies() -> dict:
        """Get the store's policies: payment, delivery time and fee, returns, cancellation, tracking."""
        return POLICIES

    # ---------- cart (anyone; the cart itself lives in the shopper's browser) ----------

    async def view_cart(coupon: str = "") -> dict:
        """Show what is in the shopper's cart with current prices, delivery fee and total.

        Args:
          coupon: Optional coupon code to check against the cart.
        """
        if not ctx.cart:
            return {"cart": "empty"}
        q, _ = await order_service.quote(db, schemas.QuoteIn(items=ctx.cart, coupon=coupon or None))
        return {
            "lines": [
                {"name": ln["product_name"], "option": ln["variant_label"], "qty": ln["quantity"], "line_total": _rs(ln["line_total"]), "available": ln["available"]}
                for ln in q["lines"]
            ],
            "subtotal": _rs(q["subtotal"]),
            "delivery_fee": _rs(q["delivery_fee"]),
            "discount": _rs(q["discount"]) if q["discount"] else None,
            "coupon_error": q["coupon_error"],
            "total": _rs(q["total"]),
            "checkout_url": "/checkout",
        }

    async def add_to_cart(variant_id: int, quantity: int = 1) -> dict:
        """Add a product option to the shopper's cart. Only call it when the shopper asks to add or buy something.

        Args:
          variant_id: The variant_id of the exact option (size/colour/quality) from get_product_details.
          quantity: How many, 1 to 20.
        """
        quantity = max(1, min(20, quantity))
        v = await db.scalar(
            select(Variant).where(Variant.id == variant_id).options(selectinload(Variant.product).selectinload(Product.images))
        )
        if v is None or not v.product.is_active:
            return {"error": "option_not_found"}
        if v.stock < quantity:
            return {"error": "not_enough_stock", "in_stock": v.stock}
        images = v.product.images
        image = next((i.url for i in images if i.color and i.color == v.color), images[0].url if images else None)
        ctx.actions.append({
            "type": "add_to_cart",
            "item": {"variantId": v.id, "quantity": quantity, "slug": v.product.slug, "name": v.product.name,
                     "label": v.label, "price": v.price, "image": image},
        })
        return {"added": f"{quantity} × {v.product.name} ({v.label or 'Standard'})", "checkout_url": "/checkout"}

    # ---------- orders (owner only) ----------

    async def ask_to_sign_in(reason: str) -> dict:
        """Ask a guest to sign in because their request needs their account.

        Call this for anything about the customer's own data: tracking or checking an order, order history,
        cancelling, returns status, wishlist, saved addresses, placing an order in chat, or remembering
        preferences. Their message is saved and answered automatically right after they sign in.
        Do not call it for products, prices, comparisons, the cart or store policies.

        Args:
          reason: A few words on what needs the account, e.g. "check your order status".
        """
        ctx.conversation.pending_prompt = ctx.message[:2000]
        ctx.conversation.pending_prompt_at = datetime.now(UTC)
        ctx.actions.append({"type": "sign_in_required", "reason": reason.strip()[:120]})
        return {
            "saved": True,
            "tell_customer": "Ask them to sign in (or create an account) with the button shown below your reply. "
            "Their question is saved and will be answered as soon as they're signed in. Guests who ordered "
            "without an account can track an order at /track.",
        }

    async def get_order(order_number: str) -> dict:
        """Get the status, items, delivery details and tracking of one of the customer's orders.

        Args:
          order_number: The order number, e.g. VLZ-ABC123.
        """
        order = await load_owned_order(order_number)
        return NOT_FOUND if order is None else _order_full(order)

    async def compare_orders(order_numbers: list[str]) -> dict:
        """Compare 2 to 5 of the customer's orders side by side (dates, status, totals, products).

        Args:
          order_numbers: The order numbers to compare.
        """
        rows = []
        for number in order_numbers[:5]:
            order = await load_owned_order(number)
            if order is None:
                rows.append({"number": number.strip().upper(), **NOT_FOUND})
                continue
            rows.append({**_order_brief(order), "products": [f"{i.quantity} × {i.product_name} ({i.variant_label})" for i in order.items]})
        return {"orders": rows}

    async def cancel_order(order_number: str, reason: str = "") -> dict:
        """Cancel one of the customer's orders that hasn't shipped yet.

        This needs the customer's explicit confirmation: the first call returns "needs_confirmation" with the
        details. Tell them exactly what will be cancelled and ask "Shall I cancel it?". Call again only after
        they clearly say yes in their next message.

        Args:
          order_number: The order number to cancel.
          reason: The customer's reason, if they gave one.
        """
        order = await load_owned_order(order_number)
        if order is None:
            return NOT_FOUND
        if order.status not in CANCELLABLE:
            return {"error": "cannot_cancel", "status": order.status.value, "message": "It has already shipped; the customer should contact the store."}
        if not ctx.confirmed({"type": "cancel_order", "order": order.number}):
            return {"needs_confirmation": True, "order": _order_brief(order)}
        reason = reason.strip()[:150]
        order = await order_service.change_status(
            db, order, schemas.OrderStatusIn(status=OrderStatus.cancelled, note=f"Cancelled via assistant{': ' + reason if reason else ''}")
        )
        await invalidate("product:*", "products:*")
        ctx.after_response.append(partial(order_notify.send, order_notify.snapshot(order, "cancelled")))
        ctx.actions.append({"type": "stock_changed"})
        return {"cancelled": True, "order": _order_brief(order)}

    # ---------- signed-in only ----------

    async def list_my_orders(status: str = "") -> dict:
        """List the signed-in customer's orders, newest first.

        Args:
          status: Optional filter: pending, confirmed, shipped, delivered, cancelled or returned.
        """
        stmt = (
            select(Order, func.coalesce(func.sum(OrderItem.quantity), 0))
            .outerjoin(OrderItem)
            .where(Order.user_id == ctx.user.id)
            .group_by(Order.id)
            .order_by(Order.created_at.desc())
            .limit(20)
        )
        if status:
            try:
                stmt = stmt.where(Order.status == OrderStatus(status.strip().lower()))
            except ValueError:
                return {"error": "unknown_status", "valid": [s.value for s in OrderStatus]}
        rows = (await db.execute(stmt)).all()
        return {"orders": [_order_brief(o, n) for o, n in rows] or "none"}

    async def list_my_addresses() -> dict:
        """List the signed-in customer's saved delivery addresses (needed before placing an order)."""
        rows = (
            await db.scalars(select(Address).where(Address.user_id == ctx.user.id).order_by(Address.is_default.desc(), Address.id))
        ).all()
        return {"addresses": [
            {"address_id": a.id, "label": a.label, "default": a.is_default, "name": a.name, "city": a.city, "area": a.area, "line": a.line}
            for a in rows
        ] or "none saved: the customer can add one at /account or check out at /checkout"}

    async def place_order(address_id: int, coupon: str = "") -> dict:
        """Place a Cash on Delivery order for everything in the shopper's cart, delivered to a saved address.

        This needs the customer's explicit confirmation: the first call returns "needs_confirmation" with the
        items, address and total. Show them and ask "Shall I place this order?". Call again with the same
        address and coupon only after they clearly say yes in their next message.

        Args:
          address_id: The address_id from list_my_addresses.
          coupon: Optional coupon code.
        """
        if not ctx.cart:
            return {"error": "cart_empty", "message": "Add products to the cart first."}
        address = await db.get(Address, address_id)
        if address is None or address.user_id != ctx.user.id:
            return {"error": "address_not_found"}
        try:
            data = schemas.CheckoutIn(
                items=ctx.cart, coupon=coupon or None, name=address.name, phone=address.phone,
                email=ctx.user.email, city=address.city, area=address.area, address=address.line,
            )
        except ValidationError:
            return {"error": "address_incomplete", "message": "That address can't be used; check out at /checkout instead."}
        q, _ = await order_service.quote(db, data)
        if not q["lines"] or not all(ln["available"] for ln in q["lines"]):
            return {"error": "not_available", "message": "Some items are out of stock; ask them to review the cart at /cart."}
        cart_key = sorted((c.variant_id, c.quantity) for c in ctx.cart)
        action = {"type": "place_order", "address_id": address.id, "coupon": data.coupon, "cart": cart_key, "total": q["total"]}
        if not ctx.confirmed(action):
            return {
                "needs_confirmation": True,
                "items": [f"{ln['quantity']} × {ln['product_name']} ({ln['variant_label']})" for ln in q["lines"]],
                "deliver_to": f"{address.name}, {address.line}, {address.area + ', ' if address.area else ''}{address.city}",
                "delivery_fee": _rs(q["delivery_fee"]),
                "discount": _rs(q["discount"]) if q["discount"] else None,
                "coupon_error": q["coupon_error"],
                "total": _rs(q["total"]),
                "payment": "Cash on Delivery",
            }
        order = await order_service.place_order(db, data, ctx.user)
        await invalidate("product:*", "products:*")
        ctx.after_response.append(partial(order_notify.send, order_notify.snapshot(order, "placed")))
        ctx.actions += [{"type": "clear_cart"}, {"type": "stock_changed"}]
        return {"placed": True, "order": _order_brief(order), "note": "The store will call to confirm before shipping."}

    async def get_my_wishlist() -> dict:
        """List the products the signed-in customer saved to their wishlist."""
        ids = (
            await db.scalars(select(WishlistItem.product_id).where(WishlistItem.user_id == ctx.user.id).order_by(WishlistItem.created_at.desc()))
        ).all()
        return {"wishlist": [_card(c) for c in await catalog.cards_by_ids(db, list(ids))] or "empty"}

    async def remember_preference(fact: str) -> dict:
        """Save a lasting preference the customer shares or asks you to remember (sizes, colours, city, budget…).

        Never save passwords, card numbers or other sensitive details.

        Args:
          fact: One short sentence, e.g. "Prefers King size bedsheets in light colours".
        """
        fact = " ".join(fact.split())[:300]
        if not fact:
            return {"error": "empty"}
        db.add(AssistantMemory(user_id=ctx.user.id, fact=fact))
        await db.flush()
        stale = (
            await db.scalars(
                select(AssistantMemory.id).where(AssistantMemory.user_id == ctx.user.id)
                .order_by(AssistantMemory.id.desc()).offset(MAX_MEMORIES)
            )
        ).all()
        if stale:
            await db.execute(delete(AssistantMemory).where(AssistantMemory.id.in_(stale)))
        return {"saved": fact}

    async def forget_preferences() -> dict:
        """Delete everything remembered about the customer. Use when they ask you to forget them."""
        await db.execute(delete(AssistantMemory).where(AssistantMemory.user_id == ctx.user.id))
        return {"forgotten": True}

    # Guests get the shop tools only; everything about a customer's own data exists just for signed-in sessions.
    tools: list[Callable[..., Any]] = [
        search_products, list_categories, get_product_details, compare_products, get_store_policies, view_cart, add_to_cart,
    ]
    if ctx.signed_in:
        tools += [
            list_my_orders, get_order, compare_orders, cancel_order, list_my_addresses, place_order,
            get_my_wishlist, remember_preference, forget_preferences,
        ]
    else:
        tools.append(ask_to_sign_in)
    return tools
