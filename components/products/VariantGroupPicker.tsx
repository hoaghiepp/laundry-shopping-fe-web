import { listStoreVariantGroups, VARIANT_GROUP_MAX_LENGTH } from "@/utils/variantGroup";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

interface VariantGroupPickerProps {
  storeId?: string;
  value: string;
  onChange: (value: string) => void;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Search existing variant groups for a store.
 * A match is chosen as an option. Text that is not an existing group is created on save.
 */
export const VariantGroupPicker: React.FC<VariantGroupPickerProps> = ({
  storeId,
  value,
  onChange,
  inputStyle,
}) => {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    if (!storeId) {
      setGroups([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listStoreVariantGroups(storeId)
      .then((next) => {
        if (!cancelled) setGroups(next);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      cancelClose();
    };
  }, [storeId]);

  const query = value.trim();
  const matches = useMemo(() => {
    const needle = fold(query);
    const source = needle ? groups.filter((group) => fold(group).includes(needle)) : groups;
    return source.slice(0, 8);
  }, [groups, query]);
  const exact = groups.some((group) => group === query);
  const canCreate = query.length > 0 && !exact;

  const choose = (next: string) => {
    cancelClose();
    onChange(next.slice(0, VARIANT_GROUP_MAX_LENGTH));
    setOpen(false);
  };

  const keepOpenOnPress = Platform.OS === "web"
    ? { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() }
    : {};

  return (
    <View style={styles.wrap}>
      <View style={styles.inputWrap}>
        <FontAwesome5 name="search" size={12} color="#9CA3AF" style={styles.icon} />
        <TextInput
          style={[inputStyle, styles.inputPad]}
          placeholder="Tìm hoặc tạo nhóm, VD: Áo"
          value={value}
          onChangeText={(text) => {
            onChange(text.slice(0, VARIANT_GROUP_MAX_LENGTH));
            setOpen(true);
          }}
          onFocus={() => {
            cancelClose();
            setOpen(true);
          }}
          onBlur={() => {
            cancelClose();
            closeTimer.current = setTimeout(() => setOpen(false), 200);
          }}
          placeholderTextColor="#9CA3AF"
          maxLength={VARIANT_GROUP_MAX_LENGTH}
        />
      </View>
      {open && (loading || matches.length > 0 || canCreate) ? (
        <View style={styles.menu}>
          {loading ? <Text style={styles.hint}>Đang tìm nhóm...</Text> : null}
          {matches.map((group) => (
            <Pressable
              key={group}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => choose(group)}
              {...keepOpenOnPress}
            >
              <Text style={styles.optionText}>{group}</Text>
            </Pressable>
          ))}
          {canCreate ? (
            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => choose(query)}
              {...keepOpenOnPress}
            >
              <Text style={styles.createText}>Tạo mới: {query}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  inputWrap: { position: "relative", justifyContent: "center" },
  icon: { position: "absolute", left: 12, zIndex: 1 },
  inputPad: { paddingLeft: 32 },
  menu: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  option: { paddingHorizontal: 12, paddingVertical: 10 },
  optionPressed: { backgroundColor: "#EFF6FF" },
  optionText: { fontSize: 14, color: "#1F2937" },
  createText: { fontSize: 14, color: "#2563EB", fontWeight: "600" },
  hint: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#6B7280" },
});
