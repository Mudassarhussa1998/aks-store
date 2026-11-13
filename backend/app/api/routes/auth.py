from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import func, select

from app import schemas
from app.api.deps import DB, CurrentUser
from app.core import cache
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import OAuthAccount, Review, User
from app.services import catalog, facebook, google, notify, otp

router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_LIMIT, LOGIN_WINDOW = 10, 15 * 60  # failed sign-ins per email/phone per 15 minutes


def _token(user: User) -> schemas.TokenOut:
    return schemas.TokenOut(access_token=create_access_token(user.id, user.token_version), user=schemas.UserOut.model_validate(user))


async def _find(db: DB, identifier: str) -> User | None:
    """Look a user up by email address or Pakistani mobile number."""
    identifier = identifier.strip()
    if "@" in identifier:
        return await db.scalar(select(User).where(func.lower(User.email) == identifier.lower()))
    try:
        phone = schemas.normalize_pk_phone(identifier)
    except ValueError:
        return None
    return await db.scalar(select(User).where(User.phone == phone))


async def _ensure_free(db: DB, user_id: int | None, email: str | None = None, phone: str | None = None) -> None:
    if email and await db.scalar(select(User.id).where(func.lower(User.email) == email.lower(), User.id != user_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    if phone and await db.scalar(select(User.id).where(User.phone == phone, User.id != user_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This mobile number is already linked to another account.")


async def _send_code(db: DB, tasks: BackgroundTasks, user: User, purpose: str, channel: str) -> schemas.CodeSentOut:
    target = user.email if channel == "email" else user.phone
    if not target:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add a mobile number to your profile first.")
    code = await otp.issue(db, user, purpose, target)
    if channel == "email":
        tasks.add_task(notify.send_email, target, *notify.code_email(code, purpose))
        sent_to = otp.mask_email(target)
    else:
        tasks.add_task(notify.send_sms, target, notify.code_sms(code, purpose))
        sent_to = otp.mask_phone(target)
    return schemas.CodeSentOut(sent_to=sent_to, retry_after=settings.otp_resend_seconds)


# ---------- sign up / sign in ----------


@router.post("/register", response_model=schemas.TokenOut, status_code=201)
async def register(data: schemas.RegisterIn, db: DB, tasks: BackgroundTasks):
    email = data.email.lower()
    await _ensure_free(db, None, email, data.phone)
    user = User(name=data.name.strip(), email=email, phone=data.phone, password_hash=hash_password(data.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)  # load server defaults (created_at)
    await _send_code(db, tasks, user, otp.VERIFY_EMAIL, "email")
    return _token(user)


@router.post("/login", response_model=schemas.TokenOut)
async def login(data: schemas.LoginIn, db: DB):
    key = f"login-fail:{data.identifier.strip().lower()}"
    if await cache.count(key) >= LOGIN_LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many sign-in attempts. Please try again in 15 minutes.")
    user = await _find(db, data.identifier)
    if user is None or user.password_hash is None or not verify_password(data.password, user.password_hash):
        await cache.bump(key, LOGIN_WINDOW)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email, phone or password is incorrect.")
    await cache.reset(key)
    return _token(user)


async def _oauth_sign_in(db: DB, provider: str, subject: str, email: str, name: str | None) -> schemas.OAuthTokenOut:
    """Sign in (or up) with an account from another provider whose email address it has confirmed."""
    email = email.lower()
    is_new = False
    link = await db.scalar(select(OAuthAccount).where(OAuthAccount.provider == provider, OAuthAccount.subject == subject))
    if link is not None:
        user = await db.get(User, link.user_id)
    else:
        user = await db.scalar(select(User).where(func.lower(User.email) == email))
        if user is not None:
            if user.is_admin:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin accounts sign in with email and password.")
            if not user.email_verified:
                # The provider proves this person owns the inbox. A password set before the email was verified could
                # belong to someone else who registered with this address, so it is removed and old sessions end.
                user.password_hash = None
                user.token_version += 1
        else:
            user = User(name=(name or email.split("@")[0])[:120], email=email, password_hash=None)
            db.add(user)
            is_new = True
        await db.flush()
        db.add(OAuthAccount(user_id=user.id, provider=provider, subject=subject, email=email))
    if not user.email_verified:
        user.email_verified_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return schemas.OAuthTokenOut(**_token(user).model_dump(), is_new=is_new, needs_phone=user.phone is None)


@router.post("/oauth/google", response_model=schemas.OAuthTokenOut)
async def google_sign_in(data: schemas.GoogleSignInIn, db: DB):
    claims = await google.verify_id_token(data.id_token, data.nonce)
    return await _oauth_sign_in(db, "google", claims["sub"], claims["email"], claims.get("name"))


@router.post("/oauth/facebook", response_model=schemas.OAuthTokenOut)
async def facebook_sign_in(data: schemas.FacebookSignInIn, db: DB):
    profile = await facebook.profile_from_code(data.code)
    return await _oauth_sign_in(db, "facebook", profile["id"], profile["email"], profile.get("name"))


# ---------- profile ----------


@router.get("/me", response_model=schemas.UserOut)
async def me(user: CurrentUser):
    return user


@router.patch("/me", response_model=schemas.UserOut)
async def update_me(data: schemas.ProfileIn, user: CurrentUser, db: DB, tasks: BackgroundTasks):
    changes = data.model_dump(exclude_unset=True)
    if changes.get("name") is None:
        changes.pop("name", None)
    if "email" in changes:
        email = (changes.pop("email") or "").lower()
        if email and email != user.email:
            await _ensure_free(db, user.id, email=email)
            user.email, user.email_verified_at = email, None
    if "phone" in changes:
        phone = changes.pop("phone")
        if phone != user.phone:
            await _ensure_free(db, user.id, phone=phone)
            user.phone, user.phone_verified_at = phone, None
    for field, value in changes.items():
        setattr(user, field, value)
    db.add(user)
    await db.commit()
    return user


# ---------- email / phone verification ----------


@router.post("/verify/send", response_model=schemas.CodeSentOut)
async def send_verification(data: schemas.VerifySendIn, user: CurrentUser, db: DB, tasks: BackgroundTasks):
    if (user.email_verified if data.channel == "email" else user.phone_verified):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Your {'email' if data.channel == 'email' else 'mobile number'} is already verified.")
    if data.channel == "phone" and not settings.sms_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mobile number verification isn't available yet.")
    purpose = otp.VERIFY_EMAIL if data.channel == "email" else otp.VERIFY_PHONE
    return await _send_code(db, tasks, user, purpose, data.channel)


@router.post("/verify/confirm", response_model=schemas.UserOut)
async def confirm_verification(data: schemas.VerifyConfirmIn, user: CurrentUser, db: DB):
    purpose = otp.VERIFY_EMAIL if data.channel == "email" else otp.VERIFY_PHONE
    row = await otp.consume(db, user, purpose, data.code)
    current = user.email if data.channel == "email" else user.phone
    if row.target != current:  # the email/phone changed after the code was sent
        await db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code was sent to an old address. Please request a new one.")
    if data.channel == "email":
        user.email_verified_at = datetime.now(UTC)
    else:
        user.phone_verified_at = datetime.now(UTC)
    await db.commit()
    return user


# ---------- passwords ----------

FORGOT_SENT = "If an account matches, we've sent it a 6-digit code."


@router.post("/password/forgot", response_model=schemas.MessageOut, status_code=202)
async def forgot_password(data: schemas.ForgotPasswordIn, db: DB, tasks: BackgroundTasks):
    # Same reply whether or not the account exists, so this can't be used to discover who shops here.
    user = await _find(db, data.identifier)
    if user is None:
        return schemas.MessageOut(detail=FORGOT_SENT)
    by_phone = "@" not in data.identifier and settings.sms_enabled  # without SMS, the code goes to the account's email
    if by_phone and not user.phone_verified:
        return schemas.MessageOut(detail=FORGOT_SENT)  # codes only go to numbers the owner has proven
    try:
        await _send_code(db, tasks, user, otp.RESET_PASSWORD, "phone" if by_phone else "email")
    except HTTPException as exc:
        if exc.status_code != status.HTTP_429_TOO_MANY_REQUESTS:
            raise
    return schemas.MessageOut(detail=FORGOT_SENT)


@router.post("/password/reset", response_model=schemas.TokenOut)
async def reset_password(data: schemas.ResetPasswordIn, db: DB):
    user = await _find(db, data.identifier)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code has expired. Please request a new one.")
    row = await otp.consume(db, user, otp.RESET_PASSWORD, data.code)
    # Receiving the code proves the shopper owns that email or phone.
    now = datetime.now(UTC)
    if row.target == user.email and not user.email_verified:
        user.email_verified_at = now
    elif row.target == user.phone and not user.phone_verified:
        user.phone_verified_at = now
    user.password_hash = hash_password(data.password)
    user.token_version += 1
    await db.commit()
    await cache.reset(f"login-fail:{data.identifier.strip().lower()}")
    return _token(user)


@router.post("/password/change", response_model=schemas.TokenOut)
async def change_password(data: schemas.ChangePasswordIn, user: CurrentUser, db: DB):
    # Accounts made with Google have no password yet; they can set one without a current password.
    if user.password_hash is not None and not verify_password(data.current_password or "", user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is incorrect.")
    user.password_hash = hash_password(data.new_password)
    user.token_version += 1  # signs out other devices; this one gets the fresh token below
    await db.commit()
    return _token(user)


# ---------- account deletion ----------


@router.post("/delete-account", status_code=204)
async def delete_account(data: schemas.DeleteAccountIn, user: CurrentUser, db: DB):
    """Deletes the account with its addresses, wishlist, history and reviews.

    Past orders stay for the shop's records (delivery and accounting) but are no longer linked to the person's account.
    """
    if user.is_admin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admin accounts can't be deleted here. Ask another admin to remove your access first.")
    if user.password_hash is not None and not verify_password(data.password or "", user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your password is incorrect.")
    reviewed = (await db.scalars(select(Review.product_id).where(Review.user_id == user.id))).all()
    await db.delete(user)
    await db.flush()
    for product_id in set(reviewed):
        await catalog.refresh_product_stats(db, product_id)
    await db.commit()
    if reviewed:
        await cache.invalidate("product:*", "products:*")
