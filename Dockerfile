# Bismillah Ar-Rahman Ar-Roheem
# Audioly - Multi-stage Docker build for PaaS deployment
# Serves web export + mobile build downloads

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --omit=dev 2>/dev/null || npm install --legacy-peer-deps

COPY . .
RUN npx expo export --platform web --output-dir dist/web

FROM node:20-alpine AS server

WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/dist/web ./public
COPY server.js ./server.js
COPY package.json ./package.json

RUN npm install express compression --no-save 2>/dev/null || true

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
