# Tally-lytics

A comprehensive tool for DAO governance analysis and management.

## Author
Dennison Bertram  
Email: dennison@tally.xyz

## License
MIT License

Copyright (c) 2024 Dennison Bertram

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Overview

This repository provides a comprehensive pipeline for analyzing DAO governance data. It integrates with multiple data sources including Discourse forums, Snapshot, Tally, and news APIs to provide a complete view of DAO activities and governance.

## Key Features

- **Forum Analysis:**
  - Fetch and analyze topics, posts, and user data from configured Discourse forums
  - Vector embeddings for semantic search using OpenAI's `text-embedding-ada-002`
  - LLM-powered content evaluation and quality scoring
  
- **Governance Analysis:**
  - Integration with Snapshot proposals
  - Integration with Tally governance data
  - Historical data processing and analysis

- **News & Market Data:**
  - Automated news collection and analysis for DAOs
  - Market cap tracking and analysis
  - News article evaluation using LLMs

- **Search & Analytics:**
  - Semantic search across all content types
  - Materialized views for analytics
  - Common topics identification and tracking
  - Real-time content evaluation

- **Management Interface:**
  - Web-based management dashboard
  - Real-time status monitoring
  - Crawl and job control
  - Log viewing and analysis

## Architecture Overview

1. **Data Ingestion:**
   - **Discourse Forums:** Uses API keys to fetch `latest.json`, topics, and posts
   - **Snapshot & Tally:** Uses GraphQL or REST APIs to fetch governance proposals
   - **News API:** Fetches and analyzes DAO-related news
   - **Market Data:** Tracks market cap and related metrics

2. **Database & Storage:**
   - **PostgreSQL with pgvector:** Stores all content with vector embeddings
   - **Knex Migrations:** Database schema management
   - **Materialized Views:** Pre-computed analytics and metrics

3. **AI & Analysis:**
   - **OpenAI Integration:** For embeddings and content evaluation
   - **LLM Processing:** Quality scoring, summarization, and analysis
   - **Vector Search:** Semantic similarity search across all content

4. **API & Interface:**
   - **REST API:** Comprehensive endpoints for all functionality
   - **Web Dashboard:** Management interface for all features
   - **Monitoring:** Real-time status and health checks

# Discourse Demo - Vectorized Forum Content Analysis

This repository provides a pipeline for crawling, processing, vectorizing, and analyzing Discourse forum data. It integrates with OpenAI for generating embeddings and evaluating post quality, as well as external data sources like Snapshot and Tally for proposal information. The code supports storing, searching, and analyzing content in a vector database, enabling advanced similarity searches and semantic analysis.

## Key Features

- **Forum Crawling:** Fetch topics, posts, and user data from configured Discourse forums.
- **Vector Embeddings:** Use OpenAI embeddings (`text-embedding-ada-002`) to vectorize textual content (topics, posts, proposals).
- **Semantic Search:** Perform similarity search using PostgreSQL + pgvector extension.
- **LLM Evaluations:** Evaluate topics and posts for quality, relevance, and other metrics using GPT-based models.
- **External Integrations:**
  - **Snapshot Proposals:** Fetch and evaluate Snapshot proposals.
  - **Tally Proposals:** Fetch, update, and evaluate Tally proposals.
- **Historical Processing:** Reprocess older or previously unevaluated content for updated evaluations and embeddings.
- **Materialized Views & Analytics:** Generate comprehensive materialized views for forum activity, user engagement, topic quality, etc.

## Architecture Overview

1. **Data Ingestion:**

   - **Discourse Forums:** Uses API keys to fetch `latest.json`, topics, and posts.
   - **Snapshot & Tally:** Uses GraphQL or REST APIs to fetch governance proposals and their metadata.

2. **Database & Storage:**

   - **PostgreSQL with pgvector:** Stores topics, posts, evaluations, vectors, proposals, and analytics tables.
   - **Knex Migrations:** Database schema managed via migration files in `/db/migrations`.

3. **Vectorization & Analysis:**

   - **Embeddings:** `services/llm/embeddings` generates embeddings and stores them in vector columns.
   - **LLM Evaluations:** `services/llm` folder handles OpenAI-based post and topic evaluations, summaries, and scoring.

4. **Search & API:**

   - **Hono-based server (`server.ts`):** Serves API endpoints for searching content (`/api/searchAll`, `/api/searchByType`) and managing crawls (`/api/crawl/*`), cron jobs, and health checks.
   - **Search Service:** `services/search/vectorSearchService.ts` provides semantic search capabilities over vector embeddings.

5. **Historical Processing:**
   - Scripts like `processRecentPosts.ts`, `historicalCrawler.ts`, and `historicalPostEvals.ts` reprocess old posts, topics, and proposals to generate updated evaluations and embeddings.

## Project Structure

- **`app.ts` / `server.ts`:** Entry points to the server application and crawler manager.
- **`db/`:** Database configuration (`knexfile.js`), migrations, and model definitions.
- **`services/crawling/`:** Logic to crawl Discourse forums and store data.
- **`services/llm/`:** LLM utilities (OpenAI client, evaluation prompts, embeddings).
- **`services/search/`:** Vector search logic and related services.
- **`config/`:** Forum configurations and logging settings.
- **`utils/`:** Utility functions for date formatting, request retries, token estimation, etc.
- **`demo/`:** Example scripts (`searchDemo.ts`, `testSearch.ts`, `debug.ts`) for debugging and demonstrating functionality.

## Prerequisites

- **Node.js & Bun:** The server and scripts may use Bun as the runtime. Ensure `bun` is installed.
- **PostgreSQL with pgvector:** Database must have `pgvector` extension enabled.
- **OpenAI API Key:** Set `OPENAI_API_KEY` and `OPENAI_ORG_ID` environment variables.
- **Forum API Keys:** For each configured forum in `forumConfig.ts`, set the necessary `API_KEY`, `API_USERNAME`, and `DISCOURSE_URL`.
- **Snapshot & Tally Credentials:** If using Snapshot or Tally integrations, set corresponding keys in `.env`.

## Environment Setup

1. **Install Dependencies:**
   ```bash
   bun install
   ```

2. **Configure Environment:**
   Create a `.env` file with at least:

   ```env
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_ORG_ID=your-openai-org-id
   DISCOURSE_URL=https://your-forum.discourse.example
   API_KEY=your-discourse-api-key
   API_USERNAME=your-discourse-api-username
   SUPABASE_CONNECTION_STRING=your-postgres-connection-string
   ```

   Also set forum-specific env vars as required in `forumConfig.ts`.

3. **Database Migrations:**
   Run migrations to set up tables:

   ```bash
   bun run knex migrate:latest
   ```

4. **Enable pgvector:**
   Ensure `pgvector` extension is enabled. Example script:
   ```bash
   node enable_vector_supabase.js
   ```

## Running the Server

Start the server (Hono + Bun):

```bash
bun run server.ts
```

This will start the server on a specified port (default: 3000). Visit `http://localhost:3000/health` to check the health status.

## API Endpoints

- **Health Check:** `GET /health`
- **Search by Type:** `POST /api/searchByType`
  - **Request Body:**
    ```json
    {
      "query": "governance",
      "type": "post",
      "forum": "ARBITRUM",
      "limit": 50,
      "threshold": 0.5
    }
    ```
- **Search All Types:** `POST /api/searchAll`
  - **Request Body:**
    ```json
    {
      "query": "grant",
      "forum": "ZKSYNC",
      "limit": 10,
      "threshold": 0.7
    }
    ```

- **Common Topics:** 
  - `POST /api/common-topics/generate` - Generate common topics from recent forum posts
    - Parameters:
      - `forum` (required): The forum name to generate topics for
      - `timeframe` (optional): Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month'). Defaults to '14d'
  - `GET /api/common-topics` - Retrieve all generated common topics
  - `GET /api/common-topics/:id` - Retrieve a specific common topic by ID
  
  The common topics feature analyzes recent forum posts to identify and summarize frequently discussed themes and topics. This is useful for understanding the current focus of community discussions and trending subjects.

  Example response:
  ```json
  {
    "id": "123",
    "topic": "Governance Proposals",
    "summary": "Recent discussions about active governance proposals and voting mechanisms",
    "relevance_score": 0.85,
    "created_at": "2025-02-02T20:06:37.330Z"
  }
  ```

- **Crawl Management:**

  - `POST /api/crawl/start/:forumName` - Start crawling a specific forum.
  - `POST /api/crawl/stop/:forumName` - Stop an ongoing crawl.
  - `GET /api/crawl/status` - Get overall crawl statuses.
  - `GET /api/crawl/status/:forumName` - Get status of a specific forum crawl.

- **Cron Management:**
  - `POST /api/cron/start` - Start scheduled crawls.
  - `POST /api/cron/stop` - Stop scheduled crawls.
  - `GET /api/cron/status` - Check cron job status.

## Historical Processing & Utilities

- **Reprocessing Old Posts:** `processRecentPosts.ts` queries the database for unevaluated posts and uses LLM services to evaluate and store post quality metrics and embeddings.

  - Run:
    ```bash
    bun run processRecentPosts.ts FORUM_NAME [BATCH_SIZE] [MAX_BATCHES]
    ```

- **Historical Crawler:** `historicalCrawler.ts` fetches older topics and posts from the forum, vectorizes and evaluates them.
  - Run:
    ```bash
    bun run historicalCrawler.ts FORUM_NAME
    ```
- **Evaluating Old Post Batches:** `historicalPostEvals.ts` re-evaluates older posts in batches.

  - Run:
    ```bash
    bun run historicalPostEvals.ts [BATCH_SIZE=100] [MAX_BATCHES] [FORUM_NAME]
    ```

- **Cleanup Scripts:**

  - **cleanDatabase.ts:** Truncates all tables, useful for starting fresh.
    ```bash
    bun run cleanDatabase.ts
    ```

- **Reset Database:** `resetDatabase.ts` drops and recreates the public schema.

  - Use with caution:
    ```bash
    bun run resetDatabase.ts
    ```

- **Enable pgvector:** `enable_vector_supabase.js` ensures `vector` extension is available.
  - Run:
    ```bash
    node enable_vector_supabase.js
    ```

## Analytics & Materialized Views

Migrations create materialized views for:

- Forum activity trends
- User engagement metrics
- Topic quality analysis
- Community health scores
- Leaderboards

These views can be refreshed via `refresh_all_views()` function or scheduled with `pg_cron`.

## Development Notes

- **Linting & Formatting:** Uses ESLint and Prettier. Run `bun run lint` or `bun run prettier` to check code style.
- **Testing:** Add tests in `bun:test` compatible format. Some test files are present as examples (`_rssFeed.test.ts`).

## Troubleshooting

- **API Keys/Configuration:** Check `.env` and `forumConfig.ts` if unable to fetch forum data.
- **Database Issues:** Ensure migrations are up-to-date and pgvector is enabled.
- **OpenAI Errors (Rate Limits, Insufficient Quota):** LLM evaluations are wrapped with error handling. If insufficient credits, evaluations will skip.

## License

This project is provided as-is. Review and adjust for your own use.

## Contributing

Contributions are welcome! Please open issues or PRs for bug fixes and enhancements.

## Deployment

### Railway Deployment

The application is configured for deployment on Railway.app, which provides:
- Automatic deployments on git push
- PostgreSQL with pgvector support
- Environment variable management
- Health check monitoring
- Automatic restarts on failure

To deploy:

1. Create a Railway account and install the Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   railway init
   ```

4. Add PostgreSQL:
   - Go to Railway dashboard
   - Click "New"
   - Select "Database" → "PostgreSQL"
   - Enable pgvector extension in the PostgreSQL settings

5. Configure environment variables in Railway dashboard:
   - Copy all variables from your `.env` file
   - Update `DATABASE_URL` to use Railway's PostgreSQL connection string

6. Deploy:
   ```bash
   railway up
   ```

The deployment process is managed by:
- `railway.toml`: Configuration for build and deploy settings
- `Procfile`: Defines process types and commands
- `.dockerignore`: Optimizes Docker builds by excluding unnecessary files

The server includes a `/health` endpoint that Railway uses to monitor the application's status.

### Railway Cron Service Integration

This application uses Railway's native cron service for scheduled tasks, particularly for generating common topics. This approach offers several advantages over in-app cron jobs:

1. **Reliability**: Jobs run independently of the main application's state
2. **Resource Isolation**: Cron jobs don't consume resources from the main application
3. **Observability**: Logs for cron jobs are stored separately for easier debugging

#### Configuration

The cron jobs are configured in `railway.json`:

```json
{
  "version": 2,
  "cron": [
    {
      "schedule": "0 0 * * *",
      "command": "curl -X POST ${RAILWAY_PUBLIC_DOMAIN}/api/common-topics/generate-all -H 'Content-Type: application/json' -H 'X-API-Key: ${CRON_API_KEY}' -d '{\"timeframe\": \"${TOPICS_GENERATION_TIMEFRAME:-14d}\"}'",
      "timezone": "UTC"
    },
    {
      "schedule": "0 */4 * * *",
      "command": "curl -X GET ${RAILWAY_PUBLIC_DOMAIN}/api/health/topics-generation",
      "timezone": "UTC"
    }
  ]
}
```

#### Required Environment Variables

Set these environment variables in your Railway project:

- `CRON_API_KEY`: A secure API key for authenticating cron job requests
- `TOPICS_GENERATION_TIMEFRAME`: Time range for topic generation (default: '14d')

#### Monitoring Cron Jobs

The application provides endpoints to monitor cron job execution:

- `GET /api/cron/job-history`: View execution history of all jobs
  - Query parameters:
    - `job_name`: Filter by job name
    - `status`: Filter by status (running, success, failed)
    - `limit`: Number of records to return (default: 10)
    - `offset`: Number of records to skip (default: 0)

- `GET /api/health/topics-generation`: Check health status of topic generation jobs
  - Returns status: 'healthy', 'warning', 'critical', or 'never_run'
  - Includes information about the last successful run

#### Manual Execution

To manually trigger topic generation:

```bash
curl -X POST https://your-app-url.railway.app/api/cron/run-topic-generation \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-cron-api-key' \
  -d '{"timeframe": "7d"}'
```

```
