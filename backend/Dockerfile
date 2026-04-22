FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json prisma.config.ts ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package*.json prisma.config.ts ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/images ./images
COPY prisma ./prisma
RUN npm run prisma:generate

EXPOSE 5000

CMD npx prisma migrate deploy && node dist/src/main.js
