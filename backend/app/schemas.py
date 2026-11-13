import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.core.config import settings
from app.models import OrderStatus

PK_PHONE = r"^(\+92|0)3\d{2}[\s-]?\d{7}$"


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth / users ----------


def normalize_pk_phone(value: str) -> str:
    """Accept 0300 1234567, 0300-1234567, 923001234567 or +923001234567; store as +923001234567."""
    digits = re.sub(r"[\s-]", "", value)
    if not re.fullmatch(r"(\+92|92|0)3\d{9}", digits):
        raise ValueError("Enter a Pakistani mobile number like 0300 1234567.")
    return "+92" + digits[-10:]


PkPhone = Annotated[str, AfterValidator(normalize_pk_phone)]
Password = Annotated[str, Field(min_length=8, max_length=128)]
OtpCode = Annotated[str, Field(pattern=r"^\d{6}$")]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: PkPhone
    password: Password


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=255, description="Email address or mobile number")
    password: str


class UserOut(ORM):
    id: int
    name: str
    email: str
    phone: str | None
    is_admin: bool
    whatsapp_updates: bool
    email_verified: bool
    phone_verified: bool
    has_password: bool
    gender: str | None
    date_of_birth: date | None
    city: str | None
    created_at: datetime

    @computed_field
    @property
    def can_verify_phone(self) -> bool:
        return settings.sms_enabled


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: PkPhone | None = None
    whatsapp_updates: bool | None = None
    gender: Literal["female", "male", "other"] | None = None
    date_of_birth: date | None = None
    city: str | None = Field(default=None, max_length=80)

    @field_validator("date_of_birth")
    @classmethod
    def sensible_birthday(cls, v: date | None) -> date | None:
        if v is not None and not (date(1900, 1, 1) <= v <= date.today()):
            raise ValueError("Enter a real date of birth.")
        return v

    @field_validator("city", mode="before")
    @classmethod
    def blank_city_is_none(cls, v: str | None) -> str | None:
        return (v or "").strip() or None


class VerifySendIn(BaseModel):
    channel: Literal["email", "phone"]


class VerifyConfirmIn(BaseModel):
    channel: Literal["email", "phone"]
    code: OtpCode


class CodeSentOut(BaseModel):
    sent_to: str
    retry_after: int


class ForgotPasswordIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)


class ResetPasswordIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    code: OtpCode
    password: Password


class ChangePasswordIn(BaseModel):
    current_password: str | None = None  # not needed when the account has no password yet (Google sign-up)
    new_password: Password


class GoogleSignInIn(BaseModel):
    id_token: str = Field(max_length=4096)
    nonce: str = Field(min_length=16, max_length=128)


class FacebookSignInIn(BaseModel):
    code: str = Field(min_length=10, max_length=2048)


class OAuthTokenOut(TokenOut):
    is_new: bool
    needs_phone: bool


class DeleteAccountIn(BaseModel):
    password: str | None = None  # required when the account has a password


ContactTopic = Literal["order", "returns", "product", "wholesale", "careers", "other"]


class ContactIn(BaseModel):
    topic: ContactTopic = "other"
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: PkPhone | None = None
    order_number: str | None = Field(default=None, max_length=20)
    message: str = Field(min_length=10, max_length=4000)
    website: str = ""  # honeypot: hidden from people, bots fill it in

    @field_validator("phone", "order_number", mode="before")
    @classmethod
    def blank_is_none(cls, v: str | None) -> str | None:
        return (v or "").strip() or None


class ContactMessageOut(ORM):
    id: int
    topic: str
    name: str
    email: str
    phone: str | None
    order_number: str | None
    message: str
    is_read: bool
    created_at: datetime


class MessageOut(BaseModel):
    detail: str


class AddressIn(BaseModel):
    label: str = Field(default="Home", max_length=40)
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=PK_PHONE)
    city: str = Field(min_length=2, max_length=80)
    area: str = Field(default="", max_length=120)
    line: str = Field(min_length=5, max_length=500)
    is_default: bool = False


class AddressOut(ORM, AddressIn):
    id: int


# ---------- catalog ----------


class CategoryOut(ORM):
    id: int
    slug: str
    name: str
    description: str
    image_url: str | None
    parent_id: int | None
    children: list["CategoryOut"] = []


class ImageOut(ORM):
    id: int
    url: str
    alt: str
    color: str | None


class VariantOut(ORM):
    id: int
    sku: str
    size: str | None
    color: str | None
    color_hex: str | None
    quality: str | None
    price: int
    compare_at_price: int | None
    stock: int


class ProductCard(BaseModel):
    id: int
    slug: str
    name: str
    category: str
    badge: str | None
    price: int
    compare_at_price: int | None
    rating_avg: float
    rating_count: int
    image: str | None
    colors: list[str]  # hex swatches
    in_stock: bool


class ProductDetail(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    material_care: str
    badge: str | None
    category: CategoryOut
    breadcrumbs: list[CategoryOut]
    rating_avg: float
    rating_count: int
    rating_breakdown: dict[int, int]
    images: list[ImageOut]
    variants: list[VariantOut]
    options: dict[str, list[str]]  # {"size": [...], "color": [...], "quality": [...]}


class Facets(BaseModel):
    sizes: list[str]
    colors: list[dict[str, str]]
    qualities: list[str]
    price_min: int
    price_max: int


class ProductPage(BaseModel):
    items: list[ProductCard]
    total: int
    page: int
    page_size: int
    pages: int
    facets: Facets | None = None


# ---------- reviews ----------


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=2, max_length=120)
    body: str = Field(min_length=5, max_length=3000)


class ReviewOut(BaseModel):
    id: int
    rating: int
    title: str
    body: str
    author: str
    city: str | None
    variant_label: str | None
    verified: bool
    helpful_count: int
    created_at: datetime
    product_slug: str | None = None
    product_name: str | None = None
    is_published: bool | None = None


class ReviewPage(BaseModel):
    items: list[ReviewOut]
    total: int
    page: int
    pages: int


# ---------- cart / orders ----------


class CartLineIn(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=20)


class QuoteIn(BaseModel):
    items: list[CartLineIn] = Field(min_length=1, max_length=50)
    coupon: str | None = None


class QuoteLine(BaseModel):
    variant_id: int
    product_id: int
    product_slug: str
    product_name: str
    variant_label: str
    sku: str
    image: str | None
    unit_price: int
    compare_at_price: int | None
    quantity: int
    line_total: int
    stock: int
    available: bool


class QuoteOut(BaseModel):
    lines: list[QuoteLine]
    subtotal: int
    delivery_fee: int
    discount: int
    total: int
    coupon: str | None
    coupon_error: str | None
    free_delivery_threshold: int


class CheckoutIn(QuoteIn):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=PK_PHONE)
    email: EmailStr | None = None
    city: str = Field(min_length=2, max_length=80)
    area: str = Field(default="", max_length=120)
    address: str = Field(min_length=5, max_length=500)
    note: str = Field(default="", max_length=500)
    payment_method: Literal["cod"] = "cod"
    save_address: bool = False

    @field_validator("email", mode="before")
    @classmethod
    def blank_email_is_none(cls, v: str | None) -> str | None:
        return v or None


class OrderItemOut(ORM):
    variant_id: int | None
    product_name: str
    product_slug: str
    variant_label: str
    sku: str
    image_url: str | None
    unit_price: int
    quantity: int


class CancelOrderIn(BaseModel):
    reason: str = Field(default="", max_length=200)
    phone: str | None = Field(default=None, max_length=20)  # guests prove the order is theirs with the checkout phone


class OrderEventOut(ORM):
    status: OrderStatus
    note: str
    created_at: datetime


class OrderOut(ORM):
    number: str
    status: OrderStatus
    payment_method: str
    subtotal: int
    delivery_fee: int
    discount: int
    total: int
    coupon_code: str | None
    name: str
    phone: str
    email: str | None
    city: str
    area: str
    address: str
    note: str
    courier: str | None
    tracking_number: str | None
    created_at: datetime
    items: list[OrderItemOut]
    events: list[OrderEventOut]


class OrderSummary(ORM):
    number: str
    status: OrderStatus
    total: int
    created_at: datetime
    item_count: int
    city: str
    name: str
    phone: str


# ---------- admin ----------


class AdminVariantIn(BaseModel):
    id: int | None = None
    sku: str = Field(min_length=2, max_length=60)
    size: str | None = None
    color: str | None = None
    color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    quality: str | None = None
    price: int = Field(gt=0)
    compare_at_price: int | None = Field(default=None, gt=0)
    stock: int = Field(ge=0)


class AdminImageIn(BaseModel):
    url: str
    alt: str = ""
    color: str | None = None


class AdminProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    category_id: int
    description: str = ""
    material_care: str = ""
    badge: str | None = None
    is_active: bool = True
    is_featured: bool = False
    variants: list[AdminVariantIn] = Field(min_length=1)
    images: list[AdminImageIn] = []


class AdminProductOut(ProductDetail):
    is_active: bool
    is_featured: bool
    category_id: int


class AdminProductRow(BaseModel):
    id: int
    slug: str
    name: str
    category: str
    category_id: int
    image: str | None
    price: int
    badge: str | None
    is_active: bool
    is_featured: bool
    total_stock: int
    variant_count: int
    low_stock_variants: int
    rating_avg: float
    rating_count: int
    created_at: datetime


class AdminProductCounts(BaseModel):
    all: int
    active: int
    hidden: int
    out_of_stock: int


class AdminProductList(BaseModel):
    items: list[AdminProductRow]
    total: int
    page: int
    pages: int
    counts: AdminProductCounts


class ProductFlagsIn(BaseModel):
    is_active: bool | None = None
    is_featured: bool | None = None


class BulkProductsIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=200)
    action: Literal["show", "hide", "feature", "unfeature"]


class InventoryRow(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    product_active: bool
    image: str | None
    sku: str
    label: str
    price: int
    stock: int


class InventoryPage(BaseModel):
    items: list[InventoryRow]
    total: int
    page: int
    pages: int
    low_threshold: int


class StockItem(BaseModel):
    id: int
    stock: int = Field(ge=0, le=100_000)


class StockUpdateIn(BaseModel):
    items: list[StockItem] = Field(min_length=1, max_length=500)


class CategoryOrderIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=200)


class AdminCategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    description: str = ""
    image_url: str | None = None
    parent_id: int | None = None
    sort_order: int = 0
    is_active: bool = True


class OrderStatusIn(BaseModel):
    status: OrderStatus
    note: str = ""
    courier: str | None = None
    tracking_number: str | None = None


class CouponIn(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    kind: Literal["percent", "fixed"]
    value: int = Field(gt=0)
    min_subtotal: int = Field(default=0, ge=0)
    is_active: bool = True
    expires_at: datetime | None = None


class CouponOut(ORM, CouponIn):
    id: int


class Stats(BaseModel):
    orders_today: int
    orders_yesterday: int
    pending_orders: int
    revenue_month: int
    low_stock_variants: int
    customers: int
    pending_reviews: int
    unread_messages: int = 0
