import { zodResponseFormat } from 'openai/helpers/zod';

import { TopicEvaluationSchema, TopicSummarySchema } from './schema';
import { systemTopicEvaluationChunkPrompt, systemTopicSummaryPrompt } from './prompt';
import { openai, model } from './openaiClient';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { sanitizeContent } from './contentProcessorService';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/topic-evaluation.log',
});

// Function to generate a summary and tags for the topic content
export async function summarizeTopicContent(
  content: string
): Promise<{ summary: string; tags: string[] }> {
  try {
    logger.info('Generating summary of Topic');

    const completion = await withLLMErrorHandling(async () => {
      return openai.beta.chat.completions.parse({
        model,
        messages: [
          {
            role: 'system',
            content: systemTopicSummaryPrompt,
          },
          {
            role: 'user',
            content: `Summarize the following topic and provide relevant tags based on the content:\n\n${sanitizeContent(
              content
            )}`,
          },
        ],
        response_format: zodResponseFormat(TopicSummarySchema, 'topic_summary'),
      });
    }, 'Summarizing Topic Content');

    if (completion === null) {
      throw new Error('Topic summary skipped due to insufficient LLM credits');
    }

    const summaryData = completion.choices[0].message.parsed;
    logger.info('Summary and Tags generated', {
      summaryLength: summaryData?.summary.length,
      tagsCount: summaryData?.tags.length,
    });

    return {
      summary: summaryData?.summary || 'No summary provided',
      tags: summaryData?.tags || [],
    };
  } catch (error: any) {
    logger.error('Error in summarizing topic content', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function evaluateTopicChunk(chunkText: string, forumName: string) {
  try {
    logger.info('Evaluating topic chunk');
    const completion = await withLLMErrorHandling(async () => {
      return openai.beta.chat.completions.parse({
        model,
        messages: [
          {
            role: 'system',
            content: systemTopicEvaluationChunkPrompt,
          },
          {
            role: 'user',
            content: sanitizeContent(chunkText),
          },
        ],
        response_format: zodResponseFormat(TopicEvaluationSchema, 'topic_evaluation'),
      });
    }, 'Evaluating Topic Chunk error');

    if (completion === null) {
      throw new Error('Topic chunk summary skipped due to insufficient LLM credits');
    }

    const evaluationData = completion.choices[0].message.parsed;

    // Return the evaluation data, adding the LLM model
    logger.info('Topic chunk evaluated', {
      evaluationDataLength: JSON.stringify(evaluationData).length,
    });

    return {
      llm_model: model,
      forum_name: forumName, // Make sure this is passed through
      ...evaluationData,
    };
  } catch (error: any) {
    logger.error('Error during chunk evaluation', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
