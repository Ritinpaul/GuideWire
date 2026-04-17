function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function createRateLimiter(options = {}) {
  const {
    windowMs = 60_000,
    max = 30,
    name = 'rate_limit',
    keyFn,
  } = options;

  const buckets = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const rawKey = keyFn ? keyFn(req) : getClientIp(req);
    const key = String(rawKey || 'unknown');

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);

    res.setHeader('x-ratelimit-limit', String(max));
    res.setHeader('x-ratelimit-remaining', String(remaining));
    res.setHeader('x-ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('retry-after', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${name}. Try again later.`,
        retry_after_sec: retryAfterSec,
      });
    }

    next();
  };
}
