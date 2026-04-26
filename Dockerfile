FROM oven/bun:1-slim

# Node.js binary for `next dev` only — Bun + Turbopack mis-resolves
# hashed external module names (vercel/next.js#86866). Bun still drives
# installs, tests, seeds, and Prisma CLI.
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN bun install

COPY prisma ./prisma/
RUN bunx prisma generate

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]
