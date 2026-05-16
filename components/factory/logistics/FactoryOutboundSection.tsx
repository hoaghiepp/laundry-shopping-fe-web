import { LogisticsSummaryCard } from '@/components/store/logistics/LogisticsSummaryCard';
import { TripHistoryCard } from '@/components/store/logistics/TripHistoryCard';
import { formatDate, getStatusDisplay } from '@/components/store/logistics/logisticsUtils';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Trip } from './FactoryInboundSection';

interface FactoryOutboundSectionProps {
  totalTrips: number;
  trips: Trip[];
  loading: boolean;
  storeNames: Map<string, string>;
  onTripPress: (tripId: string) => void;
  onCreateShipment: () => void;
}

export const FactoryOutboundSection: React.FC<FactoryOutboundSectionProps> = ({
  totalTrips,
  trips,
  loading,
  storeNames,
  onTripPress,
  onCreateShipment,
}) => {
  return (
    <View style={styles.outboundContent}>
      <LogisticsSummaryCard
        variant="outbound"
        label="Hàng sạch chờ trả về Tiệm"
        value={totalTrips.toString() + " chuyến"}
        buttonText="Quét gom & Tạo chuyến trả"
        buttonIcon="qrcode"
        onButtonPress={onCreateShipment}
      />

      <Text style={styles.sectionTitle}>Lịch sử Trả hàng</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="truck" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có chuyến trả hàng nào</Text>
        </View>
      ) : (
        trips.map((trip) => {
          const statusDisplay = getStatusDisplay(trip.status);
          const destinationName =
            storeNames.get(trip.destination_store_id) || 'Chưa xác định';
          return (
            <TripHistoryCard
              key={trip.id}
              tripCode={trip.trip_code}
              date={formatDate(trip.created_date)}
              location={`Đến ${destinationName}`}
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
  outboundContent: {
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

