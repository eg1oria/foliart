FROM node:22-alpine AS builder

WORKDIR /app
ARG DATABASE_URL=file:/app/data/prod.db
ARG ADMIN_API_SECRET=foliart-admin-api-secret-2026
ENV DATABASE_URL=${DATABASE_URL}
ENV ADMIN_API_SECRET=${ADMIN_API_SECRET}
COPY package*.json prisma.config.ts ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ARG DATABASE_URL=file:/app/data/prod.db
ARG ADMIN_API_SECRET=foliart-admin-api-secret-2026
ENV DATABASE_URL=${DATABASE_URL}
ENV ADMIN_API_SECRET=${ADMIN_API_SECRET}
COPY package*.json prisma.config.ts ./
RUN npm ci --omit=dev
COPY --from=builder /app/dev.db ./dev.db
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/images ./images
COPY prisma ./prisma
RUN npm run prisma:generate

EXPOSE 5000

CMD npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js
