# Aks.pk

Clothing and home essentials store for Pakistan, with Cash on Delivery.

| Part | Tech | Where it runs |
|---|---|---|
| Storefront + admin panel | Next.js 16 (App Router, Cache Components), Tailwind 4 | Vercel |
| API | FastAPI, SQLAlchemy 2 (async), Alembic | AWS EC2 (Docker) |
| Database | PostgreSQL | same EC2 instance (move to RDS later) |
| Cache | Redis | same EC2 instance |
| Images | Resized at upload to 320/640/1080 px WebP | Cloudflare R2 + CDN |

```
frontend/   Next.js app: src/app/(shop) storefront, src/app/admin admin panel, src/components/* UI parts
backend/    FastAPI app: app/models.py, app/schemas.py, app/services/*, app/api/routes/*
deploy/     docker-compose for the API server (Caddy gives automatic HTTPS)
```

## How it stays fast

- Catalog pages (home, categories, products) are prerendered and cached with `"use cache"`, so most visits never reach the API.
- When an admin edits products or an order changes stock, the `catalog` cache tag is refreshed.
- The API caches catalog reads in Redis: about 1–2 ms when cached, around 70 ms uncached.
- Changing size, colour or quality only updates state in the browser. Prices, photos and stock change without a page reload.
- Product photos are resized once, at upload. `next/image` uses a custom loader to pick the smallest width that fits.

## Run locally

You need Postgres and Redis running locally, plus `uv` and Node 20+.

```bash
# API (http://localhost:8000, docs at /docs)
cd backend
cp .env.example .env            # set JWT_SECRET
createdb aks && createdb aks_test
uv run alembic upgrade head
uv run python seed.py           # sample catalog + admin from SEED_ADMIN_* in .env
uv run uvicorn app.main:app --reload

# Storefront (http://localhost:3000, admin at /admin)
cd frontend
cp .env.example .env.local
npm install && npm run dev
```

Tests: `cd backend && uv run pytest`.

## Deploy

1. **Images:**
   - In Cloudflare, create an R2 bucket.
   - Connect it to `img.<your-domain>`.
   - Create an API token, then put the R2 values in `deploy/.env`.
2. **API on AWS:**
   - Start an EC2 instance (t3.small is plenty to begin with) and install Docker.
   - Point `api.<your-domain>` at the instance.
   - Run `cd deploy && cp .env.example .env`, fill in the values, then run `docker compose up -d --build`.
   - Migrations run automatically on start.
3. **Storefront on Vercel:**
   - Import the repo with `frontend` as the root directory.
   - Set `API_URL=https://api.<your-domain>/api/v1` and `SITE_URL=https://<your-domain>`.
   - Add your domain.
4. **Email and SMS codes** (sign-up verification and password reset):
   - Email: create a free [Resend](https://resend.com) account, verify your domain, then set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `EMAIL_FROM` in `deploy/.env`.
   - SMS: set `SMS_PROVIDER=twilio` with your Twilio SID, token and sender. Until then, phone codes only appear in the API log, so leave phone verification optional.
5. **First run:**
   - Create your admin account: `docker compose exec api uv run --no-dev python create_admin.py`. It uses `SEED_ADMIN_*` from `deploy/.env`.
   - Sign in at `/admin` to add categories and products.
   - `seed.py` loads the sample catalog. Use it only on a test server.

## Phase 2

- Online payments (card, JazzCash, Easypaisa)
- WhatsApp/SMS order notifications
- AI shopping assistant: `pgvector` on the same Postgres
