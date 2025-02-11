import { Hono } from 'hono';
import { Logger } from '../logging';
import { generalChat } from '../api/chatAPI';

const logger = new Logger({ logFile: 'logs/chat-routes.log' });

export const chatRoutes = new Hono();

chatRoutes.post('/api/chat', async c => {
  try {
    const body = await c.req.json();
    const response = await generalChat(body);
    return c.json(response);
  } catch (error) {
    logger.error('Error in chat endpoint:', error);
    return c.json({ error: 'Chat processing failed' }, 500);
  }
});
