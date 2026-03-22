FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose API port
EXPOSE 5000

# Default: start API server
CMD ["node", "server.js"]
