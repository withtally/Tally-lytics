# Users API Routes Implementation

## Overview
This document outlines the implementation details for the Users API routes, which provide access to user data, activity, and analytics.

## Route Structure

```
/api/users
  ├── /profile                       # Get current user's profile
  ├── /[username]                    # Get a specific user's profile
  ├── /[username]/activity           # Get a user's activity
  └── /analytics                     # Get user analytics
```

## Data Models

Create a types file for user-related data:

**File: `/lib/models/user-types.ts`**

```typescript
// User profile model
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  forumMemberships: string[];
  joinedAt: string;
  lastActive?: string;
  reputation?: number;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

// User activity model
export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  activityType: 'post' | 'topic' | 'vote' | 'comment';
  entityId: string;
  entityTitle?: string;
  forumName: string;
  timestamp: string;
  content?: string;
}

// User analytics model
export interface UserAnalytics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  newUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topContributors: Array<{
    username: string;
    displayName?: string;
    avatarUrl?: string;
    postCount: number;
    topicCount: number;
    reputation: number;
  }>;
  usersByForum: Array<{
    forumName: string;
    userCount: number;
  }>;
  activityTrend: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
  }>;
}
```

## Database Service

Create a service file for user-related database queries:

**File: `/lib/services/user-service.ts`**

```typescript
import { getDbConnection } from '@/lib/db';
import { UserProfile, UserActivity, UserAnalytics } from '@/lib/models/user-types';
import { QueryParams } from '@/lib/api-types';

/**
 * Service for user-related database queries
 */
export class UserService {
  /**
   * Get a user profile by username
   */
  async getUserProfile(username: string): Promise<UserProfile | null> {
    const db = getDbConnection();
    
    // Get user from database
    const user = await db('users')
      .where({ username })
      .first();
    
    if (!user) {
      return null;
    }
    
    // Get forum memberships
    const forumMemberships = await db('user_forum_memberships')
      .where({ user_id: user.id })
      .pluck('forum_name');
    
    // Map database fields to model fields
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      forumMemberships,
      joinedAt: user.joined_at,
      lastActive: user.last_active,
      reputation: user.reputation,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
  
  /**
   * Get a user's activity
   */
  async getUserActivity(username: string, params: QueryParams = {}): Promise<{ activities: UserActivity[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'timestamp', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Get user ID first
    const user = await db('users')
      .where({ username })
      .select('id')
      .first();
    
    if (!user) {
      return { activities: [], total: 0 };
    }
    
    // Build query for user activities
    const query = db('user_activities')
      .where({ user_id: user.id })
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add forum filter if provided
    if (params.filter?.forumName) {
      query.andWhere('forum_name', params.filter.forumName);
    }
    
    // Add activity type filter if provided
    if (params.filter?.activityType) {
      query.andWhere('activity_type', params.filter.activityType);
    }
    
    // Execute query
    const activities = await query;
    
    // Get total count
    const [{ count }] = await db('user_activities')
      .where({ user_id: user.id })
      .count('id as count');
    
    // Map database fields to model fields
    const mappedActivities: UserActivity[] = activities.map(activity => ({
      id: activity.id,
      userId: activity.user_id,
      username,
      activityType: activity.activity_type,
      entityId: activity.entity_id,
      entityTitle: activity.entity_title,
      forumName: activity.forum_name,
      timestamp: activity.timestamp,
      content: activity.content,
    }));
    
    return {
      activities: mappedActivities,
      total: parseInt(count),
    };
  }
  
  /**
   * Get user analytics
   */
  async getUserAnalytics(): Promise<UserAnalytics> {
    const db = getDbConnection();
    
    // Get total users
    const [totalResult] = await db('users').count('id as count');
    const totalUsers = parseInt(totalResult.count);
    
    // Get active users (daily, weekly, monthly)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [dailyActiveResult] = await db('users')
      .where('last_active', '>=', oneDayAgo.toISOString())
      .count('id as count');
    
    const [weeklyActiveResult] = await db('users')
      .where('last_active', '>=', oneWeekAgo.toISOString())
      .count('id as count');
    
    const [monthlyActiveResult] = await db('users')
      .where('last_active', '>=', oneMonthAgo.toISOString())
      .count('id as count');
    
    // Get new users (daily, weekly, monthly)
    const [dailyNewResult] = await db('users')
      .where('joined_at', '>=', oneDayAgo.toISOString())
      .count('id as count');
    
    const [weeklyNewResult] = await db('users')
      .where('joined_at', '>=', oneWeekAgo.toISOString())
      .count('id as count');
    
    const [monthlyNewResult] = await db('users')
      .where('joined_at', '>=', oneMonthAgo.toISOString())
      .count('id as count');
    
    // Get top contributors
    const topContributors = await db('users')
      .select(
        'users.id',
        'users.username',
        'users.display_name',
        'users.avatar_url',
        'users.reputation',
        db.raw('(SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) as post_count'),
        db.raw('(SELECT COUNT(*) FROM topics WHERE topics.user_id = users.id) as topic_count')
      )
      .orderBy('reputation', 'desc')
      .limit(10);
    
    // Get users by forum
    const usersByForum = await db('user_forum_memberships')
      .select('forum_name')
      .count('user_id as count')
      .groupBy('forum_name')
      .orderBy('count', 'desc');
    
    // Get activity trend (last 30 days)
    const activityTrend = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const [activeResult] = await db('users')
        .whereRaw('DATE(last_active) = ?', [dateStr])
        .count('id as count');
      
      const [newResult] = await db('users')
        .whereRaw('DATE(joined_at) = ?', [dateStr])
        .count('id as count');
      
      activityTrend.push({
        date: dateStr,
        activeUsers: parseInt(activeResult.count),
        newUsers: parseInt(newResult.count),
      });
    }
    
    return {
      totalUsers,
      activeUsers: {
        daily: parseInt(dailyActiveResult.count),
        weekly: parseInt(weeklyActiveResult.count),
        monthly: parseInt(monthlyActiveResult.count),
      },
      newUsers: {
        daily: parseInt(dailyNewResult.count),
        weekly: parseInt(weeklyNewResult.count),
        monthly: parseInt(monthlyNewResult.count),
      },
      topContributors: topContributors.map(user => ({
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        postCount: parseInt(user.post_count),
        topicCount: parseInt(user.topic_count),
        reputation: user.reputation,
      })),
      usersByForum: usersByForum.map(item => ({
        forumName: item.forum_name,
        userCount: parseInt(item.count),
      })),
      activityTrend: activityTrend.reverse(), // Most recent first
    };
  }
}

// Export a singleton instance
export const userService = new UserService();
```

## API Route Implementations

### 1. Get Current User's Profile

**File: `/app/api/users/profile/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const sessionUser = await getSessionUser(request);
    
    if (!sessionUser) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        },
        { status: 401 }
      );
    }
    
    // Get the user profile from the database
    const userProfile = await userService.getUserProfile(sessionUser.username);
    
    if (!userProfile) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
          },
        },
        { status: 404 }
      );
    }
    
    // Return the response
    return NextResponse.json({
      data: userProfile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'PROFILE_FETCH_ERROR',
          message: 'Failed to fetch user profile',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2. Get a Specific User's Profile

**File: `/app/api/users/[username]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  
  try {
    // Get the user profile from the database
    const userProfile = await userService.getUserProfile(username);
    
    if (!userProfile) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'USER_NOT_FOUND',
            message: `User ${username} not found`,
          },
        },
        { status: 404 }
      );
    }
    
    // Return the response
    return NextResponse.json({
      data: userProfile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching user profile for ${username}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'PROFILE_FETCH_ERROR',
          message: `Failed to fetch profile for user ${username}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 3. Get a User's Activity

**File: `/app/api/users/[username]/activity/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const forumName = searchParams.get('forumName') || undefined;
  const activityType = searchParams.get('activityType') || undefined;
  
  try {
    // Get the user's activity from the database
    const { activities, total } = await userService.getUserActivity(username, {
      page,
      pageSize,
      filter: {
        forumName,
        activityType: activityType as 'post' | 'topic' | 'vote' | 'comment' | undefined,
      },
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: activities,
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
    console.error(`Error fetching activity for user ${username}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'ACTIVITY_FETCH_ERROR',
          message: `Failed to fetch activity for user ${username}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 4. Get User Analytics

**File: `/app/api/users/analytics/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Check if user has admin permissions
    const sessionUser = await getSessionUser(request);
    
    if (!sessionUser?.isAdmin) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin privileges required to access user analytics',
          },
        },
        { status: 403 }
      );
    }
    
    // Get user analytics from the database
    const analytics = await userService.getUserAnalytics();
    
    // Return the response
    return NextResponse.json({
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user analytics:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: 'Failed to fetch user analytics',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Examples

### 1. User Profile Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { UserProfile } from '@/lib/models/user-types';

export function UserProfileCard({ username }: { username: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUserProfile() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get(`/users/${username}`);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || `Failed to fetch profile for ${username}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, [username]);
  
  if (loading) return <div>Loading user profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>User not found</div>;
  
  return (
    <div className="user-profile-card">
      <div className="profile-header">
        {profile.avatarUrl ? (
          <img 
            src={profile.avatarUrl} 
            alt={profile.displayName || profile.username} 
            className="avatar"
          />
        ) : (
          <div className="avatar-placeholder">
            {(profile.displayName || profile.username).charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="profile-info">
          <h2>{profile.displayName || profile.username}</h2>
          <p className="username">@{profile.username}</p>
          {profile.reputation !== undefined && (
            <div className="reputation">
              <span>Reputation: {profile.reputation}</span>
            </div>
          )}
        </div>
      </div>
      
      {profile.bio && (
        <div className="bio">
          <p>{profile.bio}</p>
        </div>
      )}
      
      <div className="membership">
        <h3>Forum Memberships</h3>
        <div className="forum-tags">
          {profile.forumMemberships.length > 0 ? (
            profile.forumMemberships.map(forum => (
              <span key={forum} className="forum-tag">
                {forum}
              </span>
            ))
          ) : (
            <p>Not a member of any forums</p>
          )}
        </div>
      </div>
      
      <div className="profile-meta">
        <div className="meta-item">
          <span className="label">Joined:</span>
          <span className="value">{new Date(profile.joinedAt).toLocaleDateString()}</span>
        </div>
        {profile.lastActive && (
          <div className="meta-item">
            <span className="label">Last Active:</span>
            <span className="value">{new Date(profile.lastActive).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. User Activity Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { UserActivity } from '@/lib/models/user-types';
import Link from 'next/link';

export function UserActivityFeed({ username }: { username: string }) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilter] = useState<{
    forumName?: string;
    activityType?: 'post' | 'topic' | 'vote' | 'comment';
  }>({});
  
  useEffect(() => {
    async function fetchUserActivity() {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = {
          page,
          pageSize: 10,
          ...filter,
        };
        
        const response = await apiClient.get(`/users/${username}/activity`, queryParams);
        
        setActivities(response.data);
        setTotalPages(response.meta.pagination.totalPages);
      } catch (err: any) {
        setError(err.message || `Failed to fetch activity for ${username}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserActivity();
  }, [username, page, filter]);
  
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  };
  
  if (loading && page === 1) return <div>Loading user activity...</div>;
  if (error) return <div>Error: {error}</div>;
  if (activities.length === 0) return <div>No activity found</div>;
  
  return (
    <div className="user-activity-feed">
      <h2>{username}'s Activity</h2>
      
      <div className="activity-filters">
        <div className="filter-group">
          <label>Activity Type:</label>
          <select 
            value={filter.activityType || ''} 
            onChange={(e) => handleFilterChange({
              ...filter,
              activityType: e.target.value ? e.target.value as any : undefined,
            })}
          >
            <option value="">All Types</option>
            <option value="post">Posts</option>
            <option value="topic">Topics</option>
            <option value="vote">Votes</option>
            <option value="comment">Comments</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Forum:</label>
          <select 
            value={filter.forumName || ''} 
            onChange={(e) => handleFilterChange({
              ...filter,
              forumName: e.target.value || undefined,
            })}
          >
            <option value="">All Forums</option>
            {/* This would ideally be populated from a list of available forums */}
            <option value="ethereum">Ethereum</option>
            <option value="uniswap">Uniswap</option>
            <option value="compound">Compound</option>
          </select>
        </div>
      </div>
      
      {loading && page > 1 ? (
        <div className="loading-more">Loading more activities...</div>
      ) : (
        <div className="activity-timeline">
          {activities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.activityType)}
              </div>
              
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-type">
                    {getActivityTypeLabel(activity.activityType)}
                  </span>
                  <span className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="activity-details">
                  <h3>
                    <Link href={getEntityUrl(activity)}>
                      {activity.entityTitle || 'Untitled'}
                    </Link>
                  </h3>
                  
                  {activity.content && (
                    <p className="activity-excerpt">
                      {activity.content.length > 150 
                        ? `${activity.content.substring(0, 150)}...` 
                        : activity.content}
                    </p>
                  )}
                  
                  <div className="activity-meta">
                    <span className="forum-name">
                      in {activity.forumName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
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

// Helper functions
function getActivityIcon(type: string): JSX.Element {
  switch (type) {
    case 'post':
      return <span>💬</span>;
    case 'topic':
      return <span>📝</span>;
    case 'vote':
      return <span>👍</span>;
    case 'comment':
      return <span>💭</span>;
    default:
      return <span>🔔</span>;
  }
}

function getActivityTypeLabel(type: string): string {
  switch (type) {
    case 'post':
      return 'Posted a reply';
    case 'topic':
      return 'Created a topic';
    case 'vote':
      return 'Voted on a post';
    case 'comment':
      return 'Left a comment';
    default:
      return 'Activity';
  }
}

function getEntityUrl(activity: UserActivity): string {
  switch (activity.activityType) {
    case 'post':
    case 'vote':
    case 'comment':
      return `/forums/${activity.forumName}/topics/${activity.entityId}`;
    case 'topic':
      return `/forums/${activity.forumName}/topics/${activity.entityId}`;
    default:
      return '#';
  }
}
```

## Implementation Steps

1. **Create the Data Models**
   - Implement the user-related type definitions

2. **Create the Database Service**
   - Implement the user service with database queries

3. **Implement API Routes**
   - Create the route handlers for each endpoint
   - Implement authentication and authorization checks
   - Implement error handling and response formatting

4. **Create Frontend Components**
   - Implement hooks and components to consume the API
   - Create user profile and activity components

## Caching Strategy

For improved performance, implement the following caching strategy:

1. **Server-Side Caching**
   - Cache user analytics for 1 hour
   - Cache user profiles for 15 minutes

2. **Client-Side Caching**
   - Use the API client's built-in caching for short-lived data
   - Implement stale-while-revalidate pattern for user profiles

## Security Considerations

1. **Authentication**
   - Ensure proper authentication for accessing user data
   - Implement role-based access control for sensitive endpoints

2. **Data Privacy**
   - Only expose non-sensitive user data in public endpoints
   - Ensure that users can only access their own private data

3. **Input Validation**
   - Validate and sanitize all user inputs
   - Implement proper escaping for user-generated content
