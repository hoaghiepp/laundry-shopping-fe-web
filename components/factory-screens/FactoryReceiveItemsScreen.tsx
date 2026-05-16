import { ReceiveItemsScreen } from '@/components/screens/shared/ReceiveItemsScreen';
import React from 'react';

interface FactoryReceiveItemsScreenProps {
  tripId: string;
  tripCode: string;
  sourceStoreName: string;
  factoryId: string;
  onBack: () => void;
  onComplete: () => void;
}

export const FactoryReceiveItemsScreen: React.FC<FactoryReceiveItemsScreenProps> = ({
  tripId,
  tripCode,
  sourceStoreName,
  factoryId,
  onBack,
  onComplete,
}) => {
  return (
    <ReceiveItemsScreen
      tripId={tripId}
      tripCode={tripCode}
      sourceStoreName={sourceStoreName}
      hubId={factoryId}
      hubType="factory"
      onBack={onBack}
      onComplete={onComplete}
    />
  );
};