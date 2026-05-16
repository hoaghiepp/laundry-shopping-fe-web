import { cacheManager } from './CacheManager';
import { DefaultCacheStrategy } from './DefaultCacheStrategy';
import { ICacheStrategy } from './ICacheStrategy';

interface CacheOptions {
  key: string;
  ttl?: number;
  strategy?: ICacheStrategy;
  forceRefresh?: boolean;
}

export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions | ((...args: Parameters<T>) => CacheOptions)
): T {
  const defaultStrategy = new DefaultCacheStrategy();
  
  return (async (...args: Parameters<T>) => {
    try {
      const opts = typeof options === 'function' ? options(...args) : options;
      const strategy = opts.strategy || defaultStrategy;
      
      const cacheKey = strategy.generateKey(opts.key, ...args);
      
      if (!strategy.shouldCache(cacheKey, ...args)) {
        return await fn(...args);
      }

      return await cacheManager.getOrSet(
        cacheKey,
        () => fn(...args),
        {
          ttl: opts.ttl,
          forceRefresh: opts.forceRefresh,
        }
      );
    } catch (error) {
      throw error;
    }
  }) as T;
}

