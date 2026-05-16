import { Alert, Platform } from "react-native";
import { tryPushWebAlert } from "@/lib/webAlertBridge";

export type CompatAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

function queuePress(fn?: () => void) {
  if (!fn) return;
  queueMicrotask(() => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

function webAlert(title: string, message?: string, buttons?: CompatAlertButton[]) {
  if (typeof window === "undefined") return;

  const body =
    message != null && message !== "" ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(body);
    return;
  }

  if (buttons.length === 1) {
    window.alert(body);
    queuePress(buttons[0].onPress);
    return;
  }

  if (buttons.length === 2) {
    const cancelBtn = buttons.find((b) => b.style === "cancel") ?? buttons[0];
    const confirmBtn =
      buttons.find((b) => b !== cancelBtn && b.style === "destructive") ??
      buttons.find((b) => b !== cancelBtn) ??
      buttons[1];
    const ok = window.confirm(body);
    if (ok) {
      queuePress(confirmBtn?.onPress);
    } else {
      queuePress(cancelBtn?.onPress);
    }
    return;
  }

  window.alert(
    `${body}\n\n(Trình duyệt chỉ hỗ trợ tối đa 2 lựa chọn; vui lòng dùng ứng dụng di động cho đầy đủ tuỳ chọn.)`
  );
}

/**
 * Same call shape as React Native `Alert.alert`, but uses `window.alert` / `window.confirm` on web
 * where `Alert` is not supported.
 */
export function compatAlert(
  title: string,
  message?: string,
  buttons?: CompatAlertButton[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _options?: any
): void {
  if (Platform.OS === "web") {
    if (tryPushWebAlert({ title, message, buttons })) {
      return;
    }
    webAlert(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons, _options);
}
