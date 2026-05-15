FROM node:22-alpine AS builder

ARG DIRECT_URL
ENV DIRECT_URL=$DIRECT_URL

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

RUN npx prisma generate

COPY . .

RUN npm run build


FROM node:22-alpine AS production

ARG DIRECT_URL
ENV DIRECT_URL=$DIRECT_URL

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --omit=dev

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main"]
