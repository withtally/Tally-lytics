import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources/chat/completions';
import { zodResponseFormat } from 'openai/helpers/zod';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

import { roundNumericFields } from '../../utils/numberUtils';
import { PostEvaluation } from '../../db/models/types';

//schema
import { PostEvaluationSchema, BatchEvaluationSchema } from './schema';

// prompts
import { systemPostPrompt } from './prompt';

//open AI
import { openai, model } from './openaiClient';

import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { sanitizeContent } from './contentProcessorService';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/post-evaluation.log',
});

export async function evaluatePostsBatch(
  postContents: string[],
  forumName: string
): Promise<PostEvaluation[] | null> {
  return withLLMErrorHandling(async () => {
    // Create messages array with system message and user messages for each post content
    const messages: (ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam)[] = [
      {
        role: 'system',
        content: systemPostPrompt,
      } as ChatCompletionSystemMessageParam,
      ...postContents.map(
        (content, index) =>
          ({
            role: 'user',
            content: `Post ${index + 1}: ${sanitizeContent(content)}`,
          }) as ChatCompletionUserMessageParam
      ),
    ];

    try {
      logger.info('Starting to evaluate posts in batch...');
      const completion = await openai.beta.chat.completions.parse({
        model,
        messages: messages,
        response_format: zodResponseFormat(BatchEvaluationSchema, 'batch_evaluation'),
      });

      const evaluationData = completion.choices[0].message.parsed;

      if (!evaluationData) {
        throw new Error('Received null response from OpenAI');
      }

      logger.info('Batch post evaluation completed', { batchSize: postContents.length });

      return evaluationData.evaluations.map(
        evaluation =>
          roundNumericFields({
            post_id: 0, // Placeholder, set as needed
            forum_name: forumName,
            llm_model: model,
            ...evaluation,
            key_points: Array.isArray(evaluation.key_points)
              ? evaluation.key_points
              : [evaluation.key_points],
            tags: Array.isArray(evaluation.tags) ? evaluation.tags : [evaluation.tags], // Ensure tags is always an array
          }) as PostEvaluation
      );
    } catch (error: any) {
      logger.error('Error in batch post evaluation', { error: error.message, stack: error.stack });
      throw error;
    }
  }, `Evaluating batch of ${postContents.length} posts`);
}

export async function evaluatePost(postContent: string): Promise<PostEvaluation | null> {
  logger.info('Evaluating post...');
  return withLLMErrorHandling(async () => {
    const completion = await openai.beta.chat.completions.parse({
      model,
      messages: [
        {
          role: 'system',
          content: systemPostPrompt,
        },
        {
          role: 'user',
          content: sanitizeContent(postContent),
        },
      ],
      response_format: zodResponseFormat(PostEvaluationSchema, 'post_evaluation'),
    });

    const evaluationData = completion.choices[0].message.parsed;

    logger.info('Post evaluated', { postContentLength: postContent.length });

    // Return with required PostEvaluation fields
    return {
      post_id: 0, // Placeholder, set as needed
      llm_model: model,
      ...evaluationData,
    } as PostEvaluation;
  }, `Error evaluating single post content.`);
}
