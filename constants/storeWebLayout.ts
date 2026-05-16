import { Platform } from "react-native";

/** Fixed store header (web) height — keep in sync with `StoreHeader` web min/max. */
export const STORE_WEB_HEADER_HEIGHT = 64;

/** Secondary web nav row under header. */
export const STORE_WEB_NAV_HEIGHT = 52;

/** Combined top inset for main tab content under header + web nav. */
export const STORE_WEB_CHROME_TOP =
  STORE_WEB_HEADER_HEIGHT + STORE_WEB_NAV_HEIGHT;

/** Main store tab screens: top padding under global header (native = bottom nav clearance pattern). */
export function storeMainContentPaddingTop(): number {
  return Platform.OS === "web" ? STORE_WEB_CHROME_TOP : 80;
}

/** Space above bottom nav (native) or page bottom breathing room (web). */
export function storeMainContentMarginBottom(): number {
  return Platform.OS === "web" ? 20 : 80;
}
