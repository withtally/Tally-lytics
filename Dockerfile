# Use official Bun image
FROM oven/bun:1-alpine AS base

# Install dependencies for PostgreSQL client and other tools
RUN apk add --no-cache postgresql-client git bash curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs

# Expose application port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run health-check || exit 1

# Default command
CMD ["bun", "start"]