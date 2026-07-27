export class ManualAvailabilityCache {
  constructor({ ttlSeconds = 900, maxEntries = 256, now = () => Math.floor(Date.now() / 1000) } = {}) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) throw new Error('Cache TTL must be a positive integer.');
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error('Cache maximum must be a positive integer.');
    this.ttlSeconds = ttlSeconds;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
  }

  prune(now) {
    for (const [key, entry] of this.entries) {
      if (now - entry.checked_at >= this.ttlSeconds) this.entries.delete(key);
    }
  }

  async lookup(manualUrl, probe) {
    const now = this.now();
    this.prune(now);
    const cached = this.entries.get(manualUrl);
    if (cached) {
      this.entries.delete(manualUrl);
      this.entries.set(manualUrl, cached);
      return { ...cached, cached: true };
    }

    const available = await probe(manualUrl);
    const result = { available: Boolean(available), checked_at: now, cached: false };
    if (!result.available) return result;
    if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value);
    this.entries.set(manualUrl, { available: true, checked_at: now });
    return result;
  }
}
