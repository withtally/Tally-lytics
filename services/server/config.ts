import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serveStatic } from 'hono/bun';

export const configureMiddleware = (app: Hono) => {
  app.use('*', logger());
  app.use('*', prettyJSON());
  app.use(
    '*',
    cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005', 'http://localhost:3006'],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
    })
  );

  // Serve static files from the managementFrontend directory
  app.use('/*', serveStatic({ root: './managementFrontend' }));
};
