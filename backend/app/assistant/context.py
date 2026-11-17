from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.models import AssistantConversation, User

# A pending action (cancel, place order) only goes through on one of the customer's next two messages.
CONFIRM_WITHIN_TURNS = 2


@dataclass
class ToolContext:
    """Everything a tool may act on for one chat request. Built by the API from the verified session."""

    db: AsyncSession
    user: User | None  # set only from a valid sign-in token
    conversation: AssistantConversation
    turn: int  # this request's turn number in the conversation
    message: str = ""  # what the customer just asked
    cart: list[schemas.CartLineIn] = field(default_factory=list)  # what the shopper has in their browser cart
    actions: list[dict[str, Any]] = field(default_factory=list)  # instructions for the chat widget (add to cart…)
    after_response: list[Callable[[], Awaitable[None]]] = field(default_factory=list)  # e.g. order emails

    @property
    def signed_in(self) -> bool:
        return self.user is not None

    def owns_order(self, order_user_id: int | None) -> bool:
        """The one ownership rule: only orders on the signed-in customer's own account."""
        return self.user is not None and order_user_id == self.user.id

    def confirmed(self, action: dict[str, Any]) -> bool:
        """Two-step confirmation for actions that change things.

        The first call records the action and returns False, so the assistant must show the details and ask.
        Only a call in a later turn (after the customer has replied) with exactly the same details returns True.
        """
        pending = self.conversation.pending_action
        if pending:
            details = {k: v for k, v in pending.items() if k != "turn"}
            if details == action and 0 < self.turn - pending.get("turn", 0) <= CONFIRM_WITHIN_TURNS:
                self.conversation.pending_action = None
                return True
        self.conversation.pending_action = {**action, "turn": self.turn}
        return False
