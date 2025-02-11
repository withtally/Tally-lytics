// Ensure TopicEvaluation includes all necessary fields
export interface TopicEvaluation {
  topic_id: number;
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
  dominant_topic: string;
  key_points: string[];
  suggested_improvements: string;
  tags: string[];
  forum_name: string;
}

export interface TopicChunkEvaluation {
  llm_model: string;
  forum_name: string;
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
  dominant_topic: string;
  key_points: string[];
  suggested_improvements: string;
  tags: string[];
}

export interface TopicEvaluation extends TopicChunkEvaluation {
  topic_id: number;
}

// // First, let's ensure the TopicEvaluation interface has all required fields
// export interface ChunkEvaluation {
//   llm_model: string;
//   forum_name: string;
//   overall_quality: number;
//   helpfulness: number;
//   relevance: number;
//   unique_perspective: number;
//   logical_reasoning: number;
//   fact_based: number;
//   clarity: number;
//   constructiveness: number;
//   hostility: number;
//   emotional_tone: number;
//   engagement_potential: number;
//   persuasiveness: number;
//   dominant_topic: string;
//   key_points: string[];
//   suggested_improvements: string;
//   tags: string[];
// }

// // types.ts
// export interface BaseEvaluation {
//   overall_quality: number;
//   helpfulness: number;
//   relevance: number;
//   unique_perspective: number;
//   logical_reasoning: number;
//   fact_based: number;
//   clarity: number;
//   constructiveness: number;
//   hostility: number;
//   emotional_tone: number;
//   engagement_potential: number;
//   persuasiveness: number;
//   dominant_topic: string;
//   key_points: string[];
//   suggested_improvements: string;
//   tags: string[];
//   llm_model: string;
//   forum_name: string;
// }

// export interface TopicEvaluation extends BaseEvaluation {
//   topic_id: number;
// }

// export interface ChunkEvaluation extends BaseEvaluation {
//   chunk_index?: number;
// }

// export interface EvaluationSummary {
//   total_chunks: number;
//   average_scores: {
//     overall_quality: number;
//     helpfulness: number;
//     relevance: number;
//     unique_perspective: number;
//     logical_reasoning: number;
//     fact_based: number;
//     clarity: number;
//     constructiveness: number;
//     hostility: number;
//     emotional_tone: number;
//     engagement_potential: number;
//     persuasiveness: number;
//   };
//   dominant_topic: string;
//   key_points: string[];
//   tags: string[];
// }

// // This matches the return type from evaluateTopicChunk
// export interface TopicChunkEvaluation {
//   llm_model: string;
//   forum_name: string;
//   overall_quality: number;
//   helpfulness: number;
//   relevance: number;
//   unique_perspective: number;
//   logical_reasoning: number;
//   fact_based: number;
//   clarity: number;
//   constructiveness: number;
//   hostility: number;
//   emotional_tone: number;
//   engagement_potential: number;
//   persuasiveness: number;
//   dominant_topic: string;
//   key_points: string[];
//   suggested_improvements: string;
//   tags: string[];
// }
