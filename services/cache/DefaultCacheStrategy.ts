import { ICacheStrategy } from './ICacheStrategy';

export class DefaultCacheStrategy implements ICacheStrategy {
  private defaultTTL: number;
  private keyTTLMap: Map<string, number>;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
    this.keyTTLMap = new Map();
  }

  setTTL(key: string, ttl: number): void {
    this.keyTTLMap.set(key, ttl);
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    if (args.length === 0) {
      return prefix;
    }

    const argsKey = JSON.stringify(args, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value)
          .sort()
          .reduce((sorted: any, k) => {
            sorted[k] = value[k];
            return sorted;
          }, {});
      }
      return value;
    });

    return `${prefix}:${argsKey}`;
  }

  getTTL(key: string): number | undefined {
    return this.keyTTLMap.get(key) || this.defaultTTL;
  }
}

