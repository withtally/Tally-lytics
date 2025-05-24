// services/crawler/apiService.ts
// Added retry logic and improved error handling

import { RateLimiter } from 'limiter';
import { ApiConfig } from './types';
import { requestWithRetry } from '../../utils/requestWithRetry';
import { handleGlobalError } from '../../services/errorHandling/globalErrorHandler';

export class ApiService {
  private limiter: RateLimiter;
  private config: ApiConfig;
  private forumName: string;

  constructor(config: ApiConfig, forumName: string) {
    this.config = config;
    this.forumName = forumName;
    this.limiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });
  }

  private async fetchWithRateLimit(url: string): Promise<any> {
    await this.limiter.removeTokens(1);
    try {
      const response = await requestWithRetry(url, {
        method: 'GET',
        headers: {
          'Api-Key': this.config.apiKey,
          'Api-Username': this.config.apiUsername,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`[Forum: ${this.forumName}] Not found: ${url}`);
        }
        throw new Error(
          `[Forum: ${this.forumName}] HTTP error! status: ${response.status} on URL: ${url}`
        );
      }

      return await response.json();
    } catch (error: any) {
      handleGlobalError(error, `[Forum: ${this.forumName}] fetchWithRateLimit for ${url}`);
      throw error;
    }
  }

  async fetchUserDetails(username: string): Promise<any> {
    const url = `${this.config.discourseUrl}/u/${username}.json`;
    try {
      const data = await this.fetchWithRateLimit(url);
      return {
        user: {
          id: data.user.id,
          username: data.user.username,
          name: data.user.name,
          avatar_template: this.normalizeAvatarUrl(data.user.avatar_template),
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
          last_seen_at: data.user.last_seen_at,
          website: data.user.website,
          location: data.user.location,
          bio_raw: data.user.bio_raw,
          bio: data.user.bio_cooked,
          moderator: data.user.moderator,
          admin: data.user.admin,
        },
      };
    } catch (error: any) {
      // If user not found or API issue, log and return a minimal fallback
      handleGlobalError(error, `[Forum: ${this.forumName}] fetchUserDetails(${username})`);
      return { user: { username, name: null, avatar_template: '', id: Date.now() } };
    }
  }

  private normalizeAvatarUrl(avatarTemplate: string): string {
    if (!avatarTemplate) return '';
    return avatarTemplate.replace('{size}', '360');
  }

  async fetchNewTopics(startTime: Date): Promise<any[]> {
    if (!this.config.discourseUrl) {
      throw new Error(`[Forum: ${this.forumName}] discourseUrl is not configured`);
    }
    const url = `${this.config.discourseUrl}/latest.json`;
    try {
      const data = await this.fetchWithRateLimit(url);
      return data.topic_list.topics.filter((topic: any) => new Date(topic.created_at) > startTime);
    } catch (error: any) {
      handleGlobalError(error, `[Forum: ${this.forumName}] fetchNewTopics`);
      return [];
    }
  }

  async fetchNewPosts(topicId: number, startTime: Date): Promise<any[]> {
    if (!this.config.discourseUrl) {
      throw new Error(`[Forum: ${this.forumName}] discourseUrl is not configured`);
    }
    const url = `${this.config.discourseUrl}/t/${topicId}.json`;
    try {
      const data = await this.fetchWithRateLimit(url);
      return data.post_stream.posts.filter((post: any) => new Date(post.created_at) > startTime);
    } catch (error: any) {
      handleGlobalError(error, `[Forum: ${this.forumName}] fetchNewPosts(${topicId})`);
      return [];
    }
  }
}
