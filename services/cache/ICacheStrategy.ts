export interface ICacheStrategy {
  shouldCache(key: string, ...args: any[]): boolean;
  generateKey(prefix: string, ...args: any[]): string;
  getTTL(key: string): number | undefined;
}

