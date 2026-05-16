import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StatusDisplay {
  text: string;
  color: string;
  bg: string;
}

interface TripHistoryCardProps {
  tripCode: string;
  date: string;
  location: string;
  statusDisplay: StatusDisplay;
  onPress: () => void;
}

export const TripHistoryCard: React.FC<TripHistoryCardProps> = ({
  tripCode,
  date,
  location,
  statusDisplay,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.historyContent}>
        <View style={styles.historyLeft}>
          <Text style={styles.historyId}>{tripCode}</Text>
          <Text style={styles.historyMeta}>
            {date} • {location}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusDisplay.bg },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: statusDisplay.color },
            ]}
          >
            {statusDisplay.text}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flex: 1,
  },
  historyId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  historyMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D97706',
  },
});

