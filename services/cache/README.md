# Cache Module Documentation

## Overview

The Cache Module provides a session-based caching mechanism for API calls in mobile applications. It reduces network requests by caching responses in memory, improving performance and reducing data usage. The cache automatically expires based on TTL (Time To Live) and is cleared when the app restarts.

## Architecture

The module follows SOLID principles:

- **Single Responsibility**: Each component has a single, well-defined purpose
- **Open/Closed**: Extensible through interfaces without modifying existing code
- **Liskov Substitution**: Implementations can be swapped via interfaces
- **Interface Segregation**: Focused interfaces for specific responsibilities
- **Dependency Inversion**: Dependencies on abstractions, not concrete implementations

## Core Components

### 1. ICacheStorage
Interface defining cache storage operations.

```typescript
interface ICacheStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}
```

### 2. SessionCacheStorage
In-memory cache storage implementation. Data persists only during the app session.

**Features:**
- Automatic expiration based on TTL
- Thread-safe Map-based storage
- Automatic cleanup of expired entries

### 3. ICacheStrategy
Interface for cache key generation and caching decisions.

```typescript
interface ICacheStrategy {
  shouldCache(key: string, ...args: any[]): boolean;
  generateKey(prefix: string, ...args: any[]): string;
  getTTL(key: string): number | undefined;
}
```

### 4. DefaultCacheStrategy
Default implementation that:
- Generates cache keys from function arguments
- Normalizes object keys for consistent caching
- Supports per-key TTL configuration

### 5. CacheManager
Central cache management class.

**Methods:**
- `getOrSet<T>(key, fetcher, options?)`: Get cached value or fetch and cache
- `invalidate(key)`: Remove specific cache entry
- `invalidatePattern(pattern)`: Remove entries matching regex pattern
- `clear()`: Clear all cache entries

### 6. withCache Decorator
Higher-order function to wrap API functions with caching.

## Usage

### Basic Usage with `withCache`

Wrap your API function with `withCache`:

```typescript
import { withCache } from '@/services/cache';

// Simple static key
const fetchProfile = async (): Promise<Profile> => {
  const response = await axios.get('/api/profile');
  return response.data;
};

export const profileService = {
  getProfile: withCache(fetchProfile, {
    key: 'user:profile',
    ttl: 10 * 60 * 1000, // 10 minutes
  }),
};
```

### Dynamic Cache Keys

Use a function to generate cache keys based on arguments:

```typescript
const fetchProduct = async (id: string): Promise<Product> => {
  const response = await axios.get(`/api/products/${id}`);
  return response.data;
};

export const productService = {
  getProduct: withCache(fetchProduct, (id: string) => ({
    key: 'product:detail',
    ttl: 15 * 60 * 1000, // 15 minutes
  })),
};
```

### Cache Invalidation

Invalidate cache when data is modified:

```typescript
import { cacheManager } from '@/services/cache';

export const addressService = {
  getAddresses: withCache(fetchAddresses, {
    key: 'customer:addresses',
    ttl: 10 * 60 * 1000,
  }),

  createAddress: async (data: AddressData) => {
    const response = await axios.post('/api/addresses', data);
    // Invalidate cache after creating
    cacheManager.invalidate('customer:addresses');
    return response.data;
  },

  updateAddress: async (id: string, data: AddressData) => {
    const response = await axios.put(`/api/addresses/${id}`, data);
    // Invalidate cache after updating
    cacheManager.invalidate('customer:addresses');
    return response.data;
  },

  deleteAddress: async (id: string) => {
    await axios.delete(`/api/addresses/${id}`);
    // Invalidate cache after deleting
    cacheManager.invalidate('customer:addresses');
  },
};
```

### Pattern-Based Invalidation

Invalidate multiple cache entries using regex patterns:

```typescript
// Invalidate all product-related caches
cacheManager.invalidatePattern('product:.*');

// Invalidate all user profile caches
cacheManager.invalidatePattern('user:.*');
```

### Force Refresh

Force refresh cached data:

```typescript
// Option 1: Using withCache with forceRefresh option
const options = {
  key: 'user:profile',
  ttl: 10 * 60 * 1000,
  forceRefresh: true,
};

// Option 2: Directly using CacheManager
await cacheManager.getOrSet(
  'user:profile',
  () => fetchProfile(),
  { forceRefresh: true }
);
```

### Direct CacheManager Usage

Use CacheManager directly for more control:

```typescript
import { cacheManager } from '@/services/cache';

// Get or set cache
const data = await cacheManager.getOrSet(
  'my:cache:key',
  async () => {
    // Fetch data
    const response = await axios.get('/api/data');
    return response.data;
  },
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    forceRefresh: false,
  }
);

// Check if key exists
if (cacheManager.has('my:cache:key')) {
  // Cache exists
}

// Delete specific key
cacheManager.invalidate('my:cache:key');

// Clear all cache
cacheManager.clear();
```

## Real-World Examples

### Example 1: Category Service

```typescript
import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import { withCache } from '@/services/cache';

const getAllCategoriesImpl = async (
  page: number,
  page_size: number
): Promise<any> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/public/categories/search`,
    {},
    {
      params: { page, size: page_size },
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response.data;
};

export const categoryService = {
  getAll: withCache(getAllCategoriesImpl, (page: number, page_size: number) => ({
    key: 'categories:all',
    ttl: 15 * 60 * 1000, // 15 minutes
  })),
};
```

### Example 2: Goship Service with Dynamic Keys

```typescript
import { withCache } from '@/services/cache';

export const goshipService = {
  getCities: withCache(
    async (options?: PaginationOptions): Promise<PaginatedResponse> => {
      const response = await goshipAxios.get('/cities', {
        params: {
          page: options?.page || 1,
          per_page: options?.per_page || 25,
        },
      });
      return response.data;
    },
    (options?: PaginationOptions) => ({
      key: 'goship:cities',
      ttl: 30 * 60 * 1000, // 30 minutes
    })
  ),

  getWards: withCache(
    async (
      district_id: string | number | null = null,
      options?: PaginationOptions
    ): Promise<PaginatedResponse> => {
      const endpoint = district_id
        ? `/districts/${district_id}/wards`
        : '/wards';
      const response = await goshipAxios.get(endpoint, {
        params: {
          page: options?.page || 1,
          per_page: options?.per_page || 25,
        },
      });
      return response.data;
    },
    (district_id?: string | number | null) => ({
      key: `goship:wards:${district_id || 'all'}`,
      ttl: 30 * 60 * 1000, // 30 minutes
    })
  ),
};
```

## Best Practices

### 1. Cache Key Naming Convention
Use a consistent naming pattern: `domain:resource` or `domain:resource:identifier`

```typescript
'user:profile'           // User profile
'customer:addresses'     // Customer addresses
'product:detail'        // Product details
'goship:cities'          // Goship cities
'categories:all'         // All categories
```

### 2. TTL Selection
Choose appropriate TTL based on data volatility:

- **Static/Reference Data** (cities, categories): 30-60 minutes
- **User Profile**: 10-15 minutes
- **User-specific Data** (addresses, orders): 5-10 minutes
- **Dynamic Data** (cart, current orders): Don't cache or very short TTL (1-2 minutes)

### 3. Cache Invalidation Strategy

**Invalidate on Write Operations:**
```typescript
// Always invalidate related caches after mutations
createAddress() {
  // ... create logic
  cacheManager.invalidate('customer:addresses');
}

updateAddress() {
  // ... update logic
  cacheManager.invalidate('customer:addresses');
}

deleteAddress() {
  // ... delete logic
  cacheManager.invalidate('customer:addresses');
}
```

**Invalidate on Login/Logout:**
```typescript
// Clear user-specific cache on logout
logout() {
  cacheManager.invalidatePattern('user:.*');
  cacheManager.invalidatePattern('customer:.*');
}
```

### 4. When NOT to Cache

- **POST/PUT/DELETE operations**: Never cache mutations
- **Real-time data**: Stock prices, live orders
- **Sensitive data**: Payment information, tokens
- **Large payloads**: Use with caution, consider memory limits

### 5. Error Handling

Cache failures should not break your app:

```typescript
// withCache handles errors gracefully
// If cache fails, it falls back to the original function
const data = await profileService.getProfile(); // Safe even if cache fails
```

## Deep Dive: Cache Invalidation

Cache invalidation is the process of removing cached data when it becomes stale or outdated. Proper invalidation ensures users always see fresh, accurate data while maintaining cache performance benefits.

### Invalidation Strategies

#### 1. **Write-Through Invalidation** (Recommended)
Invalidate cache immediately after write operations (CREATE, UPDATE, DELETE).

**When to use:** Most common pattern, ensures immediate consistency.

```typescript
export const orderService = {
  getOrders: withCache(fetchOrders, {
    key: 'customer:orders',
    ttl: 5 * 60 * 1000,
  }),

  createOrder: async (data: OrderData) => {
    const response = await axios.post('/api/orders', data);
    // Invalidate immediately after creation
    cacheManager.invalidate('customer:orders');
    // Also invalidate related caches
    cacheManager.invalidate('customer:current-order');
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await axios.patch(`/api/orders/${orderId}`, { status });
    // Invalidate order list and specific order cache
    cacheManager.invalidate('customer:orders');
    cacheManager.invalidate(`order:${orderId}`);
    return response.data;
  },
};
```

**Pros:**
- Immediate consistency
- Simple to implement
- Predictable behavior

**Cons:**
- Requires invalidation calls in every mutation
- Easy to miss invalidation points

#### 2. **Time-Based Invalidation** (TTL)
Let cache expire naturally based on TTL.

**When to use:** Data that changes infrequently or when exact freshness isn't critical.

```typescript
// Categories rarely change, so long TTL is safe
export const categoryService = {
  getAll: withCache(fetchCategories, {
    key: 'categories:all',
    ttl: 30 * 60 * 1000, // 30 minutes - acceptable staleness
  }),
};
```

**Pros:**
- No manual invalidation needed
- Automatic cleanup
- Good for reference data

**Cons:**
- Users may see stale data until TTL expires
- Not suitable for frequently changing data

#### 3. **Event-Based Invalidation**
Invalidate cache based on application events (login, logout, settings change).

**When to use:** User context changes or global state changes.

```typescript
// Invalidate on user logout
export const authService = {
  logout: async () => {
    await clearTokens();
    // Clear all user-specific cache
    cacheManager.invalidatePattern('user:.*');
    cacheManager.invalidatePattern('customer:.*');
    cacheManager.invalidatePattern('order:.*');
  },
};

// Invalidate on settings change
export const settingsService = {
  updateSettings: async (settings: Settings) => {
    await axios.put('/api/settings', settings);
    // Settings affect multiple caches
    cacheManager.invalidate('user:profile');
    cacheManager.invalidate('app:config');
  },
};
```

#### 4. **Dependency-Based Invalidation**
Invalidate related caches when parent data changes.

**When to use:** Data with complex relationships.

```typescript
export const productService = {
  getProduct: withCache(
    fetchProduct,
    (productId: string) => ({
      key: 'product:detail',
      ttl: 15 * 60 * 1000,
    })
  ),

  getProductsByCategory: withCache(
    fetchProductsByCategory,
    (categoryId: string) => ({
      key: 'products:category',
      ttl: 10 * 60 * 1000,
    })
  ),

  updateProduct: async (productId: string, data: ProductData) => {
    const response = await axios.put(`/api/products/${productId}`, data);
    
    // Invalidate product detail
    cacheManager.invalidate(`product:detail:${productId}`);
    
    // Invalidate all category product lists (this product might be in multiple)
    cacheManager.invalidatePattern('products:category:.*');
    
    // Invalidate search results
    cacheManager.invalidatePattern('products:search:.*');
    
    return response.data;
  },
};
```

### Invalidation Patterns

#### Pattern 1: Single Key Invalidation
Remove one specific cache entry.

```typescript
// Simple and precise
cacheManager.invalidate('user:profile');
```

**Use when:** You know the exact cache key and only that entry needs invalidation.

#### Pattern 2: Pattern-Based Invalidation
Remove multiple cache entries matching a pattern.

```typescript
// Remove all product-related caches
cacheManager.invalidatePattern('product:.*');

// Remove all user profile variations
cacheManager.invalidatePattern('user:profile:.*');

// Remove all order caches for a specific customer
cacheManager.invalidatePattern(`customer:${customerId}:orders:.*`);
```

**Use when:** 
- Related data needs to be cleared together
- Cache keys follow a predictable pattern
- You want to ensure no stale related data remains

**Performance Note:** Pattern matching iterates through all cache keys. For large caches, prefer specific key invalidation when possible.

#### Pattern 3: Hierarchical Invalidation
Invalidate parent and child caches.

```typescript
// When a category is updated, invalidate:
// 1. The category itself
cacheManager.invalidate(`category:${categoryId}`);

// 2. All products in that category
cacheManager.invalidatePattern(`products:category:${categoryId}:.*`);

// 3. All category lists
cacheManager.invalidate('categories:all');
cacheManager.invalidatePattern('categories:list:.*');
```

#### Pattern 4: Cascade Invalidation
Create helper functions for complex invalidation logic.

```typescript
class OrderCacheInvalidator {
  static invalidateOrder(orderId: string) {
    // Invalidate specific order
    cacheManager.invalidate(`order:${orderId}`);
    
    // Invalidate order list
    cacheManager.invalidate('customer:orders');
    
    // Invalidate current order if it's the same
    cacheManager.invalidate('customer:current-order');
  }

  static invalidateAllOrderCaches() {
    cacheManager.invalidatePattern('order:.*');
    cacheManager.invalidate('customer:orders');
    cacheManager.invalidate('customer:current-order');
    cacheManager.invalidatePattern('order:history:.*');
  }

  static invalidateOrderByStatus(status: string) {
    cacheManager.invalidatePattern(`order:status:${status}:.*`);
  }
}

// Usage
OrderCacheInvalidator.invalidateOrder(orderId);
```

### Common Invalidation Mistakes

#### Mistake 1: Forgetting to Invalidate
```typescript
// ❌ BAD: Cache not invalidated after update
updateAddress: async (id: string, data: AddressData) => {
  const response = await axios.put(`/api/addresses/${id}`, data);
  return response.data; // Cache still has old data!
}

// ✅ GOOD: Cache invalidated
updateAddress: async (id: string, data: AddressData) => {
  const response = await axios.put(`/api/addresses/${id}`, data);
  cacheManager.invalidate('customer:addresses');
  return response.data;
}
```

#### Mistake 2: Incomplete Invalidation
```typescript
// ❌ BAD: Only invalidating one cache
updateProduct: async (id: string, data: ProductData) => {
  await axios.put(`/api/products/${id}`, data);
  cacheManager.invalidate(`product:${id}`); // Missing related caches!
}

// ✅ GOOD: Invalidating all related caches
updateProduct: async (id: string, data: ProductData) => {
  await axios.put(`/api/products/${id}`, data);
  cacheManager.invalidate(`product:${id}`);
  cacheManager.invalidatePattern('products:list:.*');
  cacheManager.invalidatePattern('products:category:.*');
  cacheManager.invalidatePattern('products:search:.*');
}
```

#### Mistake 3: Over-Invalidation
```typescript
// ❌ BAD: Clearing entire cache unnecessarily
updateProfile: async (data: ProfileData) => {
  await axios.put('/api/profile', data);
  cacheManager.clear(); // Too aggressive! Clears everything
}

// ✅ GOOD: Targeted invalidation
updateProfile: async (data: ProfileData) => {
  await axios.put('/api/profile', data);
  cacheManager.invalidate('user:profile'); // Only what's needed
}
```

### Invalidation Best Practices

1. **Invalidate Immediately After Mutations**
   ```typescript
   // Always invalidate right after the API call succeeds
   const response = await axios.post('/api/resource', data);
   cacheManager.invalidate('resource:key');
   return response.data;
   ```

2. **Use Helper Functions for Complex Invalidation**
   ```typescript
   // Centralize invalidation logic
   const invalidateUserCaches = () => {
     cacheManager.invalidate('user:profile');
     cacheManager.invalidate('user:settings');
     cacheManager.invalidatePattern('user:orders:.*');
   };
   ```

3. **Document Invalidation Dependencies**
   ```typescript
   /**
    * Updates product and invalidates:
    * - product:{id} - The product detail
    * - products:list:* - All product lists
    * - products:category:{categoryId}:* - Category product lists
    */
   updateProduct: async (id: string, data: ProductData) => {
     // ...
   }
   ```

4. **Test Invalidation Logic**
   ```typescript
   // Ensure cache is cleared after mutations
   it('should invalidate cache after update', async () => {
     await productService.updateProduct('123', data);
     const cached = cacheManager.get('product:123');
     expect(cached).toBeNull();
   });
   ```

## Deep Dive: Cache Strategy

Cache Strategy defines **how** data is cached, **when** it should be cached, and **what** the cache key should be. It's the brain of the caching system, making intelligent decisions about cache behavior.

### Understanding ICacheStrategy Interface

The `ICacheStrategy` interface has three critical methods:

```typescript
interface ICacheStrategy {
  shouldCache(key: string, ...args: any[]): boolean;
  generateKey(prefix: string, ...args: any[]): string;
  getTTL(key: string): number | undefined;
}
```

### 1. `shouldCache()` - The Gatekeeper

Determines whether a request should be cached at all.

**Default Behavior:** Always returns `true` (cache everything)

**When to customize:**
- Skip caching for certain user roles
- Skip caching based on request parameters
- Skip caching during specific app states

#### Example: Role-Based Caching

```typescript
class RoleBasedCacheStrategy implements ICacheStrategy {
  private userRole: string;

  constructor(userRole: string) {
    this.userRole = userRole;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    // Don't cache for admin users (they need real-time data)
    if (this.userRole === 'admin') {
      return false;
    }

    // Don't cache sensitive operations
    if (key.includes('payment') || key.includes('transaction')) {
      return false;
    }

    // Don't cache if forceRefresh flag is set
    if (args[0]?.forceRefresh === true) {
      return false;
    }

    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Implementation below
  }

  getTTL(key: string): number | undefined {
    // Implementation below
  }
}
```

#### Example: Conditional Caching Based on Network

```typescript
class NetworkAwareCacheStrategy implements ICacheStrategy {
  private isOnline: boolean;

  constructor(isOnline: boolean) {
    this.isOnline = isOnline;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    // Always cache when offline (for offline support)
    if (!this.isOnline) {
      return true;
    }

    // Online: only cache expensive operations
    const expensiveOperations = ['products:search', 'orders:history'];
    return expensiveOperations.some(op => key.includes(op));
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Implementation
  }

  getTTL(key: string): number | undefined {
    // Implementation
  }
}
```

### 2. `generateKey()` - The Identifier

Creates unique cache keys from function arguments. This is crucial for cache hit/miss behavior.

**Default Behavior:** Creates keys by JSON-stringifying and sorting object keys for consistency.

#### How DefaultCacheStrategy Works

```typescript
generateKey(prefix: string, ...args: any[]): string {
  if (args.length === 0) {
    return prefix; // "user:profile"
  }

  // Normalize objects by sorting keys
  const argsKey = JSON.stringify(args, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value)
        .sort() // Sort keys for consistency
        .reduce((sorted: any, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });

  return `${prefix}:${argsKey}`;
}
```

**Why key normalization matters:**

```typescript
// These two calls should use the SAME cache key:
getProducts({ page: 1, size: 10, sort: 'name' })
getProducts({ size: 10, sort: 'name', page: 1 })

// Without normalization: Different keys = cache miss
// With normalization: Same key = cache hit ✅
```

#### Custom Key Generation Examples

**Example 1: User-Scoped Keys**

```typescript
class UserScopedCacheStrategy implements ICacheStrategy {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Always include user ID in key
    const baseKey = `${prefix}:user:${this.userId}`;
    
    if (args.length === 0) {
      return baseKey;
    }

    // Add arguments
    const argsKey = JSON.stringify(args);
    return `${baseKey}:${argsKey}`;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  getTTL(key: string): number | undefined {
    return undefined;
  }
}

// Usage
const strategy = new UserScopedCacheStrategy(currentUserId);
// Generates: "orders:user:123:..." instead of "orders:..."
```

**Example 2: Selective Argument Hashing**

```typescript
class SelectiveKeyStrategy implements ICacheStrategy {
  generateKey(prefix: string, ...args: any[]): string {
    // Only use relevant arguments for key generation
    // Ignore pagination options (page, size) but include filters
    
    const relevantArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const { page, size, ...filters } = arg;
        return filters; // Only cache based on filters
      }
      return arg;
    });

    const argsKey = JSON.stringify(relevantArgs);
    return `${prefix}:${argsKey}`;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  getTTL(key: string): number | undefined {
    return undefined;
  }
}

// Result: These calls share the same cache:
// getProducts({ category: 'electronics', page: 1, size: 10 })
// getProducts({ category: 'electronics', page: 2, size: 20 })
// Both use key: "products:{\"category\":\"electronics\"}"
```

**Example 3: Hash-Based Keys for Large Arguments**

```typescript
import crypto from 'crypto';

class HashBasedCacheStrategy implements ICacheStrategy {
  generateKey(prefix: string, ...args: any[]): string {
    if (args.length === 0) {
      return prefix;
    }

    // Hash large arguments instead of stringifying
    const argsString = JSON.stringify(args);
    
    // Use hash for very long keys (e.g., complex search queries)
    if (argsString.length > 100) {
      const hash = crypto
        .createHash('md5')
        .update(argsString)
        .digest('hex');
      return `${prefix}:${hash}`;
    }

    return `${prefix}:${argsString}`;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  getTTL(key: string): number | undefined {
    return undefined;
  }
}
```

### 3. `getTTL()` - The Expiration Controller

Determines how long cached data should live.

**Default Behavior:** Returns a default TTL (5 minutes) or per-key configured TTL.

#### TTL Strategy Examples

**Example 1: Data-Type Based TTL**

```typescript
class DataTypeBasedTTLStrategy implements ICacheStrategy {
  private ttlMap: Map<string, number> = new Map([
    ['user:profile', 10 * 60 * 1000],        // 10 minutes
    ['products:', 30 * 60 * 1000],            // 30 minutes
    ['categories:', 60 * 60 * 1000],          // 1 hour
    ['orders:', 5 * 60 * 1000],              // 5 minutes
  ]);

  getTTL(key: string): number | undefined {
    // Find matching TTL pattern
    for (const [pattern, ttl] of this.ttlMap) {
      if (key.startsWith(pattern)) {
        return ttl;
      }
    }
    
    // Default TTL
    return 5 * 60 * 1000;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Use default implementation
    return prefix;
  }
}
```

**Example 2: Adaptive TTL Based on Data Freshness**

```typescript
class AdaptiveTTLStrategy implements ICacheStrategy {
  getTTL(key: string): number | undefined {
    // Shorter TTL for frequently accessed data
    const frequentlyAccessed = ['user:profile', 'customer:current-order'];
    if (frequentlyAccessed.some(k => key.includes(k))) {
      return 2 * 60 * 1000; // 2 minutes
    }

    // Longer TTL for reference data
    const referenceData = ['categories:', 'cities:', 'districts:'];
    if (referenceData.some(k => key.includes(k))) {
      return 60 * 60 * 1000; // 1 hour
    }

    return 10 * 60 * 1000; // Default 10 minutes
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    return prefix;
  }
}
```

**Example 3: Time-of-Day Based TTL**

```typescript
class TimeBasedTTLStrategy implements ICacheStrategy {
  getTTL(key: string): number | undefined {
    const hour = new Date().getHours();
    
    // During business hours (9 AM - 5 PM), use shorter TTL
    // Data changes more frequently during business hours
    if (hour >= 9 && hour < 17) {
      return 5 * 60 * 1000; // 5 minutes
    }
    
    // Outside business hours, use longer TTL
    return 30 * 60 * 1000; // 30 minutes
  }

  shouldCache(key: string, ...args: any[]): boolean {
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    return prefix;
  }
}
```

### Complete Strategy Example: Smart Caching Strategy

A comprehensive strategy combining multiple concerns:

```typescript
class SmartCacheStrategy implements ICacheStrategy {
  private userRole: string;
  private isOnline: boolean;
  private defaultTTL: number;

  constructor(
    userRole: string = 'user',
    isOnline: boolean = true,
    defaultTTL: number = 5 * 60 * 1000
  ) {
    this.userRole = userRole;
    this.isOnline = isOnline;
    this.defaultTTL = defaultTTL;
  }

  shouldCache(key: string, ...args: any[]): boolean {
    // Never cache sensitive data
    const sensitiveKeys = ['payment', 'token', 'password', 'credit-card'];
    if (sensitiveKeys.some(sk => key.includes(sk))) {
      return false;
    }

    // Admin users get real-time data (no cache)
    if (this.userRole === 'admin' && key.includes('admin:')) {
      return false;
    }

    // Always cache when offline (for offline support)
    if (!this.isOnline) {
      return true;
    }

    // Don't cache if explicitly requested not to
    if (args[0]?.noCache === true) {
      return false;
    }

    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Include user role in key for role-specific caching
    const rolePrefix = this.userRole !== 'user' ? `:${this.userRole}` : '';
    const baseKey = `${prefix}${rolePrefix}`;

    if (args.length === 0) {
      return baseKey;
    }

    // Normalize and hash large arguments
    const normalizedArgs = this.normalizeArgs(args);
    const argsString = JSON.stringify(normalizedArgs);
    
    if (argsString.length > 200) {
      // Hash very long keys
      const hash = this.hashString(argsString);
      return `${baseKey}:${hash}`;
    }

    return `${baseKey}:${argsString}`;
  }

  getTTL(key: string): number | undefined {
    // Reference data: long TTL
    if (key.includes('categories:') || key.includes('cities:')) {
      return 60 * 60 * 1000; // 1 hour
    }

    // User data: medium TTL
    if (key.includes('user:') || key.includes('customer:')) {
      return 10 * 60 * 1000; // 10 minutes
    }

    // Dynamic data: short TTL
    if (key.includes('orders:') || key.includes('cart:')) {
      return 2 * 60 * 1000; // 2 minutes
    }

    // Default
    return this.defaultTTL;
  }

  private normalizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Sort object keys for consistency
        return Object.keys(arg)
          .sort()
          .reduce((sorted: any, k) => {
            sorted[k] = arg[k];
            return sorted;
          }, {});
      }
      return arg;
    });
  }

  private hashString(str: string): string {
    // Simple hash function (use crypto in production)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
```

### Strategy Selection Guide

| Scenario | Strategy Approach |
|----------|------------------|
| Simple caching needs | Use `DefaultCacheStrategy` |
| Role-based access | Customize `shouldCache()` |
| Complex key generation | Customize `generateKey()` |
| Variable data freshness | Customize `getTTL()` |
| Multiple concerns | Combine all three methods |

### Testing Cache Strategies

```typescript
describe('SmartCacheStrategy', () => {
  it('should not cache sensitive data', () => {
    const strategy = new SmartCacheStrategy();
    expect(strategy.shouldCache('payment:info')).toBe(false);
    expect(strategy.shouldCache('user:token')).toBe(false);
  });

  it('should generate consistent keys', () => {
    const strategy = new SmartCacheStrategy();
    const key1 = strategy.generateKey('products', { page: 1, size: 10 });
    const key2 = strategy.generateKey('products', { size: 10, page: 1 });
    expect(key1).toBe(key2); // Should be the same
  });

  it('should return appropriate TTL', () => {
    const strategy = new SmartCacheStrategy();
    expect(strategy.getTTL('categories:all')).toBe(60 * 60 * 1000);
    expect(strategy.getTTL('orders:list')).toBe(2 * 60 * 1000);
  });
});
```

## Advanced Usage

### Custom Cache Strategy

Implement custom caching logic:

```typescript
import { ICacheStrategy } from '@/services/cache';

class CustomCacheStrategy implements ICacheStrategy {
  shouldCache(key: string, ...args: any[]): boolean {
    // Don't cache if user is admin
    if (args[0]?.role === 'admin') {
      return false;
    }
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    // Custom key generation
    return `${prefix}:${args[0]?.userId}`;
  }

  getTTL(key: string): number | undefined {
    // Custom TTL logic
    if (key.startsWith('user:')) {
      return 10 * 60 * 1000;
    }
    return 5 * 60 * 1000;
  }
}

// Use custom strategy
const customStrategy = new CustomCacheStrategy();
const data = await cacheManager.getOrSet(
  'key',
  fetcher,
  { strategy: customStrategy }
);
```

### Custom Storage Implementation

Implement persistent storage (e.g., AsyncStorage):

```typescript
import { ICacheStorage } from '@/services/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AsyncStorageCache implements ICacheStorage {
  async get<T>(key: string): Promise<T | null> {
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    
    const entry = JSON.parse(data);
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry = {
      value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  }

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    // Clear only cache keys
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache:'));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }
}

// Use custom storage
const persistentCache = new AsyncStorageCache();
const cacheManager = new CacheManager(persistentCache);
```

## API Reference

### withCache

```typescript
function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions | ((...args: Parameters<T>) => CacheOptions)
): T
```

**Parameters:**
- `fn`: Async function to wrap with caching
- `options`: Cache options object or function that returns options

**CacheOptions:**
```typescript
interface CacheOptions {
  key: string;                    // Cache key prefix
  ttl?: number;                    // Time to live in milliseconds
  strategy?: ICacheStrategy;        // Custom cache strategy
  forceRefresh?: boolean;           // Force refresh cache
}
```

### CacheManager

```typescript
class CacheManager {
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T>

  invalidate(key: string): void
  invalidatePattern(pattern: string): void
  clear(): void
  setStorage(storage: ICacheStorage): void
  setStrategy(strategy: ICacheStrategy): void
}
```

## Troubleshooting

### Cache Not Working

1. **Check TTL**: Ensure TTL is set and not expired
2. **Verify Key Generation**: Check if cache keys are consistent
3. **Check Invalidation**: Ensure cache isn't being invalidated unexpectedly

### Memory Issues

1. **Reduce TTL**: Shorter TTL means less data in memory
2. **Limit Cache Size**: Implement cache size limits in custom storage
3. **Clear Cache Periodically**: Use `cacheManager.clear()` when needed

### Stale Data

1. **Reduce TTL**: Use shorter TTL for frequently changing data
2. **Implement Invalidation**: Properly invalidate cache on mutations
3. **Use Force Refresh**: Allow users to force refresh when needed

## Performance Considerations

- **Memory**: Session cache uses in-memory storage. Monitor memory usage for large datasets
- **Key Generation**: Complex key generation may impact performance
- **TTL**: Balance between freshness and cache hit rate
- **Cache Size**: Consider implementing max cache size for production

## Notes

- Cache is session-based and cleared on app restart
- Cache is not shared between app instances
- Cache does not persist across app updates
- All cache operations are synchronous except `getOrSet`

