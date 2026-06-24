FROM node:22-alpine AS builder

WORKDIR /app
ARG DATABASE_URL=file:/app/data/prod.db
ARG ADMIN_API_SECRET=foliart-admin-api-secret-2026
ENV DATABASE_URL=${DATABASE_URL}
ENV ADMIN_API_SECRET=${ADMIN_API_SECRET}
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
ARG DATABASE_URL=file:/app/data/prod.db
ARG ADMIN_API_SECRET=foliart-admin-api-secret-2026
ENV DATABASE_URL=${DATABASE_URL}
ENV ADMIN_API_SECRET=${ADMIN_API_SECRET}
COPY package*.json prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dev.db ./dev.db
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/images ./images
COPY prisma ./prisma

EXPOSE 5000

CMD npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js
