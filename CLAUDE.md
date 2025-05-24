# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tally-lytics** is a DAO governance analysis tool that crawls forum data, evaluates content with LLMs, and provides semantic search across governance discussions. Built with Bun.js backend and Next.js frontend.

## Common Commands

### Development Setup

```bash
# Install dependencies and setup database
bun install && bun run:dev

# Start both backend + frontend
./start-app.sh local    # Local backend
./start-app.sh prod     # Production backend

# Backend only (port 3004)
bun start

# Frontend only (port 3000)
cd frontend/dao-helper-frontened && npm run dev
```

### Database Management

```bash
# Run migrations
bun migrate

# Reset database (destructive)
bun run:dev:reset

# Check data status
bun scripts/check-posts.ts
bun scripts/check-evaluations.ts
```

### Code Quality

```bash
# Format and lint
bun format && bun lint

# Check without fixing
bun format:check && bun lint:check
```

### Data Processing

```bash
# Process recent posts for a forum
bun admin/processRecentPosts.ts FORUM_NAME [BATCH_SIZE] [MAX_BATCHES]

# Historical crawling
bun admin/historicalCrawler.ts FORUM_NAME
```

## Architecture

### Tech Stack

- **Backend:** Bun.js + Hono.js + PostgreSQL/pgvector + OpenAI
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS
- **Deployment:** Railway.app with native cron

### Core Services Architecture

```
services/
├── crawling/           # Forum data collection
├── llm/               # OpenAI integration & content evaluation
│   ├── embeddings/    # Vector generation and search
│   └── *Evaluation*   # Content quality scoring
├── search/            # Vector similarity search
├── cron/              # Scheduled job management
└── server/            # HTTP route handlers
```

### Data Flow

1. **Crawlers** collect forum posts/topics via APIs
2. **LLM Services** evaluate content quality and generate embeddings
3. **Vector Database** stores 1536-dim embeddings for semantic search
4. **Materialized Views** provide pre-computed analytics
5. **Frontend** displays search results and management interfaces

### Database Structure

- **Content Tables:** `topics`, `posts`, `users` with metadata
- **Vector Tables:** `topic_vectors`, `post_vectors` (pgvector)
- **Evaluation Tables:** LLM quality scores and summaries
- **Analytics:** Materialized views for dashboards

## Environment Requirements

### Database Setup

Requires PostgreSQL with pgvector extension and superuser access for initial setup.

### API Keys

- `OPENAI_API_KEY` - Required for LLM evaluations and embeddings
- `{FORUM}_API_KEY` - Per-forum API access (Arbitrum, etc.)
- `COINGECKO_PRO_API_KEY` - Optional market data
- `NEWS_API_KEY` - Optional news integration

## Development Notes

### Forum Configuration

Forum configs in `config/forumConfig.ts` define:

- API endpoints and authentication
- Content evaluation prompts
- Crawling parameters

### Vector Search Implementation

Uses pgvector with cosine similarity. Search combines vector similarity with metadata filtering for hybrid results.

### LLM Integration Pattern

All LLM calls use retry logic in `callLLMWithRetry.ts`. Content evaluation follows structured schema in `schema.ts`.

### Cron Job System

Railway-native cron triggers `/cron` endpoints. Job tracking in `cron_job_history` table with status monitoring.

## Testing & Quality

Always run linting after making changes:

```bash
bun lint && bun format:check
```

Database changes require migrations in `/db/migrations/` following the `YYYYMMDDHHMMSS_description.cjs` pattern.
