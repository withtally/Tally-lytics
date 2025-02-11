export interface PostEvaluation {
  id?: number;
  post_id: number;
  forum_name: string;
  llm_model: string;
  overall_quality: number;
  helpfulness: number;
  relevance: number;
  unique_perspective: number;
  logical_reasoning: number;
  fact_based: number;
  clarity: number;
  constructiveness: number;
  hostility: number;
  emotional_tone: number;
  engagement_potential: number;
  persuasiveness: number;
  dominant_topic: string | null;
  key_points: string[];
  tags: string[];
  suggested_improvements: string | null;
}

export interface Post {
  id: number;
  forum_name: string;
  plain_text: string;
  created_at: Date; // Ensure the date type matches your database return type
}
export interface TopicEvaluation {
  id?: number;
  topic_id: number;
  forum_name: string;
  llm_model: string;
  overall_quality: number;
  helpfulness: number;
  relevance: number;
  unique_perspective: number;
  logical_reasoning: number;
  fact_based: number;
  clarity: number;
  constructiveness: number;
  hostility: number;
  emotional_tone: number;
  engagement_potential: number;
  persuasiveness: number;
  dominant_topic: string | null;
  key_points: string[];
  tags: string[];
  suggested_improvements: string | null;
}
