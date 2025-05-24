# News API Routes Implementation

## Overview
This document outlines the implementation details for the News API routes, which provide access to news articles and related content for DAOs/forums.

## Route Structure

```
/api/news
  ├── /recent                        # Get recent news articles
  ├── /[forumName]                   # Get news for a specific forum
  └── /trending                      # Get trending news topics
```

## Data Models

Create a types file for news-related data:

**File: `/lib/models/news-types.ts`**

```typescript
// News article model
export interface NewsArticle {
  id: number;
  title: string;
  content?: string;
  description?: string;
  author?: string;
  publishedAt?: string;
  url: string;
  urlToImage?: string;
  sourceId?: string;
  sourceName?: string;
  forumName: string;
  createdAt: string;
  updatedAt: string;
}

// News article evaluation model
export interface NewsArticleEvaluation {
  id: number;
  articleId: number;
  forumName: string;
  llmModel: string;
  overallQuality: number;
  relevance: number;
  sentiment: number;
  keyTopics: string[];
  summary?: string;
  createdAt: string;
}

// Trending topic model
export interface TrendingTopic {
  topic: string;
  count: number;
  forums: string[];
  sentiment: number;
  articles: Array<{
    id: number;
    title: string;
    url: string;
  }>;
}
```

## Database Service

Create a service file for news-related database queries:

**File: `/lib/services/news-service.ts`**

```typescript
import { getDbConnection } from '@/lib/db';
import { NewsArticle, TrendingTopic } from '@/lib/models/news-types';
import { QueryParams } from '@/lib/api-types';

/**
 * Service for news-related database queries
 */
export class NewsService {
  /**
   * Get recent news articles
   */
  async getRecentNews(params: QueryParams = {}): Promise<{ articles: NewsArticle[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'published_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('news_articles')
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere(function() {
        this.where('title', 'ilike', `%${params.search}%`)
            .orWhere('description', 'ilike', `%${params.search}%`)
            .orWhere('content', 'ilike', `%${params.search}%`);
      });
    }
    
    // Add forum filter if provided
    if (params.filter?.forumName) {
      query.andWhere('forum_name', params.filter.forumName);
    }
    
    // Execute query
    const articles = await query;
    
    // Get total count
    const [{ count }] = await db('news_articles').count('id as count');
    
    // Map database fields to model fields
    const mappedArticles: NewsArticle[] = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      description: article.description,
      author: article.author,
      publishedAt: article.published_at,
      url: article.url,
      urlToImage: article.url_to_image,
      sourceId: article.source_id,
      sourceName: article.source_name,
      forumName: article.forum_name,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }));
    
    return {
      articles: mappedArticles,
      total: parseInt(count),
    };
  }
  
  /**
   * Get news articles for a specific forum
   */
  async getForumNews(forumName: string, params: QueryParams = {}): Promise<{ articles: NewsArticle[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'published_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('news_articles')
      .where({ forum_name: forumName })
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere(function() {
        this.where('title', 'ilike', `%${params.search}%`)
            .orWhere('description', 'ilike', `%${params.search}%`)
            .orWhere('content', 'ilike', `%${params.search}%`);
      });
    }
    
    // Execute query
    const articles = await query;
    
    // Get total count
    const [{ count }] = await db('news_articles')
      .where({ forum_name: forumName })
      .count('id as count');
    
    // Map database fields to model fields
    const mappedArticles: NewsArticle[] = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      description: article.description,
      author: article.author,
      publishedAt: article.published_at,
      url: article.url,
      urlToImage: article.url_to_image,
      sourceId: article.source_id,
      sourceName: article.source_name,
      forumName: article.forum_name,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }));
    
    return {
      articles: mappedArticles,
      total: parseInt(count),
    };
  }
  
  /**
   * Get trending news topics
   */
  async getTrendingTopics(): Promise<TrendingTopic[]> {
    const db = getDbConnection();
    
    // This query requires news_article_evaluations table with key_topics field
    // If the table doesn't exist yet, you'll need to create it or modify this query
    
    // Get trending topics from article evaluations
    const topics = await db('news_article_evaluations')
      .select(db.raw('jsonb_array_elements_text(key_topics) as topic'))
      .count('id as count')
      .groupBy('topic')
      .orderBy('count', 'desc')
      .limit(10);
    
    // For each topic, get related forums and articles
    const trendingTopics: TrendingTopic[] = [];
    
    for (const topic of topics) {
      // Get forums for this topic
      const forums = await db('news_article_evaluations')
        .select('forum_name')
        .whereRaw("key_topics @> ?", [`["${topic.topic}"]`])
        .distinct('forum_name');
      
      // Get articles for this topic
      const articles = await db('news_article_evaluations as nae')
        .join('news_articles as na', function() {
          this.on('nae.article_id', '=', 'na.id')
              .andOn('nae.forum_name', '=', 'na.forum_name');
        })
        .whereRaw("nae.key_topics @> ?", [`["${topic.topic}"]`])
        .select('na.id', 'na.title', 'na.url')
        .limit(5);
      
      // Get average sentiment for this topic
      const [sentimentResult] = await db('news_article_evaluations')
        .whereRaw("key_topics @> ?", [`["${topic.topic}"]`])
        .avg('sentiment as avg_sentiment');
      
      trendingTopics.push({
        topic: topic.topic,
        count: parseInt(topic.count),
        forums: forums.map(f => f.forum_name),
        sentiment: parseFloat(sentimentResult.avg_sentiment) || 0,
        articles: articles.map(a => ({
          id: a.id,
          title: a.title,
          url: a.url,
        })),
      });
    }
    
    return trendingTopics;
  }
}

// Export a singleton instance
export const newsService = new NewsService();
```

## API Route Implementations

### 1. Get Recent News Articles

**File: `/app/api/news/recent/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/services/news-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'published_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  const forumName = searchParams.get('forumName') || undefined;
  
  try {
    // Get recent news articles from the database
    const { articles, total } = await newsService.getRecentNews({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      filter: forumName ? { forumName } : undefined,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: articles,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching recent news:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'NEWS_FETCH_ERROR',
          message: 'Failed to fetch recent news articles',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2. Get News for a Specific Forum

**File: `/app/api/news/[forumName]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/services/news-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { forumName: string } }
) {
  const { forumName } = params;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'published_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  
  try {
    // Get news articles for the forum from the database
    const { articles, total } = await newsService.getForumNews(forumName, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: articles,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error(`Error fetching news for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'NEWS_FETCH_ERROR',
          message: `Failed to fetch news articles for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 3. Get Trending News Topics

**File: `/app/api/news/trending/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { newsService } from '@/lib/services/news-service';

export async function GET() {
  try {
    // Get trending topics from the database
    const trendingTopics = await newsService.getTrendingTopics();
    
    // Return the response
    return NextResponse.json({
      data: trendingTopics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching trending topics:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'TRENDING_FETCH_ERROR',
          message: 'Failed to fetch trending news topics',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Examples

### 1. News Feed Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NewsArticle } from '@/lib/models/news-types';

export function NewsFeed({ forumName }: { forumName?: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      setError(null);
      
      try {
        const endpoint = forumName 
          ? `/news/${forumName}` 
          : '/news/recent';
        
        const response = await apiClient.get(endpoint, {
          page,
          pageSize: 10,
          sortBy: 'published_at',
          sortOrder: 'desc',
        });
        
        setArticles(response.data);
        setTotalPages(response.meta.pagination.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch news articles');
      } finally {
        setLoading(false);
      }
    }
    
    fetchNews();
  }, [forumName, page]);
  
  if (loading) return <div>Loading news articles...</div>;
  if (error) return <div>Error: {error}</div>;
  if (articles.length === 0) return <div>No news articles found</div>;
  
  return (
    <div className="news-feed">
      <h2>{forumName ? `${forumName} News` : 'Recent News'}</h2>
      
      <div className="articles-list">
        {articles.map(article => (
          <div key={article.id} className="article-card">
            {article.urlToImage && (
              <div className="article-image">
                <img src={article.urlToImage} alt={article.title} />
              </div>
            )}
            <div className="article-content">
              <h3>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h3>
              <p className="article-description">
                {article.description || 'No description available'}
              </p>
              <div className="article-meta">
                {article.sourceName && <span>Source: {article.sourceName}</span>}
                {article.publishedAt && (
                  <span>Published: {new Date(article.publishedAt).toLocaleDateString()}</span>
                )}
                <span>Forum: {article.forumName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page === totalPages} 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### 2. Trending Topics Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TrendingTopic } from '@/lib/models/news-types';
import Link from 'next/link';

export function TrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchTrendingTopics() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get('/news/trending');
        setTopics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch trending topics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTrendingTopics();
  }, []);
  
  if (loading) return <div>Loading trending topics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (topics.length === 0) return <div>No trending topics found</div>;
  
  return (
    <div className="trending-topics">
      <h2>Trending Topics</h2>
      
      <div className="topics-grid">
        {topics.map(topic => (
          <div key={topic.topic} className="topic-card">
            <h3>{topic.topic}</h3>
            <div className="topic-meta">
              <span>Mentions: {topic.count}</span>
              <span>Sentiment: {getSentimentLabel(topic.sentiment)}</span>
            </div>
            <div className="topic-forums">
              <h4>Related Forums:</h4>
              <div className="forum-tags">
                {topic.forums.map(forum => (
                  <Link key={forum} href={`/news/${forum}`}>
                    <span className="forum-tag">{forum}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="topic-articles">
              <h4>Related Articles:</h4>
              <ul>
                {topic.articles.map(article => (
                  <li key={article.id}>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to convert sentiment score to label
function getSentimentLabel(sentiment: number): string {
  if (sentiment >= 0.7) return 'Very Positive';
  if (sentiment >= 0.3) return 'Positive';
  if (sentiment >= -0.3) return 'Neutral';
  if (sentiment >= -0.7) return 'Negative';
  return 'Very Negative';
}
```

## Implementation Steps

1. **Create the Data Models**
   - Implement the news-related type definitions

2. **Create the Database Service**
   - Implement the news service with database queries

3. **Implement API Routes**
   - Create the route handlers for each endpoint
   - Implement error handling and response formatting

4. **Create Frontend Components**
   - Implement hooks and components to consume the API
   - Create news feed and trending topics components

## Caching Strategy

For improved performance, implement the following caching strategy:

1. **Server-Side Caching**
   - Cache trending topics for 1 hour
   - Cache news article lists for 15 minutes

2. **Client-Side Caching**
   - Use the API client's built-in caching for short-lived data
   - Implement stale-while-revalidate pattern for frequently accessed data

## Security Considerations

1. **URL Validation**
   - Validate and sanitize all URLs before storing or displaying
   - Implement proper escaping for user-generated content

2. **Content Security Policy**
   - Set up CSP headers to prevent XSS attacks
   - Restrict image sources to trusted domains

3. **Rate Limiting**
   - Implement rate limiting for high-traffic endpoints
