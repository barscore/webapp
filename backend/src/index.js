import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { supabase } from './lib/supabase.js';
import barRoutes from './routes/bars.js';
import placeRoutes from './routes/places.js';
import bookmarkRoutes from './routes/bookmarks.js';
import eventRoutes from './routes/events.js';
import meRoutes from './routes/me.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';
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

// Emergency read-only kill switch. When maintenance_mode is on, block every
// write (POST/PUT/DELETE) except on /admin, so an admin can still turn it back
// off. GET/OPTIONS always pass; the app stays browsable.
app.use('*', async (c, next) => {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (c.req.path.startsWith('/admin')) return next();

  const { data } = await supabase
    .from('app_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .maybeSingle();
  if (data?.maintenance_mode) {
    throw new AppError(503, 'MAINTENANCE', 'Sito in manutenzione — scritture disabilitate');
  }
  return next();
});

app.route('/health', healthRoutes);
app.route('/bars', barRoutes);
app.route('/places', placeRoutes);
app.route('/bookmarks', bookmarkRoutes);
app.route('/events', eventRoutes);
app.route('/me', meRoutes);
app.route('/leaderboard', leaderboardRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) =>
  c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404),
);
app.onError(errorHandler);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`rabar API listening on http://localhost:${info.port}`);
});

export default app;
