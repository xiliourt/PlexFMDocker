FROM node:18-alpine AS base
WORKDIR /app

FROM base AS builder
WORKDIR /app
COPY package.json package.json
RUN npm install
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
ENV NODE_ENV=production
ENV LAST_FM_API_KEY=UNSET
ENV LAST_FM_SHARED_SECRETY=UNSET
ENV LAST_FM_SESSION_KEY=UNSET
ENV WEBHOOK_API_KEY=UNSET

EXPOSE 3000

CMD ["node", "server.js"]
