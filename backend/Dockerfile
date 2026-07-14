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
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine

WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
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
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/src/main.js"]
