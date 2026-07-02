import { AppError } from './errorHandler.js';

// In-memory fixed-window limiter keyed by IP. Single-instance only.
// For distributed deployments swap the store for Redis (see docker-compose.yml).
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 120;

function clientIp(c) {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build a rate-limit middleware. Each instance owns its own bucket map, so a
 * generous global limiter and a strict per-route one (e.g. suggestions) don't
 * share counters.
 *   windowMs — fixed window length.
 *   max      — allowed requests per window per IP.
 */
export function rateLimiter({ windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = {}) {
  const buckets = new Map(); // ip -> { count, resetAt }

  // Periodic cleanup so the map does not grow unbounded.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, b] of buckets) if (b.resetAt <= now) buckets.delete(ip);
  }, windowMs).unref?.();

  return async function rateLimit(c, next) {
    const ip = clientIp(c);
    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      throw new AppError(429, 'RATE_LIMITED', 'Troppe richieste, rallenta');
    }

    await next();
  };
}
