import { DiscourseUrlHelper } from './discourseUrls';
import { ForumConfig } from '../../config/forumConfig';

interface SearchResult {
  id: number;
  title: string;
  content: string;
  topic_id: number;
  post_number?: number;
  username?: string;
  slug?: string;
  forum_name: string;
}

export class CitationFormatter {
  private urlHelper: DiscourseUrlHelper;

  constructor(forumConfig: ForumConfig) {
    this.urlHelper = new DiscourseUrlHelper(forumConfig);
  }

  /**
   * Format a search result into a citation with proper URLs
   */
  formatCitation(result: SearchResult): string {
    const parts: string[] = [];

    // Add title with URL if we have a topic_id
    if (result.topic_id) {
      const url = this.urlHelper.getTopicUrl(result.topic_id, result.slug);
      parts.push(`[${result.title}](${url})`);
    } else {
      parts.push(result.title);
    }

    // Add content
    parts.push(result.content);

    // Add post-specific URL if we have both topic_id and post_number (and post_number is positive)
    if (result.topic_id && result.post_number && result.post_number > 0) {
      const postUrl = this.urlHelper.getPostUrl(result.topic_id, result.post_number, result.slug);
      parts.push(`[View Post](${postUrl})`);
    }

    // Add author attribution if available
    if (result.username) {
      const userUrl = this.urlHelper.getUserUrl(result.username);
      parts.push(`Posted by [${result.username}](${userUrl})`);
    }

    return parts.join('\n');
  }

  /**
   * Format multiple search results into citations
   */
  formatCitations(results: SearchResult[]): string {
    return results.map(result => this.formatCitation(result)).join('\n\n');
  }
}
