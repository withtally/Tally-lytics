import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Crawler API
export const crawlerApi = {
  getAllStatus: async () => {
    const response = await api.get<ApiResponse<any>>('/api/crawl/status');
    return response.data;
  },
  
  getForumStatus: async (forumName: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/crawl/status/${forumName}`);
    return response.data;
  },
  
  startAllCrawls: async () => {
    const response = await api.post<ApiResponse<any>>('/api/crawl/start/all');
    return response.data;
  },
  
  startForumCrawl: async (forumName: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/crawl/start/${forumName}`);
    return response.data;
  },
  
  stopForumCrawl: async (forumName: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/crawl/stop/${forumName}`);
    return response.data;
  }
};

// Search API
export const searchApi = {
  searchByType: async (query: string, type: string, forum: string, limit?: number, threshold?: number) => {
    const response = await api.post<ApiResponse<any>>('/api/searchByType', {
      query,
      type,
      forum,
      limit,
      threshold
    });
    return response.data;
  },
  
  searchAll: async (query: string, forum: string, limit?: number, threshold?: number) => {
    const response = await api.post<ApiResponse<any>>('/api/searchAll', {
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
    const response = await api.get<ApiResponse<any>>('/api/cron/status');
    return response.data;
  },
  
  startCron: async (schedule?: string) => {
    const response = await api.post<ApiResponse<any>>('/api/cron/start', { schedule });
    return response.data;
  },
  
  stopCron: async () => {
    const response = await api.post<ApiResponse<any>>('/api/cron/stop');
    return response.data;
  }
};

// Health API
export const healthApi = {
  getSystemHealth: async () => {
    const response = await api.get<ApiResponse<any>>('/api/health');
    return response.data;
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
    const response = await api.get<ApiResponse<any>>(`/api/marketcap/${forumName}`);
    return response.data;
  },
  
  triggerMarketCapCrawl: async () => {
    const response = await api.post<ApiResponse<any>>('/api/marketcap/crawl');
    return response.data;
  }
};

// News API
export const newsApi = {
  getNewsArticles: async (forumName: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/news/${forumName}`);
    return response.data;
  },
  
  triggerNewsCrawl: async () => {
    const response = await api.post<ApiResponse<any>>('/api/news/crawl');
    return response.data;
  }
};

// Common Topics API
export const commonTopicsApi = {
  getTopics: async (forums?: string) => {
    const params = forums ? { forums } : undefined;
    const response = await api.get<ApiResponse<any>>('/api/common-topics', { params });
    return response.data;
  },
  
  getFullTopics: async (forums?: string) => {
    const params = forums ? { forums } : undefined;
    const response = await api.get<ApiResponse<any>>('/api/common-topics/full', { params });
    return response.data;
  },
  
  getTopic: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/common-topics/${id}`);
    return response.data;
  },
  
  generateTopics: async (forumName: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/common-topics/generate/${forumName}`);
    return response.data;
  },
  
  generateAllTopics: async () => {
    const response = await api.post<ApiResponse<any>>('/api/common-topics/generate-all');
    return response.data;
  }
};

// Chat and LLM API
export const aiApi = {
  processChat: async (payload: any) => {
    const response = await api.post<ApiResponse<any>>('/api/chat', payload);
    return response.data;
  },
  
  generateSimilarQuery: async (query: string, forum?: string) => {
    const response = await api.post<ApiResponse<any>>('/api/generateSimile', {
      query,
      forum
    });
    return response.data;
  },
  
  generateFollowUp: async (query: string, forum?: string, context?: string) => {
    const response = await api.post<ApiResponse<any>>('/api/generateFollowUp', {
      query,
      forum,
      context
    });
    return response.data;
  }
};

export default {
  crawlerApi,
  searchApi,
  cronApi,
  healthApi,
  marketCapApi,
  newsApi,
  commonTopicsApi,
  aiApi
};
