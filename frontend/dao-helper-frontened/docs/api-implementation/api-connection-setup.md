# API Connection Setup Documentation

## Overview
This document outlines the implementation details for setting up the connection between the Next.js frontend and the backend database. The API will provide a structured way to access DAO forum data, governance information, news articles, user insights, and market data.

## Database Connection Configuration

### 1. Environment Variables Setup

Create a `.env.local` file in the root of your Next.js project with the following variables:

```
# Database Connection
DB_CONNECTION_STRING=postgresql://user:password@localhost:5432/dao_helper_db
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000

# API Configuration
API_CACHE_TTL=60000
API_RATE_LIMIT=100
```

### 2. Database Connection Utility

Create a utility file to handle database connections:

**File: `/lib/db.ts`**

```typescript
import { Pool } from 'pg';
import { Knex, knex } from 'knex';

// Connection singleton
let connection: Knex | null = null;

// Configuration object
const knexConfig = {
  client: 'pg',
  connection: process.env.DB_CONNECTION_STRING,
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
  }
};

/**
 * Get a database connection
 * Uses a singleton pattern to reuse connections
 */
export function getDbConnection(): Knex {
  if (!connection) {
    connection = knex(knexConfig);
  }
  return connection;
}

/**
 * Close the database connection
 * Should be called when the application shuts down
 */
export async function closeDbConnection(): Promise<void> {
  if (connection) {
    await connection.destroy();
    connection = null;
  }
}

/**
 * Check if the database connection is healthy
 * @returns {Promise<boolean>} True if the connection is healthy
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    const db = getDbConnection();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

### 3. API Response Types

Create a types file for API responses:

**File: `/lib/api-types.ts`**

```typescript
// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Common query parameters
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

// Error response
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}
```

### 4. API Middleware Setup

Create middleware for common API functionality:

**File: `/lib/api-middleware.ts`**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, ErrorResponse } from './api-types';
import { checkDbHealth } from './db';

// Rate limiting configuration
const RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100');
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

/**
 * Middleware to handle API responses
 */
export function withApiHandler<T>(
  handler: (req: NextApiRequest, res: NextApiResponse, requestId: string) => Promise<T>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = uuidv4();
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Check rate limiting
    const clientIp = req.headers['x-forwarded-for'] as string || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return sendErrorResponse(res, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      }, 429, requestId);
    }
    
    // Check database health
    const isDbHealthy = await checkDbHealth();
    if (!isDbHealthy) {
      return sendErrorResponse(res, {
        code: 'DATABASE_ERROR',
        message: 'Database connection error',
      }, 503, requestId);
    }
    
    try {
      // Execute the handler
      const data = await handler(req, res, requestId);
      
      // If the response has already been sent, return
      if (res.writableEnded) {
        return;
      }
      
      // Send the response
      return sendSuccessResponse(res, data, requestId);
    } catch (error: any) {
      console.error(`[${requestId}] API error:`, error);
      
      return sendErrorResponse(res, {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, error.statusCode || 500, requestId);
    }
  };
}

/**
 * Send a success response
 */
function sendSuccessResponse<T>(
  res: NextApiResponse,
  data: T,
  requestId: string,
  statusCode = 200,
  meta: any = {}
) {
  const response: ApiResponse<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      ...meta,
    },
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
function sendErrorResponse(
  res: NextApiResponse,
  error: ErrorResponse,
  statusCode = 500,
  requestId: string
) {
  const response: ApiResponse<null> = {
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
    error,
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Check if a client has exceeded the rate limit
 */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);
  
  if (!clientData) {
    // First request from this client
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (now > clientData.resetTime) {
    // Reset window has passed
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment request count
  clientData.count += 1;
  rateLimitMap.set(clientIp, clientData);
  return true;
}
```

### 5. API Client for Frontend

Create a client to consume the API from the frontend:

**File: `/lib/api-client.ts`**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, QueryParams } from './api-types';

// Default configuration
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Cache configuration
const CACHE_TTL = parseInt(process.env.API_CACHE_TTL || '60000'); // 1 minute
const cache = new Map<string, { data: any, timestamp: number }>();

/**
 * API client for making requests to the backend
 */
export class ApiClient {
  private client: AxiosInstance;
  
  constructor(config: AxiosRequestConfig = {}) {
    this.client = axios.create({
      ...DEFAULT_CONFIG,
      ...config,
    });
    
    // Add request interceptor for authentication if needed
    this.client.interceptors.request.use((config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Handle unauthorized
          console.error('Unauthorized access');
          // Redirect to login or refresh token
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Make a GET request with optional caching
   */
  async get<T>(url: string, params?: QueryParams, useCache = true): Promise<T> {
    const cacheKey = `${url}:${JSON.stringify(params || {})}`;
    
    // Check cache if enabled
    if (useCache) {
      const cachedData = cache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
        return cachedData.data;
      }
    }
    
    // Make the request
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, { params });
    
    // Cache the response if enabled
    if (useCache) {
      cache.set(cacheKey, {
        data: response.data.data,
        timestamp: Date.now(),
      });
    }
    
    return response.data.data;
  }
  
  /**
   * Make a POST request
   */
  async post<T>(url: string, data: any): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data);
    return response.data.data;
  }
  
  /**
   * Make a PUT request
   */
  async put<T>(url: string, data: any): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data);
    return response.data.data;
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url);
    return response.data.data;
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    cache.clear();
  }
  
  /**
   * Clear a specific cache entry
   */
  clearCacheEntry(url: string, params?: QueryParams): void {
    const cacheKey = `${url}:${JSON.stringify(params || {})}`;
    cache.delete(cacheKey);
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();
```

## Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install knex pg uuid axios
   ```

2. **Configure Environment Variables**
   - Create `.env.local` with the required variables
   - Update `.gitignore` to exclude `.env.local`

3. **Create Utility Files**
   - Implement the database connection utility
   - Implement the API middleware
   - Implement the API client

4. **Test the Connection**
   - Create a health check endpoint
   - Verify database connectivity

5. **Implement API Routes**
   - Follow the route-specific implementation documents

## Testing the Setup

Create a health check endpoint to test the setup:

**File: `/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

export async function GET() {
  const isDbHealthy = await checkDbHealth();
  
  return NextResponse.json({
    status: 'ok',
    database: isDbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
}
```

## Next Steps

After setting up the basic API connection, proceed to implement the specific API routes as outlined in the route-specific implementation documents.
