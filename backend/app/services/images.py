"""Image pipeline: resize once at upload into fixed widths (WebP), store on R2 or local disk.

A stored image is addressed by its base URL; the variants live at `{base}-{width}.webp`.
The frontend picks the width it needs, so customers never download an original.
"""

import asyncio
import io
import secrets
from pathlib import Path

from PIL import Image, ImageOps

from app.core.config import settings

WIDTHS = (320, 640, 1080)
MAX_UPLOAD_BYTES = 12 * 1024 * 1024


def _render(data: bytes) -> dict[int, bytes]:
    with Image.open(io.BytesIO(data)) as src:
        img = ImageOps.exif_transpose(src).convert("RGB")
        out: dict[int, bytes] = {}
        for width in WIDTHS:
            copy = img.copy()
            if copy.width > width:
                copy.thumbnail((width, width * 4), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            copy.save(buf, "WEBP", quality=78, method=5)
            out[width] = buf.getvalue()
        return out


def _r2_client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def _store(key: str, variants: dict[int, bytes]) -> str:
    if settings.r2_enabled:
        client = _r2_client()
        for width, body in variants.items():
            client.put_object(
                Bucket=settings.r2_bucket,
                Key=f"{key}-{width}.webp",
                Body=body,
                ContentType="image/webp",
                CacheControl="public, max-age=31536000, immutable",
            )
        return f"{settings.r2_public_base_url.rstrip('/')}/{key}"
    root = Path(settings.media_dir)
    for width, body in variants.items():
        path = root / f"{key}-{width}.webp"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
    return f"{settings.media_base_url.rstrip('/')}/{key}"


async def save_image(data: bytes, folder: str = "products") -> str:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("Image is larger than 12 MB")
    key = f"{folder}/{secrets.token_hex(8)}"
    variants = await asyncio.to_thread(_render, data)
    return await asyncio.to_thread(_store, key, variants)
