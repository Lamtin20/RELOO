FROM node:22-bookworm-slim
WORKDIR /worker
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --fetch-retries=5 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000
COPY lib ./lib
COPY scripts/operations-worker.mjs ./scripts/operations-worker.mjs
COPY scripts/sync-affiliate-catalog.mjs scripts/collect-prices.mjs ./scripts/
COPY scripts/sync-sepay.mjs ./scripts/
COPY scripts/news-autopilot.mjs ./scripts/
ENV HOME=/tmp
USER 1000:1000
CMD ["nice", "-n", "10", "node", "scripts/operations-worker.mjs"]
