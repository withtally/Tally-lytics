# Use official Bun image
FROM oven/bun:1-alpine AS base

# Install dependencies for PostgreSQL client and other tools
RUN apk add --no-cache postgresql-client git bash curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install all dependencies including optional ones for build
RUN bun install --frozen-lockfile --production=false

# Copy application code
COPY . .

# Build the application (TypeScript type checking - non-blocking)
RUN bun run typecheck

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && chmod -R 755 /app/logs

# Expose application port (Railway sets PORT env var)
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run health-check || exit 1

# Default command
CMD ["bun", "start"]