FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Clean dev dependencies for smaller image
RUN npm prune --production

# Run as non-root user for security
RUN addgroup -g 1001 -S mcp && adduser -S mcp -u 1001
USER mcp

EXPOSE 3001

CMD ["node", "dist/index.js"]
