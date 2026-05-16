import { GenericQRScannerScreen } from "@/components/screens/shared/GenericQRScannerScreen";
import { Order } from "@/services/api/orderService";
import React from "react";

interface FactoryQRScannerScreenProps {
  factoryId: string;
  onBack: () => void;
  onOrderFound: (order: Order) => void;
  onBarcodeFound?: (barcode: string, trackingItem?: any) => void;
  onTripFound?: (tripId: string, tripCode: string) => void;
}

export const FactoryQRScannerScreen: React.FC<FactoryQRScannerScreenProps> = ({
  factoryId,
  onBack,
  onOrderFound,
  onBarcodeFound,
  onTripFound,
}) => {
  return (
    <GenericQRScannerScreen
      hubId={factoryId}
      mode="both"
      title="Quét / nhập mã đơn"
      onBack={onBack}
      onOrderFound={onOrderFound}
      onBarcodeFound={onBarcodeFound}
      onTripFound={onTripFound}
    />
  );
};
