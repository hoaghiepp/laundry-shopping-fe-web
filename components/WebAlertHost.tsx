import {
  registerWebAlertHost,
  type WebAlertButton,
  type WebAlertPayload,
} from "@/lib/webAlertBridge";
import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Renders Material-style dialogs for `compatAlert` on web (replaces `window.alert`).
 * Mount once under the app root (e.g. `_layout.tsx`).
 */
export function WebAlertHost() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<WebAlertPayload | null>(null);

  const show = useCallback((p: WebAlertPayload) => {
    setPayload(p);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    registerWebAlertHost(show);
    return () => registerWebAlertHost(null);
  }, [show]);

  if (Platform.OS !== "web") {
    return null;
  }

  const buttons: WebAlertButton[] =
    payload?.buttons && payload.buttons.length > 0
      ? payload.buttons
      : [{ text: "OK" }];

  const close = () => {
    setVisible(false);
    setPayload(null);
  };

  const onButtonPress = (btn: WebAlertButton) => {
    close();
    queueMicrotask(() => {
      try {
        btn.onPress?.();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {payload ? (
            <>
              <Text style={styles.title}>{payload.title}</Text>
              {payload.message ? (
                <Text style={styles.message}>{payload.message}</Text>
              ) : null}
              <View style={styles.actions}>
                {buttons.map((btn, i) => (
                  <Pressable
                    key={`${btn.text}-${i}`}
                    onPress={() => onButtonPress(btn)}
                    style={({ pressed }) => [
                      styles.btn,
                      btn.style === "destructive" && styles.btnDanger,
                      pressed && styles.btnHover,
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        btn.style === "destructive" && styles.btnTextDanger,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    minWidth: 88,
    alignItems: "center",
  },
  btnHover: {
    backgroundColor: "#DBEAFE",
  },
  btnDanger: {
    backgroundColor: "#FEF2F2",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  btnTextDanger: {
    color: "#B91C1C",
  },
});
