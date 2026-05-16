import { DefaultCacheStrategy } from './DefaultCacheStrategy';
import { ICacheStorage } from './ICacheStorage';
import { ICacheStrategy } from './ICacheStrategy';
import { SessionCacheStorage } from './SessionCacheStorage';

export class CacheManager {
  private storage: ICacheStorage;
  private strategy: ICacheStrategy;

  constructor(
    storage?: ICacheStorage,
    strategy?: ICacheStrategy
  ) {
    this.storage = storage || new SessionCacheStorage();
    this.strategy = strategy || new DefaultCacheStrategy();
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    if (options?.forceRefresh) {
      try {
        const value = await fetcher();
        const ttl = options.ttl ?? this.strategy.getTTL(key);
        if (ttl) {
          this.storage.set(key, value, ttl);
        }
        return value;
      } catch (error) {
        throw error;
      }
    }

    const cached = this.storage.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetcher();
      const ttl = options?.ttl ?? this.strategy.getTTL(key);
      if (ttl) {
        this.storage.set(key, value, ttl);
      }
      return value;
    } catch (error) {
      throw error;
    }
  }

  invalidate(key: string): void {
    this.storage.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    for (const key of this.getAllKeys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  clear(): void {
    this.storage.clear();
  }

  private getAllKeys(): string[] {
    if (this.storage instanceof SessionCacheStorage) {
      return Array.from((this.storage as any).cache.keys());
    }
    return [];
  }

  setStorage(storage: ICacheStorage): void {
    this.storage = storage;
  }

  setStrategy(strategy: ICacheStrategy): void {
    this.strategy = strategy;
  }
}

export const cacheManager = new CacheManager();

