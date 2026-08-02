type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(
    key: string,
    { limit, windowMs }: { limit: number; windowMs: number },
    now = Date.now(),
  ): RateLimitResult {
    if (this.buckets.size > 5_000) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(bucketKey);
      }
    }

    const current = this.buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: bucket.count <= limit,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }
}

const processLimiter = new FixedWindowRateLimiter();

function getClientKey(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  return forwarded.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
}

export function consumeRequestRateLimit(
  request: Request,
  scope: string,
  policy: { limit: number; windowMs: number },
) {
  return processLimiter.consume(`${scope}:${getClientKey(request)}`, policy);
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
