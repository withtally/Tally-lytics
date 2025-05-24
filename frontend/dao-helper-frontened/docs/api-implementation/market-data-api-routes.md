# Market Data API Routes Implementation

## Overview
This document outlines the implementation details for the Market Data API routes, which provide access to token prices, market metrics, and historical data for DAOs and their associated tokens.

## Route Structure

```
/api/market
  ├── /tokens                        # Get token data for all tracked tokens
  ├── /tokens/[tokenSymbol]          # Get data for a specific token
  ├── /[forumName]/metrics           # Get market metrics for a specific forum
  └── /historical                    # Get historical market data
```

## Data Models

Create a types file for market-related data:

**File: `/lib/models/market-types.ts`**

```typescript
// Token data model
export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  forumName?: string;
  currentPrice: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  allTimeHigh?: number;
  allTimeHighDate?: string;
  updatedAt: string;
}

// Market metrics model
export interface MarketMetrics {
  forumName: string;
  tokenSymbol: string;
  tokenName: string;
  currentPrice: number;
  priceChangePercent: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  marketCap: number;
  fullyDilutedValuation?: number;
  volume24h: number;
  volumeChangePercent24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  allTimeHigh: number;
  allTimeHighDate: string;
  allTimeLow: number;
  allTimeLowDate: string;
  marketCapRank?: number;
  updatedAt: string;
}

// Historical data point model
export interface HistoricalDataPoint {
  timestamp: string;
  price: number;
  volume?: number;
  marketCap?: number;
}

// Historical data model
export interface HistoricalData {
  tokenSymbol: string;
  tokenName: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  timeRange: string;
  data: HistoricalDataPoint[];
}
```

## Database Service

Create a service file for market-related database queries:

**File: `/lib/services/market-service.ts`**

```typescript
import { getDbConnection } from '@/lib/db';
import { TokenData, MarketMetrics, HistoricalData } from '@/lib/models/market-types';
import { QueryParams } from '@/lib/api-types';

/**
 * Service for market-related database queries
 */
export class MarketService {
  /**
   * Get all token data
   */
  async getAllTokens(params: QueryParams = {}): Promise<{ tokens: TokenData[], total: number }> {
    const db = getDbConnection();
    const { page = 1, pageSize = 50, sortBy = 'market_cap', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;
    
    // Build query
    const query = db('token_data')
      .orderBy(sortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);
    
    // Add search filter if provided
    if (params.search) {
      query.andWhere(function() {
        this.where('symbol', 'ilike', `%${params.search}%`)
            .orWhere('name', 'ilike', `%${params.search}%`);
      });
    }
    
    // Execute query
    const tokens = await query;
    
    // Get total count
    const [{ count }] = await db('token_data').count('id as count');
    
    // Map database fields to model fields
    const mappedTokens: TokenData[] = tokens.map(token => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      forumName: token.forum_name,
      currentPrice: token.current_price,
      priceChangePercent24h: token.price_change_percent_24h,
      marketCap: token.market_cap,
      volume24h: token.volume_24h,
      circulatingSupply: token.circulating_supply,
      totalSupply: token.total_supply,
      allTimeHigh: token.all_time_high,
      allTimeHighDate: token.all_time_high_date,
      updatedAt: token.updated_at,
    }));
    
    return {
      tokens: mappedTokens,
      total: parseInt(count),
    };
  }
  
  /**
   * Get data for a specific token
   */
  async getTokenData(tokenSymbol: string): Promise<TokenData | null> {
    const db = getDbConnection();
    
    // Get token data from database
    const token = await db('token_data')
      .where({ symbol: tokenSymbol.toUpperCase() })
      .first();
    
    if (!token) {
      return null;
    }
    
    // Map database fields to model fields
    return {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      forumName: token.forum_name,
      currentPrice: token.current_price,
      priceChangePercent24h: token.price_change_percent_24h,
      marketCap: token.market_cap,
      volume24h: token.volume_24h,
      circulatingSupply: token.circulating_supply,
      totalSupply: token.total_supply,
      allTimeHigh: token.all_time_high,
      allTimeHighDate: token.all_time_high_date,
      updatedAt: token.updated_at,
    };
  }
  
  /**
   * Get market metrics for a specific forum
   */
  async getForumMarketMetrics(forumName: string): Promise<MarketMetrics | null> {
    const db = getDbConnection();
    
    // Get token data for the forum
    const token = await db('token_data')
      .where({ forum_name: forumName })
      .first();
    
    if (!token) {
      return null;
    }
    
    // Get additional market metrics
    const metrics = await db('market_metrics')
      .where({ token_id: token.id })
      .first();
    
    if (!metrics) {
      return null;
    }
    
    // Map database fields to model fields
    return {
      forumName,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      currentPrice: token.current_price,
      priceChangePercent: {
        '24h': token.price_change_percent_24h,
        '7d': metrics.price_change_percent_7d,
        '30d': metrics.price_change_percent_30d,
      },
      marketCap: token.market_cap,
      fullyDilutedValuation: metrics.fully_diluted_valuation,
      volume24h: token.volume_24h,
      volumeChangePercent24h: metrics.volume_change_percent_24h,
      circulatingSupply: token.circulating_supply,
      totalSupply: token.total_supply,
      maxSupply: metrics.max_supply,
      allTimeHigh: token.all_time_high,
      allTimeHighDate: token.all_time_high_date,
      allTimeLow: metrics.all_time_low,
      allTimeLowDate: metrics.all_time_low_date,
      marketCapRank: metrics.market_cap_rank,
      updatedAt: token.updated_at,
    };
  }
  
  /**
   * Get historical market data
   */
  async getHistoricalData(
    tokenSymbol: string,
    interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<HistoricalData | null> {
    const db = getDbConnection();
    
    // Get token info
    const token = await db('token_data')
      .where({ symbol: tokenSymbol.toUpperCase() })
      .select('id', 'name')
      .first();
    
    if (!token) {
      return null;
    }
    
    // Determine table and time range based on interval
    let tableName: string;
    let timeRange: string;
    
    switch (interval) {
      case 'hourly':
        tableName = 'token_price_hourly';
        timeRange = `${days} days`;
        break;
      case 'weekly':
        tableName = 'token_price_weekly';
        timeRange = `${days * 7} days`;
        break;
      case 'monthly':
        tableName = 'token_price_monthly';
        timeRange = `${days * 30} days`;
        break;
      case 'daily':
      default:
        tableName = 'token_price_daily';
        timeRange = `${days} days`;
        break;
    }
    
    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get historical data
    const historicalData = await db(tableName)
      .where({ token_id: token.id })
      .where('timestamp', '>=', startDate.toISOString())
      .orderBy('timestamp', 'asc')
      .select('timestamp', 'price', 'volume', 'market_cap');
    
    // Map database fields to model fields
    const mappedData: HistoricalDataPoint[] = historicalData.map(dataPoint => ({
      timestamp: dataPoint.timestamp,
      price: dataPoint.price,
      volume: dataPoint.volume,
      marketCap: dataPoint.market_cap,
    }));
    
    return {
      tokenSymbol: tokenSymbol.toUpperCase(),
      tokenName: token.name,
      interval,
      timeRange,
      data: mappedData,
    };
  }
}

// Export a singleton instance
export const marketService = new MarketService();
```

## API Route Implementations

### 1. Get All Tokens

**File: `/app/api/market/tokens/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const sortBy = searchParams.get('sortBy') || 'market_cap';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = searchParams.get('search') || undefined;
  
  try {
    // Get tokens from the database
    const { tokens, total } = await marketService.getAllTokens({
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
      data: tokens,
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
    console.error('Error fetching tokens:', error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'TOKENS_FETCH_ERROR',
          message: 'Failed to fetch token data',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2. Get Specific Token Data

**File: `/app/api/market/tokens/[tokenSymbol]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market-service';

export async function GET(
  _request: Request,
  { params }: { params: { tokenSymbol: string } }
) {
  const { tokenSymbol } = params;
  
  try {
    // Get token data from the database
    const tokenData = await marketService.getTokenData(tokenSymbol);
    
    if (!tokenData) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: `Token ${tokenSymbol} not found`,
          },
        },
        { status: 404 }
      );
    }
    
    // Return the response
    return NextResponse.json({
      data: tokenData,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching token data for ${tokenSymbol}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'TOKEN_FETCH_ERROR',
          message: `Failed to fetch data for token ${tokenSymbol}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 3. Get Forum Market Metrics

**File: `/app/api/market/[forumName]/metrics/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market-service';

export async function GET(
  _request: Request,
  { params }: { params: { forumName: string } }
) {
  const { forumName } = params;
  
  try {
    // Get market metrics for the forum
    const metrics = await marketService.getForumMarketMetrics(forumName);
    
    if (!metrics) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'METRICS_NOT_FOUND',
            message: `Market metrics for forum ${forumName} not found`,
          },
        },
        { status: 404 }
      );
    }
    
    // Return the response
    return NextResponse.json({
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching market metrics for forum ${forumName}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'METRICS_FETCH_ERROR',
          message: `Failed to fetch market metrics for forum ${forumName}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### 4. Get Historical Market Data

**File: `/app/api/market/historical/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const tokenSymbol = searchParams.get('token');
  const interval = searchParams.get('interval') as 'hourly' | 'daily' | 'weekly' | 'monthly' || 'daily';
  const days = parseInt(searchParams.get('days') || '30');
  
  if (!tokenSymbol) {
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Token symbol is required',
        },
      },
      { status: 400 }
    );
  }
  
  try {
    // Get historical data from the database
    const historicalData = await marketService.getHistoricalData(
      tokenSymbol,
      interval,
      days
    );
    
    if (!historicalData) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
          },
          error: {
            code: 'DATA_NOT_FOUND',
            message: `Historical data for token ${tokenSymbol} not found`,
          },
        },
        { status: 404 }
      );
    }
    
    // Return the response
    return NextResponse.json({
      data: historicalData,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching historical data for token ${tokenSymbol}:`, error);
    
    return NextResponse.json(
      {
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
        error: {
          code: 'HISTORICAL_FETCH_ERROR',
          message: `Failed to fetch historical data for token ${tokenSymbol}`,
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Examples

### 1. Token Price Card Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TokenData } from '@/lib/models/market-types';

export function TokenPriceCard({ tokenSymbol }: { tokenSymbol: string }) {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchTokenData() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get(`/market/tokens/${tokenSymbol}`);
        setTokenData(data);
      } catch (err: any) {
        setError(err.message || `Failed to fetch data for ${tokenSymbol}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTokenData();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchTokenData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [tokenSymbol]);
  
  if (loading) return <div>Loading token data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!tokenData) return <div>Token not found</div>;
  
  // Format currency with appropriate precision
  const formatCurrency = (value: number) => {
    if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else {
      // For small values, show more decimal places
      return `$${value.toFixed(6)}`;
    }
  };
  
  // Format large numbers with K, M, B suffixes
  const formatLargeNumber = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };
  
  return (
    <div className={`token-price-card ${tokenData.priceChangePercent24h >= 0 ? 'positive' : 'negative'}`}>
      <div className="token-header">
        <h3>{tokenData.name} ({tokenData.symbol})</h3>
        {tokenData.forumName && (
          <span className="forum-badge">{tokenData.forumName}</span>
        )}
      </div>
      
      <div className="token-price">
        <span className="current-price">{formatCurrency(tokenData.currentPrice)}</span>
        <span className={`price-change ${tokenData.priceChangePercent24h >= 0 ? 'positive' : 'negative'}`}>
          {tokenData.priceChangePercent24h >= 0 ? '▲' : '▼'} 
          {Math.abs(tokenData.priceChangePercent24h).toFixed(2)}%
        </span>
      </div>
      
      <div className="token-metrics">
        <div className="metric">
          <span className="label">Market Cap</span>
          <span className="value">{formatLargeNumber(tokenData.marketCap)}</span>
        </div>
        <div className="metric">
          <span className="label">24h Volume</span>
          <span className="value">{formatLargeNumber(tokenData.volume24h)}</span>
        </div>
        {tokenData.circulatingSupply && (
          <div className="metric">
            <span className="label">Circulating Supply</span>
            <span className="value">{Math.round(tokenData.circulatingSupply).toLocaleString()} {tokenData.symbol}</span>
          </div>
        )}
      </div>
      
      {tokenData.allTimeHigh && (
        <div className="all-time-high">
          <span className="label">All Time High</span>
          <span className="value">
            {formatCurrency(tokenData.allTimeHigh)}
            {tokenData.allTimeHighDate && (
              <span className="date">
                on {new Date(tokenData.allTimeHighDate).toLocaleDateString()}
              </span>
            )}
          </span>
        </div>
      )}
      
      <div className="updated-at">
        Updated: {new Date(tokenData.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
```

### 2. Price Chart Component

```tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { HistoricalData } from '@/lib/models/market-types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function PriceChart({ 
  tokenSymbol,
  interval = 'daily',
  days = 30
}: { 
  tokenSymbol: string;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  days?: number;
}) {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchHistoricalData() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get('/market/historical', {
          token: tokenSymbol,
          interval,
          days,
        });
        setHistoricalData(data);
      } catch (err: any) {
        setError(err.message || `Failed to fetch historical data for ${tokenSymbol}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistoricalData();
  }, [tokenSymbol, interval, days]);
  
  if (loading) return <div>Loading price chart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!historicalData || historicalData.data.length === 0) return <div>No historical data available</div>;
  
  // Format dates based on interval
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    switch (interval) {
      case 'hourly':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'daily':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'weekly':
      case 'monthly':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };
  
  // Prepare chart data
  const chartData = {
    labels: historicalData.data.map(point => formatDate(point.timestamp)),
    datasets: [
      {
        label: `${tokenSymbol} Price`,
        data: historicalData.data.map(point => point.price),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };
  
  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${historicalData.tokenName} (${historicalData.tokenSymbol}) Price Chart`,
      },
      tooltip: {
        callbacks: {
          label: (context) => `Price: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };
  
  return (
    <div className="price-chart-container">
      <div className="chart-controls">
        <div className="interval-selector">
          <button 
            className={interval === 'hourly' ? 'active' : ''} 
            onClick={() => setInterval('hourly')}
          >
            1H
          </button>
          <button 
            className={interval === 'daily' ? 'active' : ''} 
            onClick={() => setInterval('daily')}
          >
            1D
          </button>
          <button 
            className={interval === 'weekly' ? 'active' : ''} 
            onClick={() => setInterval('weekly')}
          >
            1W
          </button>
          <button 
            className={interval === 'monthly' ? 'active' : ''} 
            onClick={() => setInterval('monthly')}
          >
            1M
          </button>
        </div>
        
        <div className="time-range-selector">
          <button 
            className={days === 7 ? 'active' : ''} 
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button 
            className={days === 30 ? 'active' : ''} 
            onClick={() => setDays(30)}
          >
            30D
          </button>
          <button 
            className={days === 90 ? 'active' : ''} 
            onClick={() => setDays(90)}
          >
            90D
          </button>
          <button 
            className={days === 365 ? 'active' : ''} 
            onClick={() => setDays(365)}
          >
            1Y
          </button>
        </div>
      </div>
      
      <div className="chart-wrapper" style={{ height: '400px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
```

## Implementation Steps

1. **Create the Data Models**
   - Implement the market-related type definitions

2. **Create the Database Service**
   - Implement the market service with database queries

3. **Implement API Routes**
   - Create the route handlers for each endpoint
   - Implement error handling and response formatting

4. **Create Frontend Components**
   - Implement hooks and components to consume the API
   - Create price cards and charts for market data visualization

## Caching Strategy

For improved performance, implement the following caching strategy:

1. **Server-Side Caching**
   - Cache token list for 5 minutes
   - Cache historical data for 1 hour (for intervals longer than daily)

2. **Client-Side Caching**
   - Use the API client's built-in caching for short-lived data
   - Implement stale-while-revalidate pattern for historical data

## Data Refresh Strategy

1. **Real-time Data**
   - Implement WebSocket connections for real-time price updates
   - Use server-sent events for high-frequency data points

2. **Background Jobs**
   - Set up a background job to fetch and update token prices every 5 minutes
   - Update historical data on a scheduled basis (hourly/daily)

## Security Considerations

1. **Rate Limiting**
   - Implement rate limiting for high-traffic endpoints
   - Add caching headers to reduce unnecessary requests

2. **Data Validation**
   - Validate all query parameters
   - Implement proper error handling for external API failures
