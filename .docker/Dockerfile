FROM node:22-alpine AS builder

WORKDIR /app

# --- Server Deps
COPY package*.json ./
RUN npm install -g npm@latest
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --no-audit --no-fund

# --- Install+Build Deps
WORKDIR /app/client
COPY client/package.json ./package.json
# purposefully NOT copying package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

# Force esbuild and rollup to match the target architecture and version
ARG TARGETARCH
RUN set -eux; \
    if [ "${TARGETARCH}" = "arm64" ]; then \
        npm install --prefer-offline --no-save "@esbuild/linux-arm64@0.25.9"; \
    elif [ "${TARGETARCH}" = "amd64" ]; then \
        npm install --prefer-offline --no-save "@esbuild/linux-x64@0.25.9"; \
    fi

# Verify the binary is working and version matches
RUN ./node_modules/.bin/esbuild --version

# --- Build Client
COPY client/ ./
RUN npm run build

# --- Final Files
WORKDIR /app
COPY . .
RUN mkdir -p ./public && mv ./client/dist/* ./public
# Clean up the client source code
RUN rm -rf ./client

# ---- Final Stage
FROM node:22-alpine

WORKDIR /app

# Copy app from build
COPY --from=builder /app /app

# runtime OS deps
RUN apk add --no-cache curl jq sqlite

ENV NODE_ENV=production

RUN mkdir -p /app/data /app/log \
    && chown -R node:node /app/data /app/log /app/public

USER node

EXPOSE 5005

CMD ["node", "server.js"]
