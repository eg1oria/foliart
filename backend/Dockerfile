FROM node:22-alpine AS builder

WORKDIR /app
ENV DATABASE_URL=file:/tmp/build.db
COPY package*.json prisma.config.ts ./
RUN npm ci \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build

# Migrations run from their own image so the Prisma CLI — and the sizeable
# dependency tree it drags in — can stay a devDependency and never reach the
# runtime image. Compose runs this to completion before starting `backend`.
FROM node:22-alpine AS migrator

WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data \
    && chown node:node /app/data \
    && chmod 0755 /usr/local/bin/docker-entrypoint.sh

USER node

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM builder AS pruned

# `prisma` is a devDependency, but @prisma/client declares it as an optional
# peer, so npm reinstalls it into a production tree anyway. Drop it explicitly —
# the server only ever imports @prisma/client and the libSQL adapter.
RUN npm prune --omit=dev --ignore-scripts \
    && rm -rf node_modules/prisma node_modules/@prisma/dev node_modules/.bin/prisma

FROM node:22-alpine AS runtime

WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY --from=pruned /app/node_modules ./node_modules
COPY --from=builder /app/dev.db ./dev.db
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/images ./bundled-images
COPY prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data /app/images \
    && chown node:node /app/data /app/images \
    && chmod 0755 /usr/local/bin/docker-entrypoint.sh

USER node

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
