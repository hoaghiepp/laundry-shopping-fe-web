import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text as UIText } from '@/components/ui/text';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label: string;
  placeholder?: string;
  value?: string | number | null;
  options: SelectOption[];
  onSelect: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Chọn...',
  value,
  options,
  onSelect,
  error,
  disabled = false,
  loading = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string | number) => {
    onSelect(optionValue);
    setIsOpen(false);
  };

  return (
    <Box style={[styles.container, compact && styles.containerCompact]}>
      <UIText style={[styles.label, compact && styles.labelCompact]}>{label}</UIText>
      <TouchableOpacity
        style={[
          styles.selectContainer,
          compact && styles.selectContainerCompact,
          error && styles.selectError,
          disabled && styles.selectDisabled,
        ]}
        onPress={() => !disabled && !loading && setIsOpen(true)}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <Text
          style={[styles.selectText, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {loading ? 'Đang tải...' : selectedOption ? selectedOption.label : placeholder}
        </Text>
        <FontAwesome5
          name="chevron-down"
          size={12}
          color={disabled ? '#D1D5DB' : '#9CA3AF'}
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} activeOpacity={1}>
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={1}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === item.value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <FontAwesome5 name="check" size={14} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không có dữ liệu</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  containerCompact: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  labelCompact: {
    marginBottom: 2,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectContainerCompact: {
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  selectError: {
    borderColor: '#EF4444',
  },
  selectDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionTextSelected: {
    color: '#2563EB',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});


