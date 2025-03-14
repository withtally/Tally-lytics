import axios from 'axios';

// For local development, we'll use relative URLs which will be proxied through Next.js
// This helps avoid CORS issues when running locally
const API_BASE_URL = '';

// Define common interfaces for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Define interfaces for specific API responses
export interface SystemHealthData {
  status: string;
  timestamp: string;
  services: {
    crawler: {
      status: string;
    };
    search: {
      status: string;
    };
  };
}

// Crawler status response from the backend
export interface CrawlerProgress {
  totalDocuments?: number;
  processedDocuments?: number;
  evaluations?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CrawlerStatusItem {
  forumName: string;
  status: string;
  progress: CrawlerProgress;
  startTime?: string;
  lastRun?: string;
  lastError?: string;
  [key: string]: unknown;
}

export interface CrawlerStatusResponse {
  statuses: CrawlerStatusItem[];
  timestamp: string;
}

// Original crawler status data format
export interface CrawlerStatusData {
  status: string;
  lastRun?: string;
  nextRun?: string;
  isRunning: boolean;
  forums?: {
    [key: string]: {
      status: string;
      lastRun?: string;
      isRunning: boolean;
    };
  };
}

export interface ForumStatusData {
  status: string;
  lastRun?: string;
  isRunning: boolean;
}

export interface MarketCapData {
  tokens: Array<{
    name: string;
    symbol: string;
    price: number;
    marketCap: number;
    volume: number;
    change24h: number;
    lastUpdated: string;
  }>;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export interface CommonTopic {
  id: string;
  title: string;
  description: string;
  forums: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatPayload {
  message: string;
  forum?: string;
  context?: string;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS requests when needed
  withCredentials: false,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error('API Error:', error);
    
    // Return a rejected promise with the error
    return Promise.reject(error);
  }
);

// Crawler API
export const crawlerApi = {
  getAllStatus: async () => {
    const response = await api.get<CrawlerStatusResponse>('/api/crawl/status');
    return response.data;
  },
  
  getForumStatus: async (forumName: string) => {
    const response = await api.get<ApiResponse<ForumStatusData>>(`/api/crawl/status/${forumName}`);
    return response.data;
  },
  
  startAllCrawlers: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/crawl/start/all');
    return response.data;
  },
  
  startForumCrawler: async (forumName: string) => {
    const response = await api.post<ApiResponse<{ message: string }>>(`/api/crawl/start/${forumName}`);
    return response.data;
  },
  
  stopForumCrawler: async (forumName: string) => {
    const response = await api.post<ApiResponse<{ message: string }>>(`/api/crawl/stop/${forumName}`);
    return response.data;
  }
};

// Search API
export const searchApi = {
  searchByType: async (query: string, type: string, forum: string, limit?: number, threshold?: number) => {
    const response = await api.post<ApiResponse<Array<Record<string, unknown>>>>('/api/searchByType', {
      query,
      type,
      forum,
      limit,
      threshold
    });
    return response.data;
  },
  
  searchAll: async (query: string, forum: string, limit?: number, threshold?: number) => {
    const response = await api.post<ApiResponse<Array<Record<string, unknown>>>>('/api/searchAll', {
      query,
      forum,
      limit,
      threshold
    });
    return response.data;
  }
};

// Cron API
export const cronApi = {
  getStatus: async () => {
    const response = await api.get<ApiResponse<{ status: string; schedule?: string }>>('/api/cron/status');
    return response.data;
  },
  
  startCron: async (schedule: string) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/cron/start', { schedule });
    return response.data;
  },
  
  stopCron: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/cron/stop');
    return response.data;
  }
};

// Health API
export const healthApi = {
  getSystemHealth: async () => {
    try {
      // Log the API URL we're using
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-88af4.up.railway.app';
      console.log('API Base URL:', apiUrl);
      console.log('Attempting to fetch health data from: /api/health');
      
      // Try direct API call first
      try {
        console.log('Trying primary endpoint: /api/health');
        const response = await api.get('/api/health');
        console.log('Health API primary endpoint response:', response);
        return response;
      } catch (primaryError) {
        console.error('Primary endpoint failed:', primaryError);
        
        // Try alternative endpoints if primary fails
        try {
          console.log('Trying alternative endpoint: /health');
          const altResponse = await api.get('/health');
          console.log('Health API alternative endpoint response:', altResponse);
          return altResponse;
        } catch (altError) {
          console.error('Alternative endpoint failed:', altError);
          
          // Try direct API call to the base URL as a last resort
          try {
            console.log(`Trying direct API call: ${apiUrl}/api/health`);
            const directResponse = await axios.get(`${apiUrl}/api/health`);
            console.log('Direct API call response:', directResponse);
            return directResponse;
          } catch (directError) {
            console.error('Direct API call failed:', directError);
            throw directError;
          }
        }
      }
    } catch (error) {
      console.error('All health API attempts failed:', error);
      throw error;
    }
  },
  
  getLogs: async (forum: string) => {
    const response = await api.get<string>(`/api/logs/${forum}`, {
      responseType: 'text'
    });
    return response.data;
  }
};

// Market Cap API
export const marketCapApi = {
  getMarketCapData: async (forumName: string) => {
    const response = await api.get<ApiResponse<MarketCapData>>(`/api/marketcap/${forumName}`);
    return response.data;
  },
  
  triggerMarketCapCrawl: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/marketcap/crawl');
    return response.data;
  }
};

// News API
export const newsApi = {
  getNewsArticles: async (forumName: string) => {
    const response = await api.get<ApiResponse<NewsArticle[]>>(`/api/news/${forumName}`);
    return response.data;
  },
  
  triggerNewsCrawl: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/news/crawl');
    return response.data;
  }
};

// Common Topics API
export const commonTopicsApi = {
  getTopics: async (forums?: string) => {
    const params = forums ? { forums } : undefined;
    const response = await api.get<ApiResponse<CommonTopic[]>>('/api/common-topics', { params });
    return response.data;
  },
  
  getTopicsFull: async (forums?: string) => {
    const params = forums ? { forums } : undefined;
    const response = await api.get<ApiResponse<CommonTopic[]>>('/api/common-topics/full', { params });
    return response.data;
  },
  
  getTopicById: async (id: string) => {
    const response = await api.get<ApiResponse<CommonTopic>>(`/api/common-topics/${id}`);
    return response.data;
  },
  
  generateForForum: async (forumName: string) => {
    const response = await api.post<ApiResponse<{ message: string }>>(`/api/common-topics/generate/${forumName}`);
    return response.data;
  },
  
  generateForAllForums: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/common-topics/generate-all');
    return response.data;
  }
};

// Chat and LLM API
export const aiApi = {
  processChat: async (payload: ChatPayload) => {
    const response = await api.post<ApiResponse<{ response: string }>>('/api/chat', payload);
    return response.data;
  },
  
  generateSimile: async (query: string, forum: string) => {
    const response = await api.post<ApiResponse<{ simile: string }>>('/api/generateSimile', {
      query,
      forum
    });
    return response.data;
  },
  
  generateFollowUp: async (query: string, forum?: string, context?: string) => {
    const response = await api.post<ApiResponse<{ followUp: string[] }>>('/api/generateFollowUp', {
      query,
      forum,
      context
    });
    return response.data;
  },
  
  generateSummary: async (query: string, forum: string) => {
    const response = await api.post<ApiResponse<{ summary: string }>>('/api/generateSummary', {
      query,
      forum
    });
    return response.data;
  }
};

// Create a variable for the default export to fix the lint error
const apiServices = {
  api,
  crawlerApi,
  searchApi,
  cronApi,
  healthApi,
  marketCapApi,
  newsApi,
  commonTopicsApi,
  aiApi
};

export default apiServices;
