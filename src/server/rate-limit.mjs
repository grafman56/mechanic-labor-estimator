function positiveInteger(environment, name, fallback) {
  const value = environment[name] ?? String(fallback);
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${name} must be a positive integer.`);
  return Number(value);
}

export function rateLimitConfig(environment) {
  return {
    limit: positiveInteger(environment, 'PLANNER_RATE_LIMIT_REQUESTS', 20),
    windowSeconds: positiveInteger(environment, 'PLANNER_RATE_LIMIT_WINDOW_SECONDS', 60),
  };
}

export class FixedWindowRateLimiter {
  constructor({ limit, windowSeconds, now = () => Math.floor(Date.now() / 1000), maxKeys = 1_000 }) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Rate limit must be a positive integer.');
    if (!Number.isInteger(windowSeconds) || windowSeconds < 1) throw new Error('Rate-limit window must be a positive integer.');
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.now = now;
    this.maxKeys = maxKeys;
    this.entries = new Map();
  }

  check(key) {
    const now = this.now();
    const current = this.entries.get(key);
    if (!current || now >= current.startedAt + this.windowSeconds) {
      if (!current && this.entries.size >= this.maxKeys) this.entries.delete(this.entries.keys().next().value);
      this.entries.set(key, { startedAt: now, count: 1 });
      return { allowed: true };
    }
    if (current.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, current.startedAt + this.windowSeconds - now) };
    }
    current.count += 1;
    return { allowed: true };
  }
}
