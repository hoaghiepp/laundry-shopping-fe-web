import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

interface ReportExpandableChartCardProps {
  title: string;
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  canExpand?: boolean;
}

export const ReportExpandableChartCard: React.FC<ReportExpandableChartCardProps> = ({
  title,
  children,
  expandedContent,
  canExpand = true,
}) => {
  const [open, setOpen] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const panelWidth = Math.min(1100, Math.max(640, windowWidth - 48));
  const panelMaxHeight = Math.min(windowHeight - 48, 720);

  return (
    <>
      <View style={styles.sectionCard}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {canExpand ? (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setOpen(true)}
              activeOpacity={0.75}
              accessibilityLabel="Phóng to biểu đồ"
            >
              <FontAwesome5 name="expand-alt" size={13} color="#2563EB" />
              <Text style={styles.expandBtnText}>Phóng to</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {children}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { width: panelWidth, maxHeight: panelMaxHeight }]}
            onPress={() => {}}
          >
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOpen(false)}
                activeOpacity={0.75}
                accessibilityLabel="Thu nhỏ biểu đồ"
              >
                <FontAwesome5 name="compress-alt" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.panelScroll}
              contentContainerStyle={styles.panelScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {expandedContent}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  panelTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelScroll: {
    flexGrow: 0,
  },
  panelScrollContent: {
    padding: 20,
    paddingBottom: 28,
  },
});
