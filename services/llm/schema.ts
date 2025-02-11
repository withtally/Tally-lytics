import { z } from 'zod';

// Define the schema for PostEvaluation using Zod
export const PostEvaluationSchema = z.object({
  overall_quality: z.number(),
  helpfulness: z.number(),
  relevance: z.number(),
  unique_perspective: z.number(),
  logical_reasoning: z.number(),
  fact_based: z.number(),
  clarity: z.number(),
  constructiveness: z.number(),
  hostility: z.number(),
  emotional_tone: z.number(),
  engagement_potential: z.number(),
  persuasiveness: z.number(),
  dominant_topic: z.string(),
  key_points: z.array(z.string()),
  suggested_improvements: z.string(),
  tags: z.array(z.string()),
});

// Define schema for multiple posts
// Wrap the array schema inside an object
export const BatchEvaluationSchema = z.object({
  evaluations: z.array(PostEvaluationSchema),
});

// Define the schema for TopicEvaluation using Zod
export const TopicEvaluationSchema = z.object({
  overall_quality: z.number(),
  helpfulness: z.number(),
  relevance: z.number(),
  unique_perspective: z.number(),
  logical_reasoning: z.number(),
  fact_based: z.number(),
  clarity: z.number(),
  constructiveness: z.number(),
  hostility: z.number(),
  emotional_tone: z.number(),
  engagement_potential: z.number(),
  persuasiveness: z.number(),
  dominant_topic: z.string(),
  key_points: z.array(z.string()),
  suggested_improvements: z.string(),
  tags: z.array(z.string()),
});

// Define the schema for Topic Summary and Tags using Zod
export const TopicSummarySchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
});

// Proposal Evaluation Schema
export const ProposalEvaluationSchema = z.object({
  summary: z.string(),
  impact: z.string(),
  pros_and_cons: z.string(),
  risks_and_concerns: z.string(),
  overall_assessment: z.string(),
});
