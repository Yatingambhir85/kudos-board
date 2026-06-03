# Stage 1: Build/Install
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production Runtime
FROM node:20-alpine
RUN apk add --no-cache dumb-init curl
WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY server.js package*.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
