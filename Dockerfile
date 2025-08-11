# Use official Bun image
FROM oven/bun:1-alpine AS base

# Install dependencies for PostgreSQL client and other tools
RUN apk add --no-cache postgresql-client git bash curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
# Copy lockfile if it exists (Railway might not have it)
COPY bun.lockb ./

# Install all dependencies
RUN bun install

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && chmod -R 755 /app/logs

# Expose application port (Railway sets PORT env var)
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run health-check || exit 1

# Default command
CMD ["bun", "start"]