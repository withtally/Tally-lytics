# Railway Deployment Guide

## Required Environment Variables

The following environment variables MUST be set in Railway for the application to deploy and run successfully:

### Critical Variables (Required)
```bash
# OpenAI Configuration (REQUIRED - App won't start without these)
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORG_ID=your_openai_org_id

# Database Configuration (One of these is REQUIRED)
DATABASE_URL=postgresql://...  # Railway PostgreSQL URL (automatically set by Railway)
# OR
SUPABASE_CONNECTION_STRING=postgresql://...  # If using external Supabase database
```

### Optional Variables
```bash
# Cron Configuration
CRON_API_KEY=your_secure_cron_api_key
TOPICS_GENERATION_TIMEFRAME=14d

# External API Keys (optional features)
COINGECKO_PRO_API_KEY=your_coingecko_pro_api_key
NEWS_API_KEY=your_news_api_key
TALLY_API=your_tally_api_key

# Forum API Keys (add as needed)
ARBITRUM_API_KEY=your_arbitrum_api_key
ZKSYNC_API_KEY=your_zksync_api_key
CABIN_API_KEY=your_cabin_api_key
UNISWAP_API_KEY=your_uniswap_api_key
ENS_API_KEY=your_ens_api_key

# LLM Model Configuration (optional)
LLM_MODEL=gpt-4
LLM_MINI_MODEL=gpt-3.5-turbo
```

## Database Setup

### PostgreSQL Extensions Required
The application requires the following PostgreSQL extensions:
- `pgvector` - For vector similarity search (REQUIRED)
- `pg_cron` - For scheduled jobs (optional, currently disabled in migrations)

### Using Railway PostgreSQL
1. Add PostgreSQL plugin in Railway dashboard
2. Railway automatically sets `DATABASE_URL` environment variable
3. You may need to manually enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Using External Database (Supabase)
1. Set `SUPABASE_CONNECTION_STRING` instead of `DATABASE_URL`
2. Ensure pgvector extension is enabled in Supabase

## Deployment Process

1. **Push to GitHub**: Railway automatically deploys on push to main branch

2. **Build Process**:
   - Docker builds the application using `Dockerfile`
   - Dependencies are installed with `bun install --frozen-lockfile --production=false`
   - TypeScript compilation runs (non-blocking)
   - Logs directory is created with proper permissions

3. **Startup Process**:
   - Database migrations run automatically: `bun migrate`
   - Server starts on Railway-assigned PORT
   - Health checks begin at `/api/health`

4. **Health Monitoring**:
   - Health check endpoint: `/api/health`
   - Timeout: 5 seconds
   - Automatic restart on failure (max 3 retries)

## Troubleshooting

### Build Failures
- Check that all required environment variables are set
- Verify PostgreSQL connection string format
- Ensure pgvector extension is available

### Runtime Failures
- Check Railway logs for specific error messages
- Verify OPENAI_API_KEY and OPENAI_ORG_ID are set correctly
- Ensure database migrations completed successfully

### Common Issues
1. **"Missing OpenAI credentials"**: Set OPENAI_API_KEY and OPENAI_ORG_ID
2. **Database connection failed**: Check DATABASE_URL format and accessibility
3. **Port binding issues**: Railway automatically sets PORT, don't hardcode it
4. **Health check timeouts**: Database might be slow to connect initially

## Monitoring

- Railway dashboard shows deployment status and logs
- Health endpoint: `https://your-app.railway.app/api/health`
- Cron job history: `GET /api/cron/job-history`

## Production Checklist

- [ ] Set all required environment variables
- [ ] Verify PostgreSQL has pgvector extension
- [ ] Test database connection
- [ ] Confirm OpenAI API keys are valid
- [ ] Check health endpoint after deployment
- [ ] Monitor initial logs for any errors