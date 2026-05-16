import { LogisticsSummaryCard } from '@/components/store/logistics/LogisticsSummaryCard';
import { TripHistoryCard } from '@/components/store/logistics/TripHistoryCard';
import { formatDate, getStatusDisplay } from '@/components/store/logistics/logisticsUtils';
import { LogisticTripStatus } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface Trip {
  id: string;
  trip_code: string;
  source_store_id: string;
  destination_store_id: string;
  status: string;
  created_date: string;
  last_modified_date: string;
  logistic_trip_items?: any[];
}

interface FactoryInboundSectionProps {
  totalTrips: number;
  trips: Trip[];
  loading: boolean;
  storeNames: Map<string, string>;
  tripOrderCodes: Map<string, string[]>;
  onTripPress: (tripId: string) => void;
  onScanInbound?: () => void;
}

export const FactoryInboundSection: React.FC<FactoryInboundSectionProps> = ({
  totalTrips,
  trips,
  loading,
  storeNames,
  tripOrderCodes,
  onTripPress,
  onScanInbound,
}) => {
  return (
    <View style={styles.inboundContent}>
      <LogisticsSummaryCard
        variant="inbound"
        label="Nhận hàng từ Tiệm"
        value={totalTrips.toString() + " chuyến"}
        buttonText={onScanInbound ? "Quét mã nhận hàng" : undefined}
        buttonIcon={onScanInbound ? "barcode" : undefined}
        onButtonPress={onScanInbound}
      />

      <Text style={styles.sectionTitle}>Lịch sử Nhận hàng</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#059669" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="box" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có chuyến nhận hàng nào</Text>
        </View>
      ) : (
        trips.map((trip) => {
          const statusDisplay = getStatusDisplay(trip.status);
          const sourceName =
            storeNames.get(trip.source_store_id) || 'Chưa xác định';
          const orderCodes = tripOrderCodes.get(trip.id) || [];
          const orderCodesText = orderCodes.length > 0 
            ? `📋 ${orderCodes.join(', ')}` 
            : '';
          return (
            <TripHistoryCard
              key={trip.id}
              tripCode={trip.trip_code}
              date={formatDate(trip.created_date)}
              location={`Từ ${sourceName} ${orderCodesText}`}
              statusDisplay={statusDisplay}
              onPress={() => onTripPress(trip.id)}
            />
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inboundContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
});

