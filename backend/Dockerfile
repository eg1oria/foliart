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
COPY --from=builder /app/images ./images
COPY prisma ./prisma

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
