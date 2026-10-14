# Production Multi-Stage Dockerfile for Plan a Trip in 2 Minutes
FROM node:20-alpine AS runner

WORKDIR /app

# Install build dependencies for native sqlite3 compiling
RUN apk add --no-cache python3 make g++ sqlite

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Ensure data directory exists with write permissions
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/trip_game.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
