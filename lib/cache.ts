/**
 * Lightweight in-process TTL cache.
 * Keyed by string; values expire after `ttlMs` milliseconds.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value, or compute and cache it if missing/expired.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => T | Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Get a cached value synchronously (no async compute).
 */
export function cachedSync<T>(
  key: string,
  ttlMs: number,
  fn: () => T
): T {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }
  const value = fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/** Invalidate a specific key. */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Invalidate all keys with a given prefix. */
export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
