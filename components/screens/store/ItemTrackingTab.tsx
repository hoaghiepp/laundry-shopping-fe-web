import { ItemPassportScreen } from "@/components/screens/shared/ItemPassportScreen";
import { ItemSearchScreen } from "@/components/screens/shared/ItemSearchScreen";
import { storeMainContentPaddingTop } from "@/constants/storeWebLayout";
import React, { useState } from "react";

interface ItemTrackingTabProps {
  storeId?: string;
}

/** Store tab next to Giao nhận. Search calls POST /v1/staff/item-tracking/search. */
export const ItemTrackingTab: React.FC<ItemTrackingTabProps> = ({ storeId }) => {
  const topInset = storeMainContentPaddingTop();
  const [passport, setPassport] = useState<{ id: string; barcode?: string } | null>(null);

  if (passport) {
    return (
      <ItemPassportScreen
        trackingId={passport.id}
        initialBarcode={passport.barcode}
        topInset={topInset}
        onBack={() => setPassport(null)}
      />
    );
  }

  return (
    <ItemSearchScreen
      currentStoreId={storeId}
      topInset={topInset}
      onOpenPassport={(trackingId, barcode) => setPassport({ id: trackingId, barcode })}
    />
  );
};
