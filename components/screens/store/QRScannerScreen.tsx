import { GenericQRScannerScreen } from "@/components/screens/shared/GenericQRScannerScreen";
import { Order } from "@/services/api/orderService";
import React from "react";

interface QRScannerScreenProps {
  storeId: string;
  onBack: () => void;
  onOrderFound: (order: Order) => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  storeId,
  onBack,
  onOrderFound,
}) => {
  return (
    <GenericQRScannerScreen
      hubId={storeId}
      mode="order"
      title="Quét / nhập mã đơn"
      onBack={onBack}
      onOrderFound={onOrderFound}
    />
  );
};
