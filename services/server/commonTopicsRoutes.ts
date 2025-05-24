import { Hono } from 'hono';
import { Logger } from '../logging';
import { commonTopicsService } from '../topics/commonTopicsService';
import { generateLLMChatResponse } from '../llm/llmService';
import { jobTrackingService } from '../cron/jobTrackingService';
import { forumConfigs } from '../../config/forumConfig';
import { validateParam, validateQueryArray } from '../validation/paramValidator';
import {
  createErrorResponse,
  createSuccessResponse,
  handleValidationError,
} from '../utils/errorResponse';

const logger = new Logger({ logFile: 'logs/common-topics-routes.log' });

export const commonTopicsRoutes = new Hono();

// Get list of common topics (minimal data)
commonTopicsRoutes.get('/api/common-topics', async c => {
  try {
    const forumNames = validateQueryArray(c.req.query('forums'));
    const topics = await commonTopicsService.getCommonTopics(forumNames);

    // Return minimal data for list view
    const minimalTopics = topics.map(({ id, name, base_metadata, forum_name }) => ({
      id,
      name,
      base_metadata,
      forum_name,
    }));

    return c.json(createSuccessResponse({ topics: minimalTopics }));
  } catch (error: any) {
    if (error.code) {
      return c.json(handleValidationError(error), 400);
    }
    logger.error('Error fetching common topics:', error);
    return c.json(createErrorResponse('Failed to fetch common topics', 'INTERNAL_ERROR'), 500);
  }
});

// Get full details of common topics
commonTopicsRoutes.get('/api/common-topics/full', async c => {
  try {
    const forumNames = validateQueryArray(c.req.query('forums'));
    const topics = await commonTopicsService.getCommonTopics(forumNames);
    return c.json(createSuccessResponse({ topics }));
  } catch (error: any) {
    if (error.code) {
      return c.json(handleValidationError(error), 400);
    }
    logger.error('Error fetching full common topics:', error);
    return c.json(createErrorResponse('Failed to fetch common topics', 'INTERNAL_ERROR'), 500);
  }
});

// Get specific topic by ID
commonTopicsRoutes.get('/api/common-topics/:id', async c => {
  try {
    const id = validateParam(c.req.param('id'), 'number') as number;

    const topic = await commonTopicsService.getCommonTopicById(id);
    if (!topic) {
      return c.json(createErrorResponse('Topic not found', 'NOT_FOUND'), 404);
    }

    return c.json(createSuccessResponse({ topic }));
  } catch (error: any) {
    if (error.code) {
      return c.json(handleValidationError(error), 400);
    }
    logger.error('Error fetching topic:', error);
    return c.json(createErrorResponse('Failed to fetch topic', 'INTERNAL_ERROR'), 500);
  }
});

// Generate common topics
/**
 * Generate common topics for a specific forum
 * @route POST /api/common-topics/generate
 * @param {string} forum - The forum name to generate topics for
 * @param {string} [timeframe='14d'] - Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month')
 * @returns {object} Message indicating completion status
 */
commonTopicsRoutes.post('/api/common-topics/generate', async c => {
  logger.info('Received request to generate common topics');
  try {
    const body = await c.req.json();
    const { forum, timeframe = '14d' } = body;

    // Check for API key if configured
    if (process.env.CRON_API_KEY) {
      const apiKey = c.req.header('X-API-Key');
      if (apiKey !== process.env.CRON_API_KEY) {
        logger.warn('Unauthorized attempt to generate topics - invalid API key');
        return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
      }
    }

    if (!forum) {
      return c.json({ error: 'Forum parameter is required' }, 400);
    }

    // Track job execution
    const jobId = await jobTrackingService.recordJobStart(`generate_topics_${forum}`);

    try {
      await commonTopicsService.generateCommonTopics(forum, timeframe);
      await jobTrackingService.recordJobCompletion(jobId, 'success');

      logger.info('Successfully generated common topics');
      return c.json({
        message: 'Common topics generation completed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Record job failure
      await jobTrackingService.recordJobCompletion(
        jobId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Re-throw to be handled by the outer catch
      throw error;
    }
  } catch (error) {
    logger.error('Error generating common topics:', error);

    // Handle insufficient data error specifically
    if (error instanceof Error && error.name === 'InsufficientDataError') {
      return c.json(
        {
          error: error.message,
          code: 'INSUFFICIENT_DATA',
        },
        400
      );
    }

    return c.json({ error: 'Failed to generate common topics' }, 500);
  }
});

/**
 * Generate common topics for all configured forums
 * @route POST /api/common-topics/generate-all
 * @param {string} [timeframe='14d'] - Time range in PostgreSQL interval format
 * @returns {object} Message indicating completion status with results for each forum
 */
commonTopicsRoutes.post('/api/common-topics/generate-all', async c => {
  logger.info('Received request to generate common topics for all forums');

  try {
    // Check for API key if configured
    if (process.env.CRON_API_KEY) {
      const apiKey = c.req.header('X-API-Key');
      if (apiKey !== process.env.CRON_API_KEY) {
        logger.warn('Unauthorized attempt to generate all topics - invalid API key');
        return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
      }
    }

    const body = await c.req.json();
    const { timeframe = '14d' } = body;

    // Track the overall job
    const masterJobId = await jobTrackingService.recordJobStart('generate_all_topics');

    try {
      // Process search logs first
      logger.info('Generating topics from search logs');
      const searchLogsJobId = await jobTrackingService.recordJobStart(
        'generate_topics_search_logs'
      );

      try {
        await commonTopicsService.generateCommonTopicsFromSearchLogs(timeframe);
        await jobTrackingService.recordJobCompletion(searchLogsJobId, 'success');
      } catch (error) {
        await jobTrackingService.recordJobCompletion(
          searchLogsJobId,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
        logger.error('Error generating topics from search logs:', error);
        // Continue with forums even if search logs fail
      }

      // Process each forum
      const forums = Object.keys(forumConfigs);
      logger.info(`Generating topics for ${forums.length} forums`);

      const results = {};

      for (const forum of forums) {
        const forumJobId = await jobTrackingService.recordJobStart(`generate_topics_${forum}`);

        try {
          logger.info(`Generating topics for forum: ${forum}`);
          await commonTopicsService.generateCommonTopics(forum, timeframe);
          await jobTrackingService.recordJobCompletion(forumJobId, 'success');
          results[forum] = 'success';
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await jobTrackingService.recordJobCompletion(forumJobId, 'failed', errorMessage);
          logger.error(`Error generating topics for forum ${forum}:`, error);
          results[forum] = `error: ${errorMessage}`;
          // Continue with next forum
        }
      }

      // Record overall job completion
      await jobTrackingService.recordJobCompletion(masterJobId, 'success');

      return c.json({
        message: 'Common topics generation completed for all forums',
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Record overall job failure
      await jobTrackingService.recordJobCompletion(
        masterJobId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  } catch (error) {
    logger.error('Error in generate-all endpoint:', error);
    return c.json(
      {
        error: 'Failed to generate common topics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Chat with a topic
commonTopicsRoutes.post('/api/common-topics/:id/chat', async c => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid topic ID' }, 400);
    }

    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const topic = await commonTopicsService.getCommonTopicById(id);
    if (!topic) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    // Generate chat response using topic context
    const prompt = `Using this topic context:
${topic.context}

And these citations:
${topic.citations}

Please answer this question: ${message}`;

    const response = await generateLLMChatResponse(prompt);
    return c.json({ response });
  } catch (error) {
    logger.error('Error in topic chat:', error);
    return c.json({ error: 'Failed to process chat' }, 500);
  }
});
