import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serveStatic } from 'hono/bun';

export const configureMiddleware = (app: Hono) => {
  // Normalize paths by removing double slashes
  app.use('*', async (c, next) => {
    const path = c.req.path;
    if (path.includes('//')) {
      const normalizedPath = path.replace(/\/+/g, '/');
      console.log(`Path normalization: ${path} -> ${normalizedPath}`);
      // Rewrite the request path
      const url = new URL(c.req.url);
      url.pathname = normalizedPath;
      return c.redirect(url.toString(), 307);
    }
    await next();
  });
  
  app.use('*', logger());
  app.use('*', prettyJSON());
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3005',
        'http://localhost:3006',
      ],
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
