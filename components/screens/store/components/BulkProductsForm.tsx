import { ProductStatus, ProductType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { AddProductBulkRequest, AddProductRequest, productService } from "@/services/api/productService";
import { uploadService } from "@/services/api/uploadService";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BulkProductRow, BulkProductRowValue } from "./BulkProductRow";

interface BulkProductsFormProps {
  storeId?: string;
  categories: any[];
  onDone: () => void;
}

const emptyRow = (): BulkProductRowValue => ({
  name: "",
  sku: "",
  price: "",
  stock_quantity: "",
  unit: "",
  description: "",
  category_ids: [],
  thumbnailImage: null,
  galleryImages: [],
  type: ProductType.GOODS,
  status: ProductStatus.ACTIVE,
});

export const BulkProductsForm: React.FC<BulkProductsFormProps> = ({
  storeId,
  categories,
  onDone,
}) => {
  const [rows, setRows] = useState<BulkProductRowValue[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => rows.some((r) => r.name && r.sku && r.price && r.stock_quantity), [rows]);

  const validateRows = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name || !r.sku || !r.price || !r.stock_quantity) {
        return `Vui lòng điền đủ thông tin bắt buộc cho Sản phẩm ${i + 1}`;
      }
      if (!r.thumbnailImage) {
        return `Vui lòng chọn ảnh đại diện cho Sản phẩm ${i + 1}`;
      }
      if (r.type !== ProductType.ASSET && !r.sku) {
        return `Vui lòng nhập SKU cho Sản phẩm ${i + 1}`;
      }
      if (r.type === ProductType.ASSET) {
        return `Bulk mode chưa hỗ trợ loại ASSET (Sản phẩm ${i + 1})`;
      }
    }
    return null;
  };

  const handleSaveBulk = async () => {
    if (!storeId) {
      compatAlert("Lỗi", "Vui lòng chọn cửa hàng");
      return;
    }

    const err = validateRows();
    if (err) {
      compatAlert("Lỗi", err);
      return;
    }

    try {
      setSaving(true);
      const uploadMethod = uploadService.staffUpload;

      const payloads: { payload: AddProductRequest; status: ProductStatus }[] =
        [];

      for (const r of rows) {
        const gallery_urls: string[] = [];
        if (r.galleryImages?.length) {
          for (const asset of r.galleryImages) {
            const uploadRes = await uploadMethod({
              uri: asset.uri,
              name: asset.fileName || asset.fileName?.split("/").pop() || "gallery.jpg",
              mimeType: asset.mimeType || "image/jpeg",
            });
            gallery_urls.push(uploadRes.data.url);
          }
        }

        const thumb = r.thumbnailImage as ImagePicker.ImagePickerAsset;
        const thumbRes = await uploadMethod({
          uri: thumb.uri,
          name: thumb.fileName || thumb.fileName?.split("/").pop() || "thumbnail.jpg",
          mimeType: thumb.mimeType || "image/jpeg",
        });

        payloads.push({
          status: r.status,
          payload: {
            name: r.name,
            price: Number(r.price),
            reserved_quantity: 0,
            sku: r.sku.toUpperCase(),
            stock_quantity: Number(r.stock_quantity),
            store_id: storeId,
            type: r.type.toString(),
            unit: r.unit,
            category_ids: r.category_ids,
            description: r.description,
            thumbnail_url: thumbRes.data.url,
            gallery_urls,
            priority: 1,
          },
        });
      }

      const bulkRequest: AddProductBulkRequest = {
        products: payloads.map((p) => p.payload),
      };

      console.log('bulkRequest', bulkRequest);

      const res = await productService.addProducts(bulkRequest);

      // If API doesn't support status on create, set INACTIVE after bulk create (best-effort).
      const createdProducts: any[] =
        res?.data ??
        res?.products ??
        res?.data?.data ??
        [];

      if (Array.isArray(createdProducts) && createdProducts.length) {
        const idBySku = new Map<string, string>();
        for (const p of createdProducts) {
          const id = String(p?.id ?? "");
          const sku = String(p?.sku ?? "");
          if (id && sku) idBySku.set(sku.toUpperCase(), id);
        }

        const inactiveRows = payloads.filter((p) => p.status === ProductStatus.INACTIVE);
        await Promise.all(
          inactiveRows
            .map((r) => {
              const id = idBySku.get(r.payload.sku.toUpperCase());
              if (!id) return null;
              return productService.updateProduct(id, { status: ProductStatus.INACTIVE });
            })
            .filter(Boolean) as Promise<any>[]
        );
      }

      compatAlert("Thành công", "Đã thêm nhiều sản phẩm");
      onDone();
    } catch (e: any) {
      compatAlert("Lỗi", e?.message || "Thêm tiện ích thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Thêm nhiều sản phẩm</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSaveBulk}
          activeOpacity={0.8}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveText}>{saving ? "Đang lưu..." : "Lưu"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rows}>
        {rows.map((row, idx) => (
          <BulkProductRow
            key={`row-${idx}`}
            index={idx}
            categories={categories}
            value={row}
            onChange={(next) =>
              setRows((prev) => prev.map((p, i) => (i === idx ? next : p)))
            }
            onRemove={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            canRemove={rows.length > 1}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.addRowBtn}
        onPress={() => setRows((prev) => [...prev, emptyRow()])}
        activeOpacity={0.8}
        disabled={saving}
      >
        <FontAwesome5 name="plus" size={14} color="#2563EB" />
        <Text style={styles.addRowText}>Thêm dòng</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  rows: {
    gap: 12,
  },
  addRowBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addRowText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
});

