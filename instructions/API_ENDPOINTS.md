# Tally-lytics API Documentation

This document provides a comprehensive list of all API endpoints available in the Tally-lytics application, organized by functional areas.

## Table of Contents

- [Data Collection & Ingestion](#data-collection--ingestion)
  - [Forum Crawling](#forum-crawling)
  - [Market Data Collection](#market-data-collection)
  - [News Collection](#news-collection)
- [Search & Content Retrieval](#search--content-retrieval)
  - [Search](#search)
  - [RSS Feed](#rss-feed)
- [Analytics & Insights](#analytics--insights)
  - [Common Topics](#common-topics)
  - [AI-Assisted Analysis](#ai-assisted-analysis)
- [System Management](#system-management)
  - [Health & Monitoring](#health--monitoring)
  - [Cron & Scheduling](#cron--scheduling)

## Data Collection & Ingestion

### Forum Crawling

#### Get All Crawler Statuses
```
GET /api/crawl/status
```

**Purpose:** Returns the status of all forum crawlers

**Parameters:** None

**Returns:**
- `statuses`: Array of crawler status objects
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "statuses": [
    {
      "forumName": "forum1",
      "status": "idle"
    },
    {
      "forumName": "forum2",
      "status": "running"
    }
  ],
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Get Status for Specific Forum
```
GET /api/crawl/status/:forumName
```

**Purpose:** Returns the status of a specific forum crawler

**Parameters:**
- `forumName` (path): Name of the forum

**Returns:**
- `status`: Crawler status object
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "status": {
    "forumName": "forum1",
    "status": "running",
    "startedAt": "2025-03-13T17:57:19.000Z"
  },
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Start All Crawls
```
POST /api/crawl/start/all
```

**Purpose:** Initiates crawls for all configured forums

**Parameters:** None

**Returns:**
- `success`: Boolean indicating if crawl was initiated
- `message`: Status message
- `forums`: Array of forum names
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "success": true,
  "message": "Crawls initiated for all forums",
  "forums": ["forum1", "forum2", "forum3"],
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Start Crawl for Specific Forum
```
POST /api/crawl/start/:forumName
```

**Purpose:** Initiates a crawl for a specific forum

**Parameters:**
- `forumName` (path): Name of the forum to crawl

**Returns:**
- `message`: Status message
- `status`: Crawler status object
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "Crawl started successfully",
  "status": {
    "forumName": "forum1",
    "status": "running",
    "startedAt": "2025-03-13T18:57:19.000Z"
  },
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Stop Crawl for Specific Forum
```
POST /api/crawl/stop/:forumName
```

**Purpose:** Stops a running crawl for a specific forum

**Parameters:**
- `forumName` (path): Name of the forum

**Returns:**
- `message`: Status message
- `status`: Updated crawler status object
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "Crawl stopped successfully",
  "status": {
    "forumName": "forum1",
    "status": "stopped",
    "stoppedAt": "2025-03-13T18:57:19.000Z"
  },
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

### Market Data Collection

#### Get Market Cap Data
```
GET /api/marketcap/:forumName
```

**Purpose:** Returns market cap data for a specific forum's token

**Parameters:**
- `forumName` (path): Name of the forum

**Returns:**
- `data`: Array of market cap data points
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "data": [
    {
      "forum_name": "forum1",
      "price": 10.5,
      "market_cap": 1000000,
      "volume_24h": 50000,
      "timestamp": "2025-03-13T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Trigger Market Cap Crawl
```
POST /api/marketcap/crawl
```

**Purpose:** Initiates a crawl for token market data

**Parameters:** None

**Returns:**
- `message`: Status message
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "Market cap crawl initiated",
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

### News Collection

#### Get News Articles
```
GET /api/news/:forumName
```

**Purpose:** Returns news articles for a specific forum

**Parameters:**
- `forumName` (path): Name of the forum

**Returns:**
- `data`: Array of news articles
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "data": [
    {
      "id": 123,
      "forum_name": "forum1",
      "title": "Example News Article",
      "url": "https://example.com/article",
      "published_at": "2025-03-13T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Trigger News Crawl
```
POST /api/news/crawl
```

**Purpose:** Initiates a crawl for news articles and evaluations

**Parameters:** None

**Returns:**
- `message`: Status message
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "News crawl initiated",
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

## Search & Content Retrieval

### Search

#### Search By Type
```
POST /api/searchByType
```

**Purpose:** Searches for content of a specific type

**Parameters (JSON body):**
- `query`: Search query string
- `type`: Content type (e.g., "topic", "post", "snapshot", "tally")
- `forum`: Forum name
- `limit` (optional): Maximum number of results
- `threshold` (optional): Similarity threshold (0.0-1.0)

**Returns:**
- `results`: Array of search results
- `metadata`: Object containing search metadata

**Example Response:**
```json
{
  "results": [
    {
      "id": 123,
      "title": "Example Topic",
      "content": "Example content...",
      "similarity": 0.92
    }
  ],
  "metadata": {
    "query": "example search",
    "type": "topic",
    "forum": "forum1",
    "total": 1,
    "timestamp": "2025-03-13T18:57:19.000Z"
  }
}
```

#### Search All Types
```
POST /api/searchAll
```

**Purpose:** Searches across all content types

**Parameters (JSON body):**
- `query`: Search query string
- `forum`: Forum name
- `limit` (optional): Maximum number of results (default: 10)
- `threshold` (optional): Similarity threshold (default: 0.7)

**Returns:**
- `topics`: Array of topic results
- `posts`: Array of post results
- `snapshot`: Array of snapshot results
- `tally`: Array of tally results
- `metadata`: Object containing search metadata

**Example Response:**
```json
{
  "topics": [...],
  "posts": [...],
  "snapshot": [...],
  "tally": [...],
  "metadata": {
    "query": "example search",
    "forum": "forum1",
    "threshold": 0.7,
    "timestamp": "2025-03-13T18:57:19.000Z",
    "counts": {
      "topics": 5,
      "posts": 10,
      "snapshot": 2,
      "tally": 1
    }
  }
}
```

### RSS Feed

#### Get RSS Feed
```
GET /rss
```

**Purpose:** Returns an RSS feed of content (implementation details may vary)

**Parameters:** None

**Returns:**
- RSS feed content

## Analytics & Insights

### Common Topics

#### Get Common Topics (Minimal Data)
```
GET /api/common-topics
```

**Purpose:** Returns a list of common topics with minimal data

**Parameters (query):**
- `forums` (optional): Comma-separated list of forum names

**Returns:**
- `topics`: Array of common topics with minimal data

**Example Response:**
```json
{
  "topics": [
    {
      "id": 1,
      "name": "Governance",
      "base_metadata": {...},
      "forum_name": "forum1"
    }
  ]
}
```

#### Get Full Common Topics
```
GET /api/common-topics/full
```

**Purpose:** Returns full details of common topics

**Parameters (query):**
- `forums` (optional): Comma-separated list of forum names

**Returns:**
- `topics`: Array of common topics with full details

#### Get Specific Topic
```
GET /api/common-topics/:id
```

**Purpose:** Returns details of a specific common topic

**Parameters:**
- `id` (path): Topic ID

**Returns:**
- Topic details

#### Generate Common Topics
```
POST /api/common-topics/generate/:forumName
```

**Purpose:** Generates common topics for a specific forum

**Parameters:**
- `forumName` (path): Name of the forum

**Returns:**
- Status of the generation process

#### Generate All Common Topics
```
POST /api/common-topics/generate-all
```

**Purpose:** Generates common topics for all forums

**Parameters:** None

**Returns:**
- Status of the generation process

### AI-Assisted Analysis

#### Chat Endpoint
```
POST /api/chat
```

**Purpose:** Processes chat messages and returns AI responses

**Parameters (JSON body):**
- Chat request payload (varies based on implementation)

**Returns:**
- Chat response

#### Generate Similar Query
```
POST /api/generateSimile
```

**Purpose:** Generates a similar search query using AI

**Parameters (JSON body):**
- `query`: Original search query
- `forum` (optional): Forum name for context

**Returns:**
- `similarQuery`: Generated similar query
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "similarQuery": "example similar query",
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Generate Follow-Up Questions
```
POST /api/generateFollowUp
```

**Purpose:** Generates AI-powered follow-up questions for a search query

**Parameters (JSON body):**
- `query`: Original search query
- `forum` (optional): Forum name for context
- `context` (optional): Additional context

**Returns:**
- `suggestions`: Array of follow-up question suggestions
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "suggestions": [
    "What are the benefits of this approach?",
    "How does this compare to alternative methods?"
  ],
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

## System Management

### Health & Monitoring

#### Get System Health
```
GET /api/health
```

**Purpose:** Returns the health status of the system and its components

**Parameters:** None

**Returns:**
- `status`: Overall system status
- `timestamp`: ISO timestamp
- `services`: Status of individual services

**Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-03-13T18:57:19.000Z",
  "services": {
    "crawler": {
      "status": "running",
      "activeJobs": [...]
    },
    "search": "running"
  }
}
```

#### Get Logs for Specific Forum
```
GET /api/logs/:forum
```

**Purpose:** Returns the log file for a specific forum's crawler

**Parameters:**
- `forum` (path): Name of the forum

**Returns:**
- Plain text log file

### Cron & Scheduling

#### Get Cron Job Status
```
GET /api/cron/status
```

**Purpose:** Returns the status of the cron job scheduler

**Parameters:** None

**Returns:**
- Status of the cron job
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "running": true,
  "schedule": "0 0 * * *",
  "lastRun": "2025-03-13T00:00:00.000Z",
  "nextRun": "2025-03-14T00:00:00.000Z",
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Start Cron Job
```
POST /api/cron/start
```

**Purpose:** Starts the scheduled crawl cron job

**Parameters (JSON body, optional):**
- `schedule`: Cron schedule expression (e.g., "0 0 * * *")

**Returns:**
- `message`: Status message
- `status`: Cron job status object
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "Cron job started successfully",
  "status": {
    "running": true,
    "schedule": "0 0 * * *",
    "startedAt": "2025-03-13T18:57:19.000Z"
  },
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```

#### Stop Cron Job
```
POST /api/cron/stop
```

**Purpose:** Stops the scheduled crawl cron job

**Parameters:** None

**Returns:**
- `message`: Status message
- `status`: Updated cron job status object
- `timestamp`: ISO timestamp

**Example Response:**
```json
{
  "message": "Cron job stopped successfully",
  "status": {
    "running": false,
    "schedule": "0 0 * * *",
    "stoppedAt": "2025-03-13T18:57:19.000Z"
  },
  "timestamp": "2025-03-13T18:57:19.000Z"
}
```
