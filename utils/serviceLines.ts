export const SUB_ITEM_NAME_MAX = 80;
export const COMPOSED_LINE_MAX = 100;
export const NOTE_MAX = 500;

export interface SubItemDraft {
  key: string;
  name: string;
  quantity: number;
  note: string;
}

export function trimNote(note?: string): string | undefined {
  const value = note?.trim();
  return value ? value : undefined;
}

export function validateNote(note?: string): string | null {
  if (note && note.length > NOTE_MAX) return `Ghi chú tối đa ${NOTE_MAX} ký tự`;
  return null;
}

export interface ParentChildGroup<T> {
  parent: T;
  children: T[];
}

export function field(obj: any, ...keys: string[]): any {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function lineIdOf(line: any): string {
  if (line?.cartItemId) return String(line.cartItemId);
  return String(field(line, "id") ?? "");
}

export function parentIdOf(line: any): string | null {
  const value = field(line, "parentId", "parent_id");
  return value ? String(value) : null;
}

export function groupLinesByParent<T>(lines: T[]): ParentChildGroup<T>[] {
  const parents: T[] = [];
  const childrenByParent = new Map<string, T[]>();
  const loose: T[] = [];

  for (const line of lines) {
    const parentId = parentIdOf(line);
    if (!parentId) {
      parents.push(line);
      continue;
    }
    const list = childrenByParent.get(parentId) ?? [];
    list.push(line);
    childrenByParent.set(parentId, list);
  }

  const parentIds = new Set(parents.map((line) => lineIdOf(line)));
  const groups = parents.map((parent) => ({
    parent,
    children: childrenByParent.get(lineIdOf(parent)) ?? [],
  }));

  for (const [parentId, kids] of childrenByParent) {
    if (!parentIds.has(parentId)) loose.push(...kids);
  }
  for (const line of loose) {
    groups.push({ parent: line, children: [] });
  }
  return groups;
}

/** Lines that are physical pieces: children when a parent has them, otherwise the line itself. */
export function pieceLines<T>(lines: T[]): T[] {
  return groupLinesByParent(lines).flatMap((group) =>
    group.children.length > 0 ? group.children : [group.parent]
  );
}

export function subItemQuantitySum(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

export function mergeSubItemDrafts(items: SubItemDraft[]): SubItemDraft[] {
  const merged: SubItemDraft[] = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
    const name = item.name.trim();
    if (!name) {
      merged.push(item);
      continue;
    }
    const existingIndex = indexByName.get(name);
    if (existingIndex === undefined) {
      indexByName.set(name, merged.length);
      merged.push({ ...item, name, note: item.note || "", quantity: Math.max(1, Number(item.quantity) || 1) });
    } else {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: merged[existingIndex].quantity + (Number(item.quantity) || 0),
        note: merged[existingIndex].note?.trim() ? merged[existingIndex].note : item.note || "",
      };
    }
  }
  return merged;
}

export function validateServiceSubItems(
  serviceName: string,
  items: { name: string; quantity: number; note?: string }[]
): string | null {
  if (items.length === 0) return null;

  for (const item of items) {
    const name = item.name.trim();
    if (name.length > SUB_ITEM_NAME_MAX) {
      return `Tên món tối đa ${SUB_ITEM_NAME_MAX} ký tự`;
    }
    if (name) {
      const composed = `${serviceName} - ${name}`;
      if (composed.length > COMPOSED_LINE_MAX) {
        return `"${composed}" vượt ${COMPOSED_LINE_MAX} ký tự`;
      }
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return "Số lượng mỗi món phải là số nguyên lớn hơn 0";
    }
    const noteError = validateNote(item.note);
    if (noteError) return noteError;
  }
  return null;
}

export function subItemDisplayName(name: string, parentName?: string): string {
  const value = name.trim();
  const parent = parentName?.trim();
  if (!parent) return value;
  const prefix = `${parent} -`;
  if (value === prefix || value.startsWith(`${prefix} `)) return value.slice(prefix.length).trim();
  return value;
}

export function chargedLineAmount(unitPrice: number, quantity: number, hasChildren: boolean): number {
  if (hasChildren) return 0;
  return (Number(unitPrice) || 0) * (Number(quantity) || 0);
}

export function lineAmount(line: any): number {
  const explicit = field(line, "total_price", "totalPrice");
  if (explicit !== undefined) return Number(explicit) || 0;
  const quantity = Number(field(line, "quantity") ?? 0);
  const unit = Number(
    field(line, "unit_price", "unitPrice", "price") ?? line?.product?.price ?? 0
  );
  return unit * quantity;
}

export function expandCheckoutIds(
  lines: { id: string; parentId: string | null }[],
  selectedIds: string[]
): string[] {
  const selected = new Set(selectedIds.filter(Boolean));
  const result = new Set<string>();

  for (const id of selected) {
    const line = lines.find((entry) => entry.id === id);
    const rootId = line?.parentId || id;
    result.add(rootId);
    for (const entry of lines) {
      if (entry.id === rootId || entry.parentId === rootId) result.add(entry.id);
    }
  }
  return Array.from(result);
}

export function serviceLineStatusLabel(status?: string | null): string {
  switch (status) {
    case "CREATED":
      return "Đã tạo";
    case "PICKING":
      return "Đang lấy";
    case "AT_FACTORY":
      return "Tại xưởng";
    case "WASHING":
      return "Đang giặt";
    case "WASHED":
      return "Đã giặt";
    case "DELIVERING":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn thành";
    case "RETURNED":
      return "Đã trả";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Chưa có";
  }
}

export const ITEM_TRACKING_STATUSES = [
  { value: "TAGGED", label: "Đã gắn thẻ" },
  { value: "IN_BAG", label: "Trong bao" },
  { value: "IN_TRANSIT", label: "Đang vận chuyển" },
  { value: "RECEIVED_FACTORY", label: "Đã nhận tại xưởng" },
  { value: "WASHING", label: "Đang giặt" },
  { value: "DRIED", label: "Đã sấy" },
  { value: "IRONED", label: "Đã là" },
  { value: "PACKED", label: "Đã đóng gói" },
  { value: "RETURNED_STORE", label: "Đã về cửa hàng" },
] as const;

export function trackingStatusLabel(status?: string | null): string {
  return ITEM_TRACKING_STATUSES.find((item) => item.value === status)?.label || status || "Chưa có";
}

export function orderItemLabel(item: any): string {
  return String(field(item, "product_name", "productName", "item_name", "itemName", "name") || "Dịch vụ");
}

export function garmentsForOrderItem(garments: any[], orderItemId: string): any[] {
  return garments.filter((garment) => {
    const id = field(garment, "order_item_id", "orderItemId");
    return id && String(id) === String(orderItemId);
  });
}
