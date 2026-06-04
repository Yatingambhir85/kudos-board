# Stage 1: Install Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Final Production Runtime
FROM node:20-alpine
WORKDIR /app

# Copy dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY server.js package*.json ./

EXPOSE 5000

CMD ["node", "server.js"]
