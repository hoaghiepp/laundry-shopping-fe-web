import { LogisticTripStatus } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogisticsSummaryCard } from './LogisticsSummaryCard';
import { formatDate, getStatusDisplay } from './logisticsUtils';
import { Trip } from './OutboundSection';
import { TripHistoryCard } from './TripHistoryCard';

interface InboundSectionProps {
  totalTrips: number;
  trips: Trip[];
  loading: boolean;
  storeNames: Map<string, string>;
  onTripPress: (tripId: string) => void;
  onScanInbound: () => void;
}

export const InboundSection: React.FC<InboundSectionProps> = ({
  totalTrips,
  trips,
  loading,
  storeNames,
  onTripPress,
  onScanInbound,
}) => {
  return (
    <View style={styles.inboundContent}>
      <LogisticsSummaryCard
        variant="inbound"
        label="Nhận đồ sạch từ Xưởng"
        value={totalTrips.toString() + " đơn"}
        details={[

        ]}
        buttonText="Quét QR nhận hàng"
        buttonIcon="barcode"
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
          return (
            <TripHistoryCard
              key={trip.id}
              tripCode={trip.trip_code}
              date={formatDate(trip.created_date)}
              location={`Từ ${sourceName}`}
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

