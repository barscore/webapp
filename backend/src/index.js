import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/errorHandler.js';
import barRoutes from './routes/bars.js';
import placeRoutes from './routes/places.js';
import bookmarkRoutes from './routes/bookmarks.js';
import healthRoutes from './routes/health.js';

const app = new Hono();

// FRONTEND_URL may be a comma-separated allowlist (localhost + LAN IP + prod
// domain). Use "*" to allow any origin. Needed so iOS Safari / the PWA — served
// from a different origin than the dev box — aren't blocked by CORS.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (allowedOrigins.includes('*')) return origin || '*';
      if (!origin) return allowedOrigins[0]; // non-browser / same-origin
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.route('/health', healthRoutes);
app.route('/bars', barRoutes);
app.route('/places', placeRoutes);
app.route('/bookmarks', bookmarkRoutes);

app.notFound((c) =>
  c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404),
);
app.onError(errorHandler);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`rabar API listening on http://localhost:${info.port}`);
});

export default app;
