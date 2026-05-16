import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface IncidentType {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const INCIDENT_TYPES: IncidentType[] = [
  {
    id: 'TORN',
    label: 'Rách, thủng',
    icon: 'cut',
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  {
    id: 'STAIN',
    label: 'Vết bẩn cứng đầu',
    icon: 'tint',
    color: '#EA580C',
    bgColor: '#FFF7ED',
  },
  {
    id: 'COLOR_FADE',
    label: 'Phai màu',
    icon: 'palette',
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
  {
    id: 'SHRINK',
    label: 'Co rút',
    icon: 'compress',
    color: '#CA8A04',
    bgColor: '#FEFCE8',
  },
  {
    id: 'BUTTON_MISSING',
    label: 'Mất cúc áo',
    icon: 'circle',
    color: '#65A30D',
    bgColor: '#F7FEE7',
  },
  {
    id: 'ZIPPER_BROKEN',
    label: 'Hỏng khóa kéo',
    icon: 'link',
    color: '#059669',
    bgColor: '#F0FDF4',
  },
  {
    id: 'DISCOLORATION',
    label: 'Đổi màu',
    icon: 'adjust',
    color: '#0891B2',
    bgColor: '#F0FDFA',
  },
  {
    id: 'OTHER',
    label: 'Khác',
    icon: 'ellipsis-h',
    color: '#6B7280',
    bgColor: '#F9FAFB',
  },
];

interface IncidentTypeSelectorProps {
  selectedType: string | null;
  onSelectType: (typeId: string) => void;
}

export const IncidentTypeSelector: React.FC<IncidentTypeSelectorProps> = ({
  selectedType,
  onSelectType,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loại sự cố</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {INCIDENT_TYPES.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <Pressable
              key={type.id}
              style={({ pressed }) => [
                styles.typeCard,
                { backgroundColor: type.bgColor },
                isSelected && styles.typeCardSelected,
                isSelected && { borderColor: type.color },
                pressed && styles.typeCardPressed,
              ]}
              onPress={() => onSelectType(type.id)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: isSelected ? type.color : '#fff' },
                ]}
              >
                <FontAwesome5
                  name={type.icon}
                  size={20}
                  color={isSelected ? '#fff' : type.color}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  { color: type.color },
                  isSelected && styles.typeLabelSelected,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  typeCard: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 8,
  },
  typeCardSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeCardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeLabelSelected: {
    fontWeight: '700',
  },
});

