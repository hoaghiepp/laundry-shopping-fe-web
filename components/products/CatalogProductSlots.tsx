import { ProductItem } from "@/models/model";
import { groupCatalogProducts } from "@/utils/variantGroup";
import React from "react";
import { VariantGroupBox } from "./VariantGroupBox";

interface CatalogProductSlotsProps {
  products: ProductItem[];
  renderSingle: (product: ProductItem) => React.ReactNode;
  onSelectVariant: (product: ProductItem) => void;
  variantLayout?: "card" | "full";
}

export const CatalogProductSlots: React.FC<CatalogProductSlotsProps> = ({
  products,
  renderSingle,
  onSelectVariant,
  variantLayout = "full",
}) => {
  return (
    <>
      {groupCatalogProducts(products).map((entry) =>
        entry.kind === "single" ? (
          <React.Fragment key={entry.product.id}>{renderSingle(entry.product)}</React.Fragment>
        ) : (
          <VariantGroupBox
            key={entry.key}
            title={entry.title}
            products={entry.products}
            onSelect={onSelectVariant}
            layout={variantLayout}
          />
        )
      )}
    </>
  );
};
