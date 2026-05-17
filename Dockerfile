# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Leave empty so the web client uses same-origin /v1/* (works with any public URL).
ARG EXPO_PUBLIC_API_BASE_URL=
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}

ARG EXPO_PUBLIC_API_PROXY_TARGET=https://test.dhhcloud.io.vn
ENV EXPO_PUBLIC_API_PROXY_TARGET=${EXPO_PUBLIC_API_PROXY_TARGET}

RUN npx expo export -p web

FROM node:20-alpine AS runner

WORKDIR /app

COPY docker/server.package.json ./package.json
RUN npm install --omit=dev

COPY server.js ./
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]