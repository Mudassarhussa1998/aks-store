FROM node:24-alpine

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
EXPOSE 3000

# Pages are pre-rendered from the catalog, so the build needs the API. It runs on first start (once the API is
# healthy) and is kept for later restarts of the same container. `docker compose up --build` makes a fresh one.
CMD ["sh", "-c", "[ -f .next/BUILD_ID ] || npm run build && exec npm start"]
