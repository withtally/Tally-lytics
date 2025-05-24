# Governance API Routes Implementation

## Overview
This document outlines the implementation details for the Governance API routes, which provide access to DAO governance data including proposals and voting statistics.

## Route Structure

```
/api/governance
  ├── /proposals                     # Get all governance proposals
  ├── /[forumName]/proposals         # Get proposals for a specific forum
  └── /stats                         # Get governance participation statistics
```

## Data Models

Create a types file for governance-related data:

**File: `/lib/models/governance-types.ts`**

```typescript
// Proposal model
export interface Proposal {
  id: string;
  forumName: string;
  onchainId: string;
  originalId?: string;
  status: string;
  description?: string;
  title?: string;
  startTimestamp?: string;
  governorId: string;
  governorName?: string;
  quorum?: string;
  timelockId?: string;
  tokenDecimals?: number;
  voteStats?: VoteStats;
  createdAt: string;
  updatedAt: string;
}

// Vote statistics model
export interface VoteStats {
  for: string;
  against: string;
  abstain: string;
  total: string;
  quorumReached: boolean;
  participation: number;
}

// Governance statistics model
export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  successfulProposals: number;
  failedProposals: number;
  averageParticipation: number;
  proposalsByForum: Array<{
    forumName: string;
    count: number;
  }>;
  proposalsByStatus: Array<{
    status: string;
    count: number;
  }>;
  participationTrend: Array<{
    month: string;
    participation: number;
  }>;
}
```

## Database Service

Create a service file for governance-related database queries:

**File: `/lib/services/governance-service.ts`**

```typescript
import { getDbConnection } from '@/lib/db';
import { Proposal, GovernanceStats } from '@/lib/models/governance-types';
import { QueryParams } from '@/lib/api-types';

/**
 * Service for governance-related database queries
 */
export class GovernanceService {
  /**
   * Get all proposals
   */
  async getAllProposals(params: QueryParams = {}): Promise<{ proposals: Proposal[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('tally_proposals')
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere(function() {
        this.where('title', 'ilike', `%${params.search}%`)
            .orWhere('description', 'ilike', `%${params.search}%`);
      });
    }
    
    // Add status filter if provided
    if (params.filter?.status) {
      query.andWhere('status', params.filter.status);
    }
    
    // Execute query
    const proposals = await query;
    
    // Get total count
    const [{ count }] = await db('tally_proposals').count('id as count');
    
    // Map database fields to model fields
    const mappedProposals: Proposal[] = proposals.map(proposal => ({
      id: proposal.id,
      forumName: proposal.forum_name,
      onchainId: proposal.onchain_id,
      originalId: proposal.original_id,
      status: proposal.status,
      description: proposal.description,
      title: proposal.title,
      startTimestamp: proposal.start_timestamp,
      governorId: proposal.governor_id,
      governorName: proposal.governor_name,
      quorum: proposal.quorum,
      timelockId: proposal.timelock_id,
      tokenDecimals: proposal.token_decimals,
      voteStats: proposal.vote_stats ? JSON.parse(proposal.vote_stats) : undefined,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    }));
    
    return {
      proposals: mappedProposals,
      total: parseInt(count),
    };
  }
  
  /**
   * Get proposals for a specific forum
   */
  async getForumProposals(forumName: string, params: QueryParams = {}): Promise<{ proposals: Proposal[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('tally_proposals')
      .where({ forum_name: forumName })
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere(function() {
        this.where('title', 'ilike', `%${params.search}%`)
            .orWhere('description', 'ilike', `%${params.search}%`);
      });
    }
    
    // Add status filter if provided
    if (params.filter?.status) {
      query.andWhere('status', params.filter.status);
    }
    
    // Execute query
    const proposals = await query;
    
    // Get total count
    const [{ count }] = await db('tally_proposals')
      .where({ forum_name: forumName })
      .count('id as count');
    
    // Map database fields to model fields
    const mappedProposals: Proposal[] = proposals.map(proposal => ({
      id: proposal.id,
      forumName: proposal.forum_name,
      onchainId: proposal.onchain_id,
      originalId: proposal.original_id,
      status: proposal.status,
      description: proposal.description,
      title: proposal.title,
      startTimestamp: proposal.start_timestamp,
      governorId: proposal.governor_id,
      governorName: proposal.governor_name,
      quorum: proposal.quorum,
      timelockId: proposal.timelock_id,
      tokenDecimals: proposal.token_decimals,
      voteStats: proposal.vote_stats ? JSON.parse(proposal.vote_stats) : undefined,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    }));
    
    return {
      proposals: mappedProposals,
      total: parseInt(count),
    };
  }
  
  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<GovernanceStats> {
    const db = getDbConnection();
    
    // Get total proposals
    const [totalResult] = await db('tally_proposals').count('id as count');
    const totalProposals = parseInt(totalResult.count);
    
    // Get proposals by status
    const proposalsByStatus = await db('tally_proposals')
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    // Get proposals by forum
    const proposalsByForum = await db('tally_proposals')
      .select('forum_name')
      .count('id as count')
      .groupBy('forum_name')
      .orderBy('count', 'desc');
    
    // Get participation trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const participationTrend = await db('tally_proposals')
      .whereNotNull('vote_stats')
      .whereRaw('created_at >= ?', [twelveMonthsAgo.toISOString()])
      .select(db.raw("to_char(created_at, 'YYYY-MM') as month"))
      .avg('(vote_stats->>'participation')::numeric as avg_participation')
      .groupBy('month')
      .orderBy('month');
    
    // Calculate statistics
    const statusCounts = proposalsByStatus.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);
    
    const activeProposals = statusCounts['active'] || 0;
    const successfulProposals = statusCounts['succeeded'] || 0;
    const failedProposals = statusCounts['failed'] || 0;
    
    // Calculate average participation
    const [participationResult] = await db('tally_proposals')
      .whereNotNull('vote_stats')
      .avg('(vote_stats->>'participation')::numeric as avg_participation');
    
    const averageParticipation = parseFloat(participationResult.avg_participation) || 0;
    
    return {
      totalProposals,
      activeProposals,
      successfulProposals,
      failedProposals,
      averageParticipation,
      proposalsByForum: proposalsByForum.map(item => ({
        forumName: item.forum_name,
        count: parseInt(item.count),
      })),
      proposalsByStatus: proposalsByStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count),
      })),
      participationTrend: participationTrend.map(item => ({
        month: item.month,
        participation: parseFloat(item.avg_participation) || 0,
      })),
    };
  }
}

// Export a singleton instance
export const governanceService = new GovernanceService();
```

## API Route Implementations

### 1. Get All Proposals

**File: `/app/api/governance/proposals/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { governanceService } from '@/lib/services/governance-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  
  try {
    // Get proposals from the database
    const { proposals, total } = await governanceService.getAllProposals({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      filter: status ? { status } : undefined,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: proposals,
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
    console.error('Error fetching proposals:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'PROPOSALS_FETCH_ERROR',
          message: 'Failed to fetch proposals',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2. Get Proposals for a Specific Forum

**File: `/app/api/governance/[forumName]/proposals/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { governanceService } from '@/lib/services/governance-service';

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
  const status = searchParams.get('status') || undefined;
  
  try {
    // Get proposals from the database
    const { proposals, total } = await governanceService.getForumProposals(forumName, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      filter: status ? { status } : undefined,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    
    // Return the response
    return NextResponse.json({
      data: proposals,
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
    console.error(`Error fetching proposals for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'PROPOSALS_FETCH_ERROR',
          message: `Failed to fetch proposals for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 3. Get Governance Statistics

**File: `/app/api/governance/stats/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { governanceService } from '@/lib/services/governance-service';

export async function GET() {
  try {
    // Get governance stats from the database
    const stats = await governanceService.getGovernanceStats();
    
    // Return the response
    return NextResponse.json({
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching governance stats:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'STATS_FETCH_ERROR',
          message: 'Failed to fetch governance statistics',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Examples

### 1. Displaying Proposals

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Proposal } from '@/lib/models/governance-types';

export function ProposalsList({ forumName }: { forumName?: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  useEffect(() => {
    async function fetchProposals() {
      setLoading(true);
      setError(null);
      
      try {
        const endpoint = forumName 
          ? `/governance/${forumName}/proposals` 
          : '/governance/proposals';
        
        const response = await apiClient.get(endpoint, {
          page,
          pageSize: 10,
          sortBy: 'start_timestamp',
          sortOrder: 'desc',
        });
        
        setProposals(response.data);
        setTotalPages(response.meta.pagination.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch proposals');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProposals();
  }, [forumName, page]);
  
  if (loading) return <div>Loading proposals...</div>;
  if (error) return <div>Error: {error}</div>;
  if (proposals.length === 0) return <div>No proposals found</div>;
  
  return (
    <div className="proposals-list">
      <h2>{forumName ? `${forumName} Proposals` : 'All Proposals'}</h2>
      
      <div className="proposals-grid">
        {proposals.map(proposal => (
          <div key={proposal.id} className="proposal-card">
            <div className={`status-badge ${proposal.status}`}>
              {proposal.status}
            </div>
            <h3>{proposal.title || 'Untitled Proposal'}</h3>
            <p className="description">
              {proposal.description 
                ? (proposal.description.length > 150 
                   ? `${proposal.description.substring(0, 150)}...` 
                   : proposal.description)
                : 'No description available'}
            </p>
            <div className="proposal-meta">
              <span>Started: {new Date(proposal.startTimestamp || '').toLocaleDateString()}</span>
              {proposal.voteStats && (
                <div className="vote-stats">
                  <div className="progress-bar">
                    <div 
                      className="progress-for" 
                      style={{ width: `${proposal.voteStats.participation * 100}%` }}
                    ></div>
                  </div>
                  <span>Participation: {(proposal.voteStats.participation * 100).toFixed(1)}%</span>
                </div>
              )}
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

### 2. Governance Dashboard

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { GovernanceStats } from '@/lib/models/governance-types';
import { PieChart, BarChart, LineChart } from 'your-chart-library';

export function GovernanceDashboard() {
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get('/governance/stats');
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch governance statistics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);
  
  if (loading) return <div>Loading governance statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No statistics available</div>;
  
  return (
    <div className="governance-dashboard">
      <h2>Governance Dashboard</h2>
      
      <div className="stats-summary">
        <div className="stat-card">
          <h3>Total Proposals</h3>
          <p>{stats.totalProposals}</p>
        </div>
        <div className="stat-card">
          <h3>Active Proposals</h3>
          <p>{stats.activeProposals}</p>
        </div>
        <div className="stat-card">
          <h3>Successful Proposals</h3>
          <p>{stats.successfulProposals}</p>
        </div>
        <div className="stat-card">
          <h3>Failed Proposals</h3>
          <p>{stats.failedProposals}</p>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Proposals by Status</h3>
          <PieChart
            data={stats.proposalsByStatus}
            nameKey="status"
            valueKey="count"
            title="Proposal Status Distribution"
          />
        </div>
        
        <div className="chart-container">
          <h3>Proposals by Forum</h3>
          <BarChart
            data={stats.proposalsByForum}
            xKey="forumName"
            yKey="count"
            title="Proposals per Forum"
          />
        </div>
      </div>
      
      <div className="chart-container">
        <h3>Participation Trend</h3>
        <LineChart
          data={stats.participationTrend}
          xKey="month"
          yKey="participation"
          title="Monthly Participation Rate"
          formatter={(value) => `${(value * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
```

## Implementation Steps

1. **Create the Data Models**
   - Implement the governance-related type definitions

2. **Create the Database Service**
   - Implement the governance service with database queries

3. **Implement API Routes**
   - Create the route handlers for each endpoint
   - Implement error handling and response formatting

4. **Create Frontend Components**
   - Implement hooks and components to consume the API
   - Create visualizations for governance data

## Caching Strategy

For improved performance, implement the following caching strategy:

1. **Server-Side Caching**
   - Cache governance stats for 1 hour
   - Cache proposal lists for 5 minutes

2. **Client-Side Caching**
   - Use the API client's built-in caching for short-lived data
   - Implement stale-while-revalidate pattern for frequently accessed data

## Security Considerations

1. **Input Validation**
   - Sanitize all user inputs
   - Validate forum names against allowed list

2. **Query Parameter Validation**
   - Validate and sanitize all query parameters
   - Implement maximum limits for pagination
