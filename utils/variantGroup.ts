import { ProductStatus, ProductType } from "@/constants/enum";
import { ProductItem } from "@/models/model";
import { productService } from "@/services/api/productService";

export const VARIANT_GROUP_MAX_LENGTH = 100;

export type CatalogEntry =
  | { kind: "single"; product: ProductItem }
  | { kind: "group"; key: string; title: string; products: ProductItem[] };

type VariantSource = { variant_group?: string | null; variantGroup?: string | null };

/** Trimmed group name, or null when the product stands alone. */
export function variantGroupOf(product: VariantSource | null | undefined): string | null {
  if (!product) return null;
  const raw = product.variant_group ?? product.variantGroup;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function groupKey(product: ProductItem): string | null {
  const title = variantGroupOf(product);
  if (!title) return null;
  return `${product.store_id || ""}::${title}`;
}

/** Collapse products that share a store and variant group. Order follows the first member. */
export function groupCatalogProducts(products: ProductItem[]): CatalogEntry[] {
  const unique: ProductItem[] = [];
  const seenIds = new Set<string>();
  for (const product of products) {
    if (!product?.id || seenIds.has(product.id)) continue;
    seenIds.add(product.id);
    unique.push(product);
  }

  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();

  for (const product of unique) {
    const key = groupKey(product);
    if (!key) {
      entries.push({ kind: "single", product });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const title = variantGroupOf(product) as string;
    const members = unique.filter((item) => groupKey(item) === key);
    entries.push({ kind: "group", key, title, products: members });
  }

  return entries;
}

export function mergeProductsById(current: ProductItem[], incoming: ProductItem[]): ProductItem[] {
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  for (const item of incoming) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

const variantGroupCache = new Map<string, Promise<string[]>>();

/** Distinct variant groups already used in a store. */
export function listStoreVariantGroups(storeId: string): Promise<string[]> {
  const cached = variantGroupCache.get(storeId);
  if (cached) return cached;
  const pending = (async () => {
    const names = new Set<string>();
    for (let page = 0; page < 5; page++) {
      const response = await productService.searchProducts(page, 100, undefined, {
        store_id: storeId,
      });
      const batch: ProductItem[] = response?.data || [];
      for (const item of batch) {
        const group = variantGroupOf(item);
        if (group) names.add(group);
      }
      if (batch.length < 100) break;
    }
    return [...names].sort((a, b) => a.localeCompare(b, "vi"));
  })().catch((error) => {
    variantGroupCache.delete(storeId);
    throw error;
  });
  variantGroupCache.set(storeId, pending);
  return pending;
}

async function fetchGroup(storeId: string, variantGroup: string, type?: string): Promise<ProductItem[]> {
  const all: ProductItem[] = [];
  for (let page = 0; page < 5; page++) {
    const response = await productService.searchProducts(page, 100, undefined, {
      store_id: storeId,
      variant_group: variantGroup,
      status: ProductStatus.ACTIVE,
      ...(type ? { type: type as ProductType } : {}),
    });
    const batch: ProductItem[] = response?.data || [];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Pagination can split one group. Fetch each group on the page so the box lists every option.
 * Failed group lookups leave the products already loaded.
 */
export async function expandVariantGroups(
  products: ProductItem[],
  options?: { type?: string }
): Promise<ProductItem[]> {
  const pending = new Map<string, { storeId: string; group: string }>();
  for (const product of products) {
    const group = variantGroupOf(product);
    if (!group || !product.store_id) continue;
    pending.set(`${product.store_id}::${group}`, { storeId: product.store_id, group });
  }
  if (pending.size === 0) return products;

  const fetched = await Promise.all(
    [...pending.values()].map(async ({ storeId, group }) => {
      try {
        const items = await fetchGroup(storeId, group, options?.type);
        return options?.type ? items.filter((item) => item.type === options.type) : items;
      } catch {
        return [] as ProductItem[];
      }
    })
  );

  const extras = new Map<string, ProductItem[]>();
  for (const list of fetched) {
    for (const item of list) {
      const key = groupKey(item);
      if (!key) continue;
      const bucket = extras.get(key) || [];
      bucket.push(item);
      extras.set(key, bucket);
    }
  }

  const result: ProductItem[] = [];
  const seenIds = new Set<string>();
  const inserted = new Set<string>();

  const push = (item: ProductItem) => {
    if (!item?.id || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    result.push(item);
  };

  for (const product of products) {
    const key = groupKey(product);
    const members = key ? extras.get(key) : undefined;
    if (key && members && members.length > 0) {
      if (!inserted.has(key)) {
        inserted.add(key);
        members.forEach(push);
      }
      continue;
    }
    push(product);
  }

  return result;
}
