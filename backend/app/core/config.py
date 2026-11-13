from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+asyncpg://localhost/aks"
    redis_url: str | None = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = ["http://localhost:3000"]

    # Delivery rules (PKR)
    free_delivery_threshold: int = 3000
    delivery_fee: int = 250

    # Image storage: Cloudflare R2 (S3 API). Falls back to local ./media when unset.
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    r2_public_base_url: str | None = None  # e.g. https://img.velenzay.com
    media_dir: str = "media"
    media_base_url: str = "http://localhost:8000/media"

    catalog_cache_seconds: int = 120

    # One-time codes (email/phone verification, password reset)
    otp_minutes: int = 10
    otp_max_attempts: int = 5
    otp_resend_seconds: int = 60
    otp_hourly_limit: int = 6

    # "console" prints codes to the server log (development). Set real providers in production.
    email_provider: str = "console"  # console | resend
    email_from: str = "Velenzay <no-reply@velenzay.com>"
    resend_api_key: str | None = None
    # SMS is optional. "off" (free): no phone codes; customers verify by email and the store confirms COD
    # orders by phone anyway. "http": any Pakistani bulk-SMS gateway with a GET/POST link (Veevo Tech,
    # SendPK, Branded SMS Pakistan...). In SMS_HTTP_URL, {to} is 923XXXXXXXXX and {text} the message.
    sms_provider: str = "console"  # console | off | http | twilio
    sms_http_url: str | None = None
    sms_http_method: str = "GET"  # GET puts {to}/{text} in the link; POST sends the link's query as form data
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from: str | None = None  # sender number or alphanumeric sender id
    # "Continue with Google": the OAuth client id from Google Cloud Console (the web app holds the secret).
    google_client_id: str | None = None
    # "Continue with Facebook": app id and secret from developers.facebook.com. The API swaps the login code
    # for the profile, so the secret lives only here. The redirect is SITE_URL + /auth/facebook/callback.
    facebook_app_id: str | None = None
    facebook_app_secret: str | None = None

    # Order updates: every status change is emailed; SMS (paid) only for these events.
    sms_order_events: list[str] = ["placed", "shipped"]
    site_url: str = "http://localhost:3000"
    store_email: str | None = None  # contact-form messages are emailed here (they're always saved for the admin inbox)  # used for links in emails and SMS

    @property
    def sms_enabled(self) -> bool:
        return self.sms_provider != "off"

    @property
    def r2_enabled(self) -> bool:
        return all([self.r2_account_id, self.r2_access_key_id, self.r2_secret_access_key, self.r2_bucket, self.r2_public_base_url])


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
