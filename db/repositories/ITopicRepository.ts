// db/repositories/ITopicRepository.ts - Repository interface for topics

export interface Topic {
  id: string;
  forum_name: string;
  title: string;
  posts_count: number;
  created_at: Date;
  updated_at: Date;
  discourse_topic_id?: number;
  category_id?: number;
  slug?: string;
  views?: number;
  reply_count?: number;
  like_count?: number;
  last_posted_at?: Date;
  ai_summary?: string;
  ai_tags?: string[];
  quality_score?: number;
}

export interface TopicFilter {
  forum_name?: string;
  category_id?: number;
  has_summary?: boolean;
  created_after?: Date;
  created_before?: Date;
  min_posts?: number;
  max_posts?: number;
}

export interface TopicWithPosts extends Topic {
  posts: Array<{
    id: string;
    content: string;
    author: string;
    created_at: Date;
    post_number: number;
  }>;
}

/**
 * Repository interface for topic data operations
 */
export interface ITopicRepository {
  /**
   * Find topics by various filters
   */
  find(filter: TopicFilter): Promise<Topic[]>;

  /**
   * Find a single topic by ID
   */
  findById(id: string): Promise<Topic | null>;

  /**
   * Find topic with its posts
   */
  findWithPosts(id: string): Promise<TopicWithPosts | null>;

  /**
   * Find topics that need AI summary
   */
  findNeedingSummary(forumName?: string): Promise<Topic[]>;

  /**
   * Create a new topic
   */
  create(topic: Omit<Topic, 'created_at' | 'updated_at'>): Promise<Topic>;

  /**
   * Update an existing topic
   */
  update(id: string, updates: Partial<Topic>): Promise<Topic>;

  /**
   * Update topic with AI summary and tags
   */
  updateSummary(
    id: string,
    summary: {
      ai_summary: string;
      ai_tags: string[];
      quality_score?: number;
    }
  ): Promise<void>;

  /**
   * Delete a topic
   */
  delete(id: string): Promise<void>;

  /**
   * Get topic count by forum
   */
  getCountByForum(forumName: string): Promise<number>;

  /**
   * Get recent topics for a forum
   */
  getRecent(forumName: string, limit?: number): Promise<Topic[]>;

  /**
   * Get popular topics (by views, replies, likes)
   */
  getPopular(forumName: string, limit?: number): Promise<Topic[]>;

  /**
   * Batch operations
   */
  createMany(topics: Omit<Topic, 'created_at' | 'updated_at'>[]): Promise<Topic[]>;
  updateMany(updates: Array<{ id: string; updates: Partial<Topic> }>): Promise<void>;
}
