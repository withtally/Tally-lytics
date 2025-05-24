# Forums API Routes Implementation

## Overview
This document outlines the implementation details for the Forums API routes, which provide access to forum topics, posts, and analytics data from the database.

## Route Structure

```
/api/forums
  ├── /[forumName]/topics            # Get topics for a specific forum
  ├── /[forumName]/posts             # Get posts for a specific forum
  ├── /[forumName]/analytics         # Get aggregated analytics for a forum
  └── /stats                         # Get cross-forum statistics
```

## Data Models

Create a types file for forum-related data:

**File: `/lib/models/forum-types.ts`**

```typescript
// Topic model
export interface Topic {
  id: number;
  forumName: string;
  title: string;
  slug: string;
  postsCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  lastAnalyzed?: string;
  aiSummary?: string;
}

// Post model
export interface Post {
  id: number;
  forumName: string;
  topicId: number;
  username: string;
  plainText: string;
  cooked: string;
  createdAt: string;
  updatedAt: string;
  lastAnalyzed?: string;
}

// Topic evaluation model
export interface TopicEvaluation {
  id: number;
  topicId: number;
  forumName: string;
  llmModel: string;
  overallQuality: number;
  helpfulness: number;
  relevance: number;
  uniquePerspective: number;
  logicalReasoning: number;
  factBased: number;
  clarity: number;
  constructiveness: number;
  hostility: number;
  emotionalTone: number;
  engagementPotential: number;
  persuasiveness: number;
  dominantTopic?: string;
  keyPoints: string[];
  tags: string[];
  suggestedImprovements?: string;
}

// Forum analytics model
export interface ForumAnalytics {
  totalTopics: number;
  totalPosts: number;
  activeUsers: number;
  avgPostsPerTopic: number;
  avgQualityScore: number;
  topTags: Array<{
    tag: string;
    count: number;
  }>;
  activityByDay: Array<{
    date: string;
    posts: number;
  }>;
  qualityDistribution: {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
    poor: number;
  };
}

// Cross-forum stats model
export interface ForumStats {
  forums: Array<{
    name: string;
    topics: number;
    posts: number;
    users: number;
    avgQuality: number;
    lastActivity: string;
  }>;
  totalTopics: number;
  totalPosts: number;
  totalUsers: number;
  mostActiveForums: Array<{
    name: string;
    posts: number;
  }>;
  highestQualityForums: Array<{
    name: string;
    avgQuality: number;
  }>;
}
```

## Database Queries

Create a service file for forum-related database queries:

**File: `/lib/services/forum-service.ts`**

```typescript
import { getDbConnection } from '@/lib/db';
import { Topic, Post, TopicEvaluation, ForumAnalytics, ForumStats } from '@/lib/models/forum-types';
import { QueryParams } from '@/lib/api-types';

/**
 * Service for forum-related database queries
 */
export class ForumService {
  /**
   * Get topics for a specific forum
   */
  async getTopics(forumName: string, params: QueryParams = {}): Promise<{ topics: Topic[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('topics')
      .where({ forum_name: forumName })
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere('title', 'ilike', `%${params.search}%`);
    }
    
    // Execute query
    const topics = await query;
    
    // Get total count
    const [{ count }] = await db('topics')
      .where({ forum_name: forumName })
      .count('id as count');
    
    // Map database fields to model fields
    const mappedTopics: Topic[] = topics.map(topic => ({
      id: topic.id,
      forumName: topic.forum_name,
      title: topic.title,
      slug: topic.slug,
      postsCount: topic.posts_count,
      replyCount: topic.reply_count,
      createdAt: topic.created_at,
      updatedAt: topic.updated_at,
      lastAnalyzed: topic.last_analyzed,
      aiSummary: topic.ai_summary,
    }));
    
    return {
      topics: mappedTopics,
      total: parseInt(count),
    };
  }
  
  /**
   * Get posts for a specific forum
   */
  async getPosts(forumName: string, params: QueryParams = {}): Promise<{ posts: Post[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('posts')
      .where({ forum_name: forumName })
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add topic filter if provided
    if (params.filter?.topicId) {
      query.andWhere('topic_id', params.filter.topicId);
    }
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere('plain_text', 'ilike', `%${params.search}%`);
    }
    
    // Execute query
    const posts = await query;
    
    // Get total count
    const [{ count }] = await db('posts')
      .where({ forum_name: forumName })
      .count('id as count');
    
    // Map database fields to model fields
    const mappedPosts: Post[] = posts.map(post => ({
      id: post.id,
      forumName: post.forum_name,
      topicId: post.topic_id,
      username: post.username,
      plainText: post.plain_text,
      cooked: post.cooked,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      lastAnalyzed: post.last_analyzed,
    }));
    
    return {
      posts: mappedPosts,
      total: parseInt(count),
    };
  }
  
  /**
   * Get analytics for a specific forum
   */
  async getForumAnalytics(forumName: string): Promise<ForumAnalytics> {
    const db = getDbConnection();
    
    // Get total topics and posts
    const [topicsResult] = await db('topics')
      .where({ forum_name: forumName })
      .count('id as count');
    
    const [postsResult] = await db('posts')
      .where({ forum_name: forumName })
      .count('id as count');
    
    // Get active users
    const [usersResult] = await db('posts')
      .where({ forum_name: forumName })
      .countDistinct('username as count');
    
    // Get average quality score
    const [qualityResult] = await db('post_evaluations')
      .where({ forum_name: forumName })
      .avg('overall_quality as avg');
    
    // Get top tags
    const topTags = await db('post_tags')
      .join('tags', 'post_tags.tag_id', 'tags.id')
      .where('post_tags.forum_name', forumName)
      .select('tags.name')
      .count('post_tags.post_id as count')
      .groupBy('tags.name')
      .orderBy('count', 'desc')
      .limit(10);
    
    // Get activity by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityByDay = await db('posts')
      .where({ forum_name: forumName })
      .whereRaw('created_at >= ?', [thirtyDaysAgo.toISOString()])
      .select(db.raw('DATE(created_at) as date'))
      .count('id as count')
      .groupBy('date')
      .orderBy('date');
    
    // Get quality distribution
    const qualityDistribution = await db('post_evaluations')
      .where({ forum_name: forumName })
      .select(
        db.raw('COUNT(CASE WHEN overall_quality >= 8 THEN 1 END) as excellent'),
        db.raw('COUNT(CASE WHEN overall_quality >= 6 AND overall_quality < 8 THEN 1 END) as good'),
        db.raw('COUNT(CASE WHEN overall_quality >= 4 AND overall_quality < 6 THEN 1 END) as average'),
        db.raw('COUNT(CASE WHEN overall_quality >= 2 AND overall_quality < 4 THEN 1 END) as below_average'),
        db.raw('COUNT(CASE WHEN overall_quality < 2 THEN 1 END) as poor')
      )
      .first();
    
    // Calculate average posts per topic
    const totalTopics = parseInt(topicsResult.count);
    const totalPosts = parseInt(postsResult.count);
    const avgPostsPerTopic = totalTopics > 0 ? totalPosts / totalTopics : 0;
    
    return {
      totalTopics,
      totalPosts,
      activeUsers: parseInt(usersResult.count),
      avgPostsPerTopic,
      avgQualityScore: parseFloat(qualityResult.avg) || 0,
      topTags: topTags.map(tag => ({
        tag: tag.name,
        count: parseInt(tag.count),
      })),
      activityByDay: activityByDay.map(day => ({
        date: day.date,
        posts: parseInt(day.count),
      })),
      qualityDistribution: {
        excellent: parseInt(qualityDistribution.excellent) || 0,
        good: parseInt(qualityDistribution.good) || 0,
        average: parseInt(qualityDistribution.average) || 0,
        belowAverage: parseInt(qualityDistribution.below_average) || 0,
        poor: parseInt(qualityDistribution.poor) || 0,
      },
    };
  }
  
  /**
   * Get cross-forum statistics
   */
  async getForumStats(): Promise<ForumStats> {
    const db = getDbConnection();
    
    // Get forum-level stats
    const forumStats = await db('topics')
      .select('forum_name')
      .count('id as topic_count')
      .groupBy('forum_name');
    
    // Get post counts per forum
    const postCounts = await db('posts')
      .select('forum_name')
      .count('id as post_count')
      .groupBy('forum_name');
    
    // Get user counts per forum
    const userCounts = await db('posts')
      .select('forum_name')
      .countDistinct('username as user_count')
      .groupBy('forum_name');
    
    // Get quality scores per forum
    const qualityScores = await db('post_evaluations')
      .select('forum_name')
      .avg('overall_quality as avg_quality')
      .groupBy('forum_name');
    
    // Get last activity per forum
    const lastActivities = await db('posts')
      .select('forum_name')
      .max('created_at as last_activity')
      .groupBy('forum_name');
    
    // Combine all stats
    const forumStatsMap = new Map();
    
    forumStats.forEach(stat => {
      forumStatsMap.set(stat.forum_name, {
        name: stat.forum_name,
        topics: parseInt(stat.topic_count),
        posts: 0,
        users: 0,
        avgQuality: 0,
        lastActivity: null,
      });
    });
    
    postCounts.forEach(stat => {
      if (forumStatsMap.has(stat.forum_name)) {
        forumStatsMap.get(stat.forum_name).posts = parseInt(stat.post_count);
      }
    });
    
    userCounts.forEach(stat => {
      if (forumStatsMap.has(stat.forum_name)) {
        forumStatsMap.get(stat.forum_name).users = parseInt(stat.user_count);
      }
    });
    
    qualityScores.forEach(stat => {
      if (forumStatsMap.has(stat.forum_name)) {
        forumStatsMap.get(stat.forum_name).avgQuality = parseFloat(stat.avg_quality) || 0;
      }
    });
    
    lastActivities.forEach(stat => {
      if (forumStatsMap.has(stat.forum_name)) {
        forumStatsMap.get(stat.forum_name).lastActivity = stat.last_activity;
      }
    });
    
    // Convert map to array
    const forums = Array.from(forumStatsMap.values());
    
    // Calculate totals
    const totalTopics = forums.reduce((sum, forum) => sum + forum.topics, 0);
    const totalPosts = forums.reduce((sum, forum) => sum + forum.posts, 0);
    const totalUsers = forums.reduce((sum, forum) => sum + forum.users, 0);
    
    // Get most active forums
    const mostActiveForums = [...forums]
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5)
      .map(forum => ({
        name: forum.name,
        posts: forum.posts,
      }));
    
    // Get highest quality forums
    const highestQualityForums = [...forums]
      .filter(forum => forum.avgQuality > 0)
      .sort((a, b) => b.avgQuality - a.avgQuality)
      .slice(0, 5)
      .map(forum => ({
        name: forum.name,
        avgQuality: forum.avgQuality,
      }));
    
    return {
      forums,
      totalTopics,
      totalPosts,
      totalUsers,
      mostActiveForums,
      highestQualityForums,
    };
  }
}

// Export a singleton instance
export const forumService = new ForumService();
```

## API Route Implementations

### 1. Get Topics for a Specific Forum

**File: `/app/api/forums/[forumName]/topics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { forumService } from '@/lib/services/forum-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { forumName: string } }
) {
  const { forumName } = params;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  
  try {
    // Get topics from the database
    const { topics, total } = await forumService.getTopics(forumName, {
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
      data: topics,
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
    console.error(`Error fetching topics for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'TOPICS_FETCH_ERROR',
          message: `Failed to fetch topics for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2. Get Posts for a Specific Forum

**File: `/app/api/forums/[forumName]/posts/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { forumService } from '@/lib/services/forum-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { forumName: string } }
) {
  const { forumName } = params;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  const topicId = searchParams.get('topicId') ? parseInt(searchParams.get('topicId')!) : undefined;
  
  try {
    // Get posts from the database
    const { posts, total } = await forumService.getPosts(forumName, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      filter: topicId ? { topicId } : undefined,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: posts,
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
    console.error(`Error fetching posts for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'POSTS_FETCH_ERROR',
          message: `Failed to fetch posts for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 3. Get Analytics for a Specific Forum

**File: `/app/api/forums/[forumName]/analytics/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { forumService } from '@/lib/services/forum-service';

export async function GET(
  _request: Request,
  { params }: { params: { forumName: string } }
) {
  const { forumName } = params;
  
  try {
    // Get analytics from the database
    const analytics = await forumService.getForumAnalytics(forumName);
    
    // Return the response
    return NextResponse.json({
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching analytics for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: `Failed to fetch analytics for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 4. Get Cross-Forum Statistics

**File: `/app/api/forums/stats/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { forumService } from '@/lib/services/forum-service';

export async function GET() {
  try {
    // Get forum stats from the database
    const stats = await forumService.getForumStats();
    
    // Return the response
    return NextResponse.json({
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching forum stats:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'STATS_FETCH_ERROR',
          message: 'Failed to fetch forum statistics',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Examples

### 1. Fetching Topics for a Forum

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Topic } from '@/lib/models/forum-types';

export function useForumTopics(forumName: string, page = 1, pageSize = 20) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  
  useEffect(() => {
    async function fetchTopics() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get(`/forums/${forumName}/topics`, {
          page,
          pageSize,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        
        setTopics(response.data);
        setTotalPages(response.meta.pagination.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch topics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTopics();
  }, [forumName, page, pageSize]);
  
  return { topics, loading, error, totalPages };
}
```

### 2. Displaying Forum Analytics

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ForumAnalytics } from '@/lib/models/forum-types';
import { BarChart, LineChart, PieChart } from 'your-chart-library';

export function ForumAnalyticsComponent({ forumName }: { forumName: string }) {
  const [analytics, setAnalytics] = useState<ForumAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get(`/forums/${forumName}/analytics`);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [forumName]);
  
  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No analytics available</div>;
  
  return (
    <div className="forum-analytics">
      <h2>{forumName} Analytics</h2>
      
      <div className="stats-summary">
        <div className="stat-card">
          <h3>Total Topics</h3>
          <p>{analytics.totalTopics}</p>
        </div>
        <div className="stat-card">
          <h3>Total Posts</h3>
          <p>{analytics.totalPosts}</p>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{analytics.activeUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Avg. Quality</h3>
          <p>{analytics.avgQualityScore.toFixed(1)}/10</p>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Activity Over Time</h3>
          <LineChart
            data={analytics.activityByDay}
            xKey="date"
            yKey="posts"
            title="Posts per Day"
          />
        </div>
        
        <div className="chart-container">
          <h3>Top Tags</h3>
          <BarChart
            data={analytics.topTags}
            xKey="tag"
            yKey="count"
            title="Most Used Tags"
          />
        </div>
      </div>
      
      <div className="chart-container">
        <h3>Content Quality Distribution</h3>
        <PieChart
          data={[
            { name: 'Excellent', value: analytics.qualityDistribution.excellent },
            { name: 'Good', value: analytics.qualityDistribution.good },
            { name: 'Average', value: analytics.qualityDistribution.average },
            { name: 'Below Average', value: analytics.qualityDistribution.belowAverage },
            { name: 'Poor', value: analytics.qualityDistribution.poor },
          ]}
          nameKey="name"
          valueKey="value"
          title="Quality Distribution"
        />
      </div>
    </div>
  );
}
```

## Implementation Steps

1. **Create the Data Models**
   - Implement the forum-related type definitions

2. **Create the Database Service**
   - Implement the forum service with database queries

3. **Implement API Routes**
   - Create the route handlers for each endpoint
   - Implement error handling and response formatting

4. **Create Frontend Components**
   - Implement hooks and components to consume the API
   - Create visualizations for analytics data

5. **Test the API**
   - Test each endpoint with various parameters
   - Verify data integrity and performance

## Caching Strategy

For improved performance, implement the following caching strategy:

1. **Server-Side Caching**
   - Cache forum stats and analytics for 1 hour
   - Cache topic and post lists for 5 minutes

2. **Client-Side Caching**
   - Use the API client's built-in caching for short-lived data
   - Implement stale-while-revalidate pattern for frequently accessed data

## Error Handling

Implement comprehensive error handling:

1. **Database Errors**
   - Handle connection failures
   - Handle query timeouts

2. **Validation Errors**
   - Validate forum names exist before querying
   - Validate query parameters

3. **Rate Limiting**
   - Implement rate limiting for high-traffic endpoints

## Security Considerations

1. **Input Validation**
   - Sanitize all user inputs
   - Validate forum names against allowed list

2. **Query Parameter Validation**
   - Validate and sanitize all query parameters
   - Implement maximum limits for pagination

3. **Error Message Security**
   - Avoid exposing internal details in error messages
   - Use generic error messages in production
