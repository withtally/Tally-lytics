import { Hono } from 'hono';
import { Logger } from '../logging';
import { commonTopicsService } from '../topics/commonTopicsService';
import { generateLLMChatResponse } from '../llm/llmService';

const logger = new Logger({ logFile: 'logs/common-topics-routes.log' });

export const commonTopicsRoutes = new Hono();

// Get list of common topics (minimal data)
commonTopicsRoutes.get('/api/common-topics', async c => {
  try {
    const forumNames = c.req.query('forums')?.split(',').filter(Boolean);
    const topics = await commonTopicsService.getCommonTopics(forumNames);

    // Return minimal data for list view
    const minimalTopics = topics.map(({ id, name, base_metadata, forum_name }) => ({
      id,
      name,
      base_metadata,
      forum_name,
    }));

    return c.json({ topics: minimalTopics });
  } catch (error) {
    logger.error('Error fetching common topics:', error);
    return c.json({ error: 'Failed to fetch common topics' }, 500);
  }
});

// Get full details of common topics
commonTopicsRoutes.get('/api/common-topics/full', async c => {
  try {
    const forumNames = c.req.query('forums')?.split(',').filter(Boolean);
    const topics = await commonTopicsService.getCommonTopics(forumNames);
    return c.json({ topics });
  } catch (error) {
    logger.error('Error fetching full common topics:', error);
    return c.json({ error: 'Failed to fetch common topics' }, 500);
  }
});

// Get specific topic by ID
commonTopicsRoutes.get('/api/common-topics/:id', async c => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid topic ID' }, 400);
    }

    const topic = await commonTopicsService.getCommonTopicById(id);
    if (!topic) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    return c.json({ topic });
  } catch (error) {
    logger.error('Error fetching topic:', error);
    return c.json({ error: 'Failed to fetch topic' }, 500);
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

    if (!forum) {
      return c.json({ error: 'Forum parameter is required' }, 400);
    }

    await commonTopicsService.generateCommonTopics(forum, timeframe);
    logger.info('Successfully generated common topics');
    return c.json({
      message: 'Common topics generation completed',
      timestamp: new Date().toISOString(),
    });
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
