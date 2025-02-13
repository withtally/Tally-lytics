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