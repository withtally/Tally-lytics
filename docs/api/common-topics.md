# Common Topics API Documentation

## Overview

The Common Topics API provides endpoints for generating and retrieving common discussion topics from DAO forums. This API uses LLM processing to analyze recent forum posts and identify frequently discussed themes and topics.

## Base URL

```
https://web-production-88af4.up.railway.app/api
```

## Endpoints

### Generate Common Topics

Analyzes recent forum posts to generate common topics for a specific forum.

```
POST /common-topics/generate
```

#### Request Body

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| forum     | string | Yes      | The forum identifier (e.g., "ARBITRUM", "UNISWAP") |
| timeframe | string | No       | Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month'). Defaults to '14d' |

#### Example Request

```bash
curl -X POST \
  'https://web-production-88af4.up.railway.app/api/common-topics/generate' \
  -H 'Content-Type: application/json' \
  -d '{
    "forum": "ARBITRUM",
    "timeframe": "7d"
  }'
```

#### Success Response

```json
{
  "status": "success",
  "message": "Common topics generation initiated",
  "data": {
    "forum": "ARBITRUM",
    "timeframe": "7d",
    "job_id": "ct_123456"
  }
}
```

#### Error Response

```json
{
  "error": "Invalid forum identifier",
  "code": "INVALID_FORUM",
  "details": {
    "valid_forums": ["ARBITRUM", "UNISWAP", "ENS", "COMPOUND"]
  }
}
```

### Retrieve Common Topics

Get all generated common topics, optionally filtered by forum.

```
GET /common-topics
```

#### Query Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| forum     | string  | No       | Filter topics by forum identifier |
| limit     | number  | No       | Maximum number of topics to return (default: 50) |
| offset    | number  | No       | Number of topics to skip (default: 0) |
| sort      | string  | No       | Sort order: 'recent' or 'relevance' (default: 'recent') |

#### Example Requests

Get all topics:
```bash
curl -X GET 'https://web-production-88af4.up.railway.app/api/common-topics'
```

Get topics for specific forum:
```bash
curl -X GET 'https://web-production-88af4.up.railway.app/api/common-topics?forum=ARBITRUM'
```

Get topics with pagination:
```bash
curl -X GET 'https://web-production-88af4.up.railway.app/api/common-topics?limit=10&offset=20'
```

#### Success Response

```json
{
  "status": "success",
  "data": {
    "topics": [
      {
        "id": "123",
        "forum": "ARBITRUM",
        "topic": "Treasury Management",
        "summary": "Discussions about managing and allocating DAO treasury funds",
        "relevance_score": 0.85,
        "post_count": 15,
        "created_at": "2024-02-11T20:06:37.330Z",
        "metadata": {
          "key_terms": ["treasury", "funds", "allocation"],
          "sentiment": "neutral",
          "urgency": "medium"
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 0,
      "has_more": true
    }
  }
}
```

#### Error Response

```json
{
  "error": "Invalid pagination parameters",
  "code": "INVALID_PARAMS",
  "details": {
    "limit": "Must be between 1 and 100",
    "offset": "Must be non-negative"
  }
}
```

### Get Specific Topic

Retrieve details about a specific common topic.

```
GET /common-topics/:id
```

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| id        | string | Yes      | The unique identifier of the topic |

#### Response Fields

| Field         | Type   | Description |
|---------------|--------|-------------|
| id            | string | Unique identifier for the topic |
| forum         | string | The forum where this topic was identified |
| topic         | string | The name/title of the topic |
| summary       | string | A brief description of the topic |
| relevance_score| number | How relevant/important this topic is (0-1) |
| post_count    | number | Number of posts related to this topic |
| created_at    | string | ISO timestamp when the topic was generated |
| metadata      | object | Additional metadata about the topic |
| related_posts | array  | Source posts that contributed to this topic |

The `related_posts` array contains source information for posts that contributed to the topic, including:
- `id`: The original post ID
- `title`: The title of the post
- `url`: Direct link to the forum post
- `relevance`: How relevant this post is to the topic (0-1)

#### Example Request

```bash
curl -X GET 'https://web-production-88af4.up.railway.app/api/common-topics/123'
```

#### Success Response

```json
{
  "status": "success",
  "data": {
    "id": "123",
    "forum": "ARBITRUM",
    "topic": "Treasury Management",
    "summary": "Discussions about managing and allocating DAO treasury funds",
    "relevance_score": 0.85,
    "post_count": 15,
    "created_at": "2024-02-11T20:06:37.330Z",
    "metadata": {
      "key_terms": ["treasury", "funds", "allocation"],
      "sentiment": "neutral",
      "urgency": "medium"
    },
    "related_posts": [
      {
        "id": "post_123",
        "title": "Treasury Allocation Proposal",
        "url": "https://forum.arbitrum.foundation/t/123",
        "relevance": 0.92
      }
    ]
  }
}
```

#### Error Response

```json
{
  "error": "Topic not found",
  "code": "NOT_FOUND",
  "details": {
    "id": "123"
  }
}
```

## Rate Limits

- Generate endpoint: 1 request per forum per hour
- Retrieve endpoints: 100 requests per minute per IP
- Specific topic endpoint: 200 requests per minute per IP

## Error Codes

| Code           | Description |
|----------------|-------------|
| INVALID_FORUM  | The specified forum identifier is not valid |
| INVALID_PARAMS | One or more request parameters are invalid |
| NOT_FOUND      | The requested resource was not found |
| RATE_LIMITED   | Too many requests, please try again later |
| SERVER_ERROR   | Internal server error |

## Best Practices

1. **Polling Interval**: When checking generation status, implement exponential backoff starting at 5 seconds.
2. **Caching**: Cache topic results for at least 5 minutes to reduce server load.
3. **Error Handling**: Implement proper error handling for all possible response codes.
4. **Timeframes**: Use reasonable timeframes (1 day to 1 month) for optimal results.

## Recent Use Cases and Examples

### SEAL Safe Harbor Agreement Topic

The Common Topics API has been instrumental in tracking important governance discussions like the SEAL Safe Harbor Agreement. This topic demonstrates how the API captures and summarizes critical protocol security initiatives.

Example response for a specific topic:

```json
{
  "status": "success",
  "data": {
    "id": "22",
    "forum": "UNISWAP",
    "topic": "SEAL Safe Harbor Agreement",
    "summary": "A governance proposal establishing legal protections for whitehat hackers intervening during active exploits",
    "relevance_score": 0.95,
    "metadata": {
      "key_terms": ["security", "whitehat", "exploit", "recovery", "bounty"],
      "sentiment": "positive",
      "urgency": "high",
      "implementation_status": "approved"
    },
    "details": {
      "bounty_cap": "2.25 million USD per whitehat per hack",
      "recovery_timeframe": "72 hours",
      "contract_address": "0x8f72fcf695523a6fc7dd97eafdd7a083c386b7b6",
      "oversight": "Erin Koen"
    }
  }
}
```

### Uniswap Growth Program

Another example showcasing how the API tracks ecosystem development initiatives:

```json
{
  "status": "success",
  "data": {
    "id": "23",
    "forum": "UNISWAP",
    "topic": "Uniswap Growth Program",
    "summary": "Initiative to foster collaboration and boost protocol liquidity through incentives and co-marketing",
    "relevance_score": 0.88,
    "metadata": {
      "key_terms": ["growth", "incentives", "liquidity", "collaboration"],
      "sentiment": "positive",
      "urgency": "medium"
    },
    "metrics": {
      "total_incentives": "800000+ USD",
      "participating_ecosystems": ["Base", "Arbitrum", "Optimism"],
      "focus_areas": [
        "Distribution",
        "Leverage",
        "Automation",
        "Incentive layers"
      ]
    }
  }
}
```

## Implementation Tips

1. **Topic Analysis**: Use the metadata fields to prioritize topics based on urgency and sentiment
2. **Historical Context**: Compare topic relevance scores over time to track evolving governance priorities
3. **Integration Use Cases**:
   - Governance dashboards
   - Community analytics
   - Automated reporting
   - Forum engagement metrics

## Examples

### JavaScript/TypeScript

```typescript
async function generateCommonTopics(forum: string, timeframe: string) {
  const response = await fetch('https://web-production-88af4.up.railway.app/api/common-topics/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      forum,
      timeframe,
    }),
  });
  
  return await response.json();
}

async function getCommonTopics(forum?: string) {
  const url = new URL('https://web-production-88af4.up.railway.app/api/common-topics');
  if (forum) {
    url.searchParams.append('forum', forum);
  }
  
  const response = await fetch(url.toString());
  return await response.json();
}
```

### Python

```python
import requests

def generate_common_topics(forum: str, timeframe: str = '7d'):
    response = requests.post(
        'https://web-production-88af4.up.railway.app/api/common-topics/generate',
        json={
            'forum': forum,
            'timeframe': timeframe
        }
    )
    return response.json()

def get_common_topics(forum: str = None):
    params = {'forum': forum} if forum else {}
    response = requests.get(
        'https://web-production-88af4.up.railway.app/api/common-topics',
        params=params
    )
    return response.json()
```

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2024-02-11| Initial release |

## Support

For API support or to report issues:
- Email: dennison@tally.xyz
- GitHub Issues: [Create an issue](https://github.com/withtally/Tally-lytics/issues) 

## Vector Search API

The Vector Search API provides semantic search capabilities across different types of content (topics, posts, proposals) using embeddings-based similarity search.

### Search by Type

Perform a semantic search within a specific content type.

```
POST /api/searchByType
```

#### Request Body

| Field        | Type    | Required | Description |
|--------------|---------|----------|-------------|
| query        | string  | Yes      | The search query text |
| type         | string  | Yes      | Content type to search ('topic', 'post', 'snapshot', 'tally') |
| forum        | string  | Yes      | The forum identifier (e.g., "ARBITRUM", "UNISWAP") |
| limit        | number  | No       | Maximum number of results (default: 10) |
| threshold    | number  | No       | Minimum similarity threshold (0-1, default: 0.5) |
| boostRecent  | boolean | No       | Whether to boost recent content (default: false) |
| boostPopular | boolean | No       | Whether to boost popular content (default: false) |
| useCache     | boolean | No       | Whether to use LLM reranking (default: false) |

#### Example Request

```bash
curl -X POST 'https://web-production-88af4.up.railway.app/api/searchByType' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "treasury management proposals",
    "type": "topic",
    "forum": "ARBITRUM",
    "limit": 5,
    "threshold": 0.7,
    "boostRecent": true
  }'
```

#### Success Response

```json
{
  "results": [
    {
      "type": "topic",
      "id": "123",
      "forum_name": "ARBITRUM",
      "title": "Treasury Management Framework",
      "content": "Proposal for establishing treasury management guidelines...",
      "similarity": 0.92,
      "created_at": "2024-02-11T20:06:37.330Z",
      "popularity_score": 85
    }
  ],
  "metadata": {
    "query": "treasury management proposals",
    "type": "topic",
    "forum": "ARBITRUM",
    "total": 1,
    "timestamp": "2024-02-15T08:30:00.000Z",
    "settings": {
      "boostRecent": true,
      "boostPopular": false,
      "useCache": false
    }
  }
}
```

### Search All Types

Search across all content types simultaneously.

```
POST /api/searchAll
```

#### Request Body

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| query     | string | Yes      | The search query text |
| forum     | string | Yes      | The forum identifier |
| limit     | number | No       | Maximum results per type (default: 10) |
| threshold | number | No       | Minimum similarity threshold (0-1, default: 0.7) |

#### Example Request

```bash
curl -X POST 'https://web-production-88af4.up.railway.app/api/searchAll' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "governance proposals",
    "forum": "UNISWAP",
    "limit": 5,
    "threshold": 0.7
  }'
```

#### Success Response

```json
{
  "topics": [...],
  "posts": [...],
  "snapshot": [...],
  "tally": [...],
  "metadata": {
    "query": "governance proposals",
    "forum": "UNISWAP",
    "threshold": 0.7,
    "timestamp": "2024-02-15T08:30:00.000Z",
    "counts": {
      "topics": 3,
      "posts": 5,
      "snapshot": 2,
      "tally": 1
    }
  }
}
```

### Error Responses

```json
{
  "error": "Missing required parameters",
  "required": ["query", "type", "forum"]
}
```

```json
{
  "error": "Invalid type parameter",
  "details": "Type must be one of: topic, post, snapshot, tally"
}
```

```json
{
  "error": "Invalid threshold parameter",
  "details": "Threshold must be a number between 0 and 1"
}
```

### Implementation Notes

1. **Vector Dimensions**: The search uses 1536-dimensional vectors for embeddings
2. **Similarity Calculation**: Uses cosine similarity with PostgreSQL's vector extension
3. **Boosting Factors**:
   - Recent content: 20% boost maximum, decaying over 30 days
   - Popular content: 30% boost maximum based on normalized popularity score
4. **LLM Reranking**: When enabled, uses GPT to expand queries with similes for better semantic matching

### Best Practices

1. **Query Optimization**:
   - Use specific, focused search queries
   - Include relevant keywords and context
   - Keep queries under 200 words for best results

2. **Performance**:
   - Use type-specific search when possible
   - Start with higher thresholds (0.7+) and adjust if needed
   - Enable boosting only when needed

3. **Rate Limits**:
   - Maximum 100 requests per minute per IP
   - Maximum 1000 results per request
   - Batch requests when possible

4. **Caching**:
   - Cache results for frequently used queries
   - Implement exponential backoff for retries
   - Consider local embedding caching for repeated queries 