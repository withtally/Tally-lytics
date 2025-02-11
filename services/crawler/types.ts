// File: /Users/dennisonbertram/develop/discourse-demo/services/crawler/types.ts

export interface ApiConfig {
  apiKey: string;
  apiUsername: string;
  discourseUrl: string;
}

export interface DbConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?:
    | boolean
    | {
        rejectUnauthorized: boolean;
        require: boolean;
      };
}

export interface LogConfig {
  level: string;
}

export interface CrawlerConfig {
  apiConfig: ApiConfig;
  logConfig: LogConfig;
  forumName: string;
}
