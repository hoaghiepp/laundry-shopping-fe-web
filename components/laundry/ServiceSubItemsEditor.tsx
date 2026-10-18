import {
  COMPOSED_LINE_MAX,
  NOTE_MAX,
  SUB_ITEM_NAME_MAX,
  SubItemDraft,
  subItemQuantitySum,
} from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const NOTE_MIN_HEIGHT = 36;

interface ServiceSubItemsEditorProps {
  serviceName: string;
  items: SubItemDraft[];
  parentNote: string;
  onParentNoteChange: (note: string) => void;
  onChange: (items: SubItemDraft[]) => void;
}

export const ServiceSubItemsEditor: React.FC<ServiceSubItemsEditorProps> = ({
  serviceName,
  items,
  parentNote,
  onParentNoteChange,
  onChange,
}) => {
  const parentNoteRef = React.useRef<TextInput>(null);
  const [parentNoteHeight, setParentNoteHeight] = React.useState(NOTE_MIN_HEIGHT);

  const update = (key: string, patch: Partial<SubItemDraft>) => {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  React.useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    const node = parentNoteRef.current as unknown as HTMLTextAreaElement | null;
    if (!node || typeof node.scrollHeight !== "number") return;
    const previous = node.style.height;
    node.style.height = "0px";
    const next = Math.max(NOTE_MIN_HEIGHT, node.scrollHeight);
    node.style.height = previous;
    setParentNoteHeight((current) => (current === next ? current : next));
  }, [parentNote]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Món trong dịch vụ</Text>
      <Text style={styles.hint}>
        Gõ tên từng món, ví dụ áo trắng. Mỗi món thành một dòng riêng, số lượng dịch vụ bằng tổng các món.
      </Text>
      <TextInput
        ref={parentNoteRef}
        style={[styles.note, styles.parentNote, { height: parentNoteHeight }]}
        value={parentNote}
        onChangeText={onParentNoteChange}
        placeholder="Ghi chú dịch vụ"
        placeholderTextColor="#9CA3AF"
        maxLength={NOTE_MAX}
        multiline
        scrollEnabled={false}
        onContentSizeChange={(event) => {
          if (Platform.OS === "web") return;
          const next = Math.max(NOTE_MIN_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height));
          setParentNoteHeight((current) => (current === next ? current : next));
        }}
      />
      {items.map((item) => {
        const composed = item.name.trim() ? `${serviceName} - ${item.name.trim()}` : "";
        const tooLong = composed.length > COMPOSED_LINE_MAX || item.name.trim().length > SUB_ITEM_NAME_MAX;
        return (
          <View key={item.key} style={styles.row}>
            <View style={styles.nameCol}>
              <TextInput
                style={[styles.input, tooLong && styles.inputError]}
                value={item.name}
                onChangeText={(name) => update(item.key, { name })}
                placeholder="Tên món"
                placeholderTextColor="#9CA3AF"
                maxLength={SUB_ITEM_NAME_MAX}
              />
              {composed ? (
                <Text style={[styles.preview, tooLong && styles.previewError]} numberOfLines={2}>
                  {composed}
                </Text>
              ) : null}
              <TextInput
                style={styles.note}
                value={item.note || ""}
                onChangeText={(note) => update(item.key, { note })}
                placeholder="Ghi chú món"
                placeholderTextColor="#9CA3AF"
                maxLength={NOTE_MAX}
                multiline
              />
            </View>
            <View style={styles.qty}>
              <TouchableOpacity
                onPress={() => update(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                style={styles.qtyBtn}
              >
                <FontAwesome5 name="minus" size={10} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => update(item.key, { quantity: item.quantity + 1 })}
                style={styles.qtyBtn}
              >
                <FontAwesome5 name="plus" size={10} color="#2563EB" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => onChange(items.filter((entry) => entry.key !== item.key))}
              style={styles.remove}
            >
              <FontAwesome5 name="times" size={12} color="#DC2626" />
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity
        style={styles.add}
        onPress={() =>
          onChange([...items, { key: `${Date.now()}`, name: "", quantity: 1, note: "" }])
        }
      >
        <FontAwesome5 name="plus" size={12} color="#2563EB" />
        <Text style={styles.addText}>Thêm món</Text>
      </TouchableOpacity>
      {items.length > 0 && (
        <Text style={styles.sum}>Số lượng dịch vụ: {subItemQuantitySum(items)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  hint: { fontSize: 12, color: "#6B7280", marginTop: 4, marginBottom: 10, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  nameCol: { flex: 1 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  inputError: { borderColor: "#DC2626" },
  note: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    marginTop: 6,
    marginBottom: 6,
    minHeight: NOTE_MIN_HEIGHT,
  },
  parentNote: {
    marginTop: 0,
    textAlignVertical: "top",
  },
  preview: { fontSize: 11, color: "#6B7280", marginTop: 4 },
  previewError: { color: "#DC2626" },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 4,
  },
  qtyBtn: { padding: 8 },
  qtyText: { minWidth: 18, textAlign: "center", fontWeight: "700", color: "#111827" },
  remove: { padding: 10 },
  add: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  addText: { color: "#2563EB", fontWeight: "700", fontSize: 13 },
  sum: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#1E40AF" },
});
