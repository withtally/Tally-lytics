import { estimateTokens } from '../../utils/tokenizer';
import { Logger } from '../logging';
import { TopicEvaluation } from './types';
import { summarizeTopicContent, evaluateTopicChunk } from './topicEvaluation';
import { TopicChunkEvaluation } from './types';
import db from '../../db/db';

const MAX_TOKENS: number = 4000;
const CHUNK_TOKEN_LIMIT: number = MAX_TOKENS - 500; // Leave margin for metadata and response tokens

export async function fetchAndSummarizeTopics(forumName: string): Promise<void> {
  const topics = await db('topics').where({ forum_name: forumName, ai_summary: null }).select('id');

  for (const topic of topics) {
    // Fetch the first post of the topic
    const firstPost = await db('posts')
      .where({ topic_id: topic.id })
      .orderBy('created_at')
      .first()
      .select('plain_text');

    if (!firstPost) {
      console.log(`No posts found for topic ID ${topic.id}`);
      continue;
    }

    // Summarize the content of the first post
    const { summary, tags } = await summarizeTopicContent(firstPost.plain_text);
    console.log('Tagged summary: ', summary, tags);
    // Update the thread with the summary
    await db('topics').where({ id: topic.id }).update({
      ai_summary: summary,
    });

    for (const tagName of tags) {
      const selectedTag = tagName.toUpperCase();
      let tag = await db('tags').where({ name: selectedTag }).first();

      // Update this part
      if (!tag) {
        [tag] = await db('tags')
          .insert({ name: selectedTag })
          .onConflict('name')
          .merge()
          .returning('*');
      }

      // This part is correct, but make sure it's inside a transaction
      await db('topic_tags')
        .insert({
          topic_id: topic.id,
          forum_name: forumName,
          tag_id: tag.id,
        })
        .onConflict(['topic_id', 'forum_name', 'tag_id'])
        .ignore();
    }

    console.log(`Summarized and tagged topic ID ${topic.id}`);
  }
}

export async function evaluateUnanalyzedTopics(forumName: string): Promise<void> {
  const logger = new Logger({
    logFile: 'logs/topic-evaluation.log',
    level: 'info',
  });

  try {
    const unanalyzedTopics = await db('topics as t')
      .leftJoin('topic_evaluations as te', function () {
        this.on('t.id', '=', 'te.topic_id').andOn('t.forum_name', '=', 'te.forum_name');
      })
      .whereNull('te.id')
      .where('t.forum_name', forumName)
      .select('t.id', 't.forum_name');

    for (const topic of unanalyzedTopics) {
      await db.transaction(async trx => {
        try {
          // Double-check within transaction that no evaluation exists
          const existingEval = await trx('topic_evaluations')
            .where({
              topic_id: topic.id,
              forum_name: topic.forum_name, // Add this
            })
            .first();

          if (existingEval) {
            logger.info(`Topic ${topic.id} already has evaluation, skipping`);
            return;
          }

          const posts = await trx('posts')
            .where({
              topic_id: topic.id,
              forum_name: topic.forum_name,
            })
            .orderBy('created_at')
            .select('plain_text');

          const topicText = posts.map(post => post.plain_text).join('\n\n');

          if (!topicText) {
            logger.warn(`Topic ID ${topic.id} has no content`);
            return;
          }

          // Process chunks with proper typing
          const chunks = chunkText(topicText, CHUNK_TOKEN_LIMIT);
          const chunkEvaluations: TopicChunkEvaluation[] = [];

          for (const chunk of chunks) {
            const evaluation = await evaluateTopicChunk(chunk, topic.forum_name);
            chunkEvaluations.push(evaluation);
          }

          // Add proper type annotation for aggregateEvaluations
          const aggregatedEvaluation: TopicEvaluation = aggregateEvaluations(chunkEvaluations);
          aggregatedEvaluation.topic_id = topic.id;
          aggregatedEvaluation.forum_name = topic.forum_name; // Make sure this is set

          // Rest of the code remains the same...
        } catch (error: any) {
          logger.error(`Error evaluating topic ${topic.id}:`, error);
          throw error;
        }
      });
    }
  } catch (error: any) {
    logger.error('Error in evaluateUnanalyzedTopics:', error);
    throw error;
  }
}

function aggregateEvaluations(evaluations: TopicChunkEvaluation[]): TopicEvaluation {
  // Update the aggregateEvaluations function with proper typing
  const numEvaluations = evaluations.length;

  // Initialize aggregate sums
  const sumFields = {
    overall_quality: 0,
    helpfulness: 0,
    relevance: 0,
    unique_perspective: 0,
    logical_reasoning: 0,
    fact_based: 0,
    clarity: 0,
    constructiveness: 0,
    hostility: 0,
    emotional_tone: 0,
    engagement_potential: 0,
    persuasiveness: 0,
  };

  const dominantTopics: Record<string, number> = {};
  const keyPointsSet = new Set<string>();
  const tagsSet = new Set<string>();
  let suggestedImprovements = '';

  evaluations.forEach(evaluation => {
    // Sum numerical fields
    sumFields.overall_quality += evaluation.overall_quality;
    sumFields.helpfulness += evaluation.helpfulness;
    sumFields.relevance += evaluation.relevance;
    sumFields.unique_perspective += evaluation.unique_perspective;
    sumFields.logical_reasoning += evaluation.logical_reasoning;
    sumFields.fact_based += evaluation.fact_based;
    sumFields.clarity += evaluation.clarity;
    sumFields.constructiveness += evaluation.constructiveness;
    sumFields.hostility += evaluation.hostility;
    sumFields.emotional_tone += evaluation.emotional_tone;
    sumFields.engagement_potential += evaluation.engagement_potential;
    sumFields.persuasiveness += evaluation.persuasiveness;

    // Count dominant topics
    dominantTopics[evaluation.dominant_topic] =
      (dominantTopics[evaluation.dominant_topic] || 0) + 1;

    // Collect key points and tags
    evaluation.key_points.forEach(kp => keyPointsSet.add(kp));
    evaluation.tags.forEach(tag => tagsSet.add(tag));

    // Concatenate suggested improvements
    suggestedImprovements += evaluation.suggested_improvements + '\n';
  });

  // Calculate averages
  const averagedFields = {
    overall_quality: Math.round(sumFields.overall_quality / numEvaluations),
    helpfulness: Math.round(sumFields.helpfulness / numEvaluations),
    relevance: Math.round(sumFields.relevance / numEvaluations),
    unique_perspective: Math.round(sumFields.unique_perspective / numEvaluations),
    logical_reasoning: Math.round(sumFields.logical_reasoning / numEvaluations),
    fact_based: Math.round(sumFields.fact_based / numEvaluations),
    clarity: Math.round(sumFields.clarity / numEvaluations),
    constructiveness: Math.round(sumFields.constructiveness / numEvaluations),
    hostility: Math.round(sumFields.hostility / numEvaluations),
    emotional_tone: Math.round(sumFields.emotional_tone / numEvaluations),
    engagement_potential: Math.round(sumFields.engagement_potential / numEvaluations),
    persuasiveness: Math.round(sumFields.persuasiveness / numEvaluations),
  };

  // Determine the most frequent dominant topic
  const dominantTopic = Object.entries(dominantTopics).sort((a, b) => b[1] - a[1])[0][0];

  return {
    topic_id: 0, // Will be set later
    llm_model: evaluations[0].llm_model,
    forum_name: evaluations[0].forum_name,
    ...averagedFields,
    dominant_topic: dominantTopic,
    key_points: Array.from(keyPointsSet),
    suggested_improvements: suggestedImprovements.trim(),
    tags: Array.from(tagsSet),
  };
}

// Helper function to chunk text based on token limit
export function chunkText(text: string, maxTokens: number) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If adding the sentence exceeds max tokens, push current chunk to chunks
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
      currentTokens = 0;
    }

    currentChunk += sentence + ' ';
    currentTokens += sentenceTokens;
  }

  // Add any remaining text as the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
