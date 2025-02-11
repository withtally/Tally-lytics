import { Hono } from 'hono';
import { Logger } from '../logging';
import { generateQuerySimile, generateFollowUpQuestions } from '../llm/llmService';

const logger = new Logger({ logFile: 'logs/llm-routes.log' });

export const llmRoutes = new Hono();

// Generate similar query
llmRoutes.post('/api/generateSimile', async c => {
  try {
    const body = await c.req.json();
    const { query, forum } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const similarQuery = await generateQuerySimile(query, forum);
    return c.json({
      similarQuery,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating similar query:', error);
    return c.json(
      {
        error: 'Failed to generate similar query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Generate follow-up questions
llmRoutes.post('/api/generateFollowUp', async c => {
  try {
    const body = await c.req.json();
    const { query, forum, context } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const suggestions = await generateFollowUpQuestions(query, forum, context);
    return c.json({
      suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating follow-up questions:', error);
    return c.json(
      {
        error: 'Failed to generate follow-up questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
