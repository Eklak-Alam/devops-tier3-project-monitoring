# --- Stage 1: Build ---
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Install ALL dependencies (needed for potential build scripts)
RUN npm ci

COPY . .

# --- Stage 2: Production ---
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install ONLY production dependencies (Saves huge space)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code (files from your project)
COPY . .

# Security: Run as non-root user
USER node

EXPOSE 5000

CMD ["node", "index.js"]