import { ForumConfig } from '../../config/forumConfig';

/**
 * Helper class to generate Discourse URLs for topics and posts
 */
export class DiscourseUrlHelper {
  private discourseUrl: string;

  constructor(forumConfig: ForumConfig) {
    this.discourseUrl = forumConfig.apiConfig.discourseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Generate a URL for a topic
   * @param topicId The ID of the topic
   * @param slug Optional slug for SEO-friendly URL
   * @returns The full URL to the topic
   */
  getTopicUrl(topicId: number, slug?: string): string {
    if (slug) {
      return `${this.discourseUrl}/t/${slug}/${topicId}`;
    }
    return `${this.discourseUrl}/t/${topicId}`;
  }

  /**
   * Generate a URL for a specific post within a topic
   * @param topicId The ID of the topic containing the post
   * @param postId The ID of the specific post
   * @param slug Optional slug for SEO-friendly URL
   * @returns The full URL to the post
   */
  getPostUrl(topicId: number, postId: number, slug?: string): string {
    if (slug) {
      return `${this.discourseUrl}/t/${slug}/${topicId}/${postId}`;
    }
    return `${this.discourseUrl}/t/${topicId}/${postId}`;
  }

  /**
   * Generate a URL for a user's profile
   * @param username The username of the user
   * @returns The full URL to the user's profile
   */
  getUserUrl(username: string): string {
    return `${this.discourseUrl}/u/${username}`;
  }

  /**
   * Generate an API URL for a topic (returns JSON)
   * @param topicId The ID of the topic
   * @returns The full API URL for the topic
   */
  getTopicApiUrl(topicId: number): string {
    return `${this.discourseUrl}/t/${topicId}.json`;
  }

  /**
   * Generate an API URL for latest topics
   * @param page Optional page number for pagination
   * @returns The full API URL for latest topics
   */
  getLatestTopicsApiUrl(page?: number): string {
    const baseUrl = `${this.discourseUrl}/latest.json`;
    return page ? `${baseUrl}?page=${page}` : baseUrl;
  }
}
