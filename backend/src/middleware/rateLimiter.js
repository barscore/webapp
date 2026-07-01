import { AppError } from './errorHandler.js';

// In-memory fixed-window limiter keyed by IP. Single-instance only.
// For distributed deployments swap the store for Redis (see docker-compose.yml).
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 5;

const buckets = new Map(); // ip -> { count, resetAt }

function clientIp(c) {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

// Periodic cleanup so the map does not grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets) if (b.resetAt <= now) buckets.delete(ip);
}, WINDOW_MS).unref?.();

export async function rateLimiter(c, next) {
  const ip = clientIp(c);
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > MAX_REQUESTS) {
    c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests, slow down');
  }

  await next();
}
