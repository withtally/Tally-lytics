// db/repositories/IPostRepository.ts - Repository interface for posts

export interface Post {
  id: string;
  topic_id: string;
  forum_name: string;
  title?: string;
  content: string;
  author: string;
  author_id: string;
  post_number: number;
  created_at: Date;
  updated_at: Date;
  reply_count?: number;
  like_count?: number;
  raw?: string;
  cooked?: string;
  discourse_post_id?: number;
  discourse_topic_id?: number;
  avatar_template?: string;
  username?: string;
  evaluated?: boolean;
  ai_summary?: string;
  ai_tags?: string[];
  quality_score?: number;
  relevance_score?: number;
}

export interface PostEvaluation {
  id: string;
  post_id: string;
  forum_name: string;
  quality_score: number;
  relevance_score: number;
  summary: string;
  tags: string[];
  evaluation_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface PostFilter {
  forum_name?: string;
  evaluated?: boolean;
  author?: string;
  topic_id?: string;
  created_after?: Date;
  created_before?: Date;
  quality_score_min?: number;
  quality_score_max?: number;
}

export interface PostWithEvaluation extends Post {
  evaluation?: PostEvaluation;
}

/**
 * Repository interface for post data operations
 * This abstraction allows for easy testing and database independence
 */
export interface IPostRepository {
  /**
   * Find posts by various filters
   */
  find(filter: PostFilter): Promise<Post[]>;

  /**
   * Find a single post by ID
   */
  findById(id: string): Promise<Post | null>;

  /**
   * Find posts that need evaluation (not yet evaluated)
   */
  findUnevaluated(forumName?: string): Promise<Post[]>;

  /**
   * Find posts with their evaluations
   */
  findWithEvaluations(filter: PostFilter): Promise<PostWithEvaluation[]>;

  /**
   * Create a new post
   */
  create(post: Omit<Post, 'created_at' | 'updated_at'>): Promise<Post>;

  /**
   * Update an existing post
   */
  update(id: string, updates: Partial<Post>): Promise<Post>;

  /**
   * Mark a post as evaluated with scores and summary
   */
  markAsEvaluated(
    id: string,
    evaluation: {
      quality_score: number;
      relevance_score: number;
      ai_summary: string;
      ai_tags: string[];
    }
  ): Promise<void>;

  /**
   * Delete a post
   */
  delete(id: string): Promise<void>;

  /**
   * Get posts count by forum
   */
  getCountByForum(forumName: string): Promise<number>;

  /**
   * Get recent posts for a forum
   */
  getRecent(forumName: string, limit?: number): Promise<Post[]>;

  /**
   * Batch operations for performance
   */
  createMany(posts: Omit<Post, 'created_at' | 'updated_at'>[]): Promise<Post[]>;
  updateMany(updates: Array<{ id: string; updates: Partial<Post> }>): Promise<void>;
}
