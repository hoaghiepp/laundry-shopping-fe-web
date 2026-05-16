import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DisplayOrder, formatPrice } from "./utils/orderUtils";

interface OrderCardProps {
  order: DisplayOrder;
  isExpanded: boolean;
  onPress: () => void;
  onToggleExpand: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isExpanded,
  onPress,
  onToggleExpand,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.orderCard,
        order.isException && styles.orderCardException,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {order.isException  && (
        <View style={styles.exceptionBadge}>
          <Text style={styles.exceptionBadgeText}>Cần xử lý</Text>
        </View>
      )}
      
      {/* Top Header: Store Name (top) and Status Badges (below) */}
      <View style={styles.orderTopHeader}>
        {order.storeName && (
          <Text style={styles.storeName}>{order.storeName}</Text>
        )}
        <View style={styles.statusBadgesContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: order.statusBg },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: order.statusColor },
              ]}
            >
              {order.status}
            </Text>
          </View>
          {order.isNeedShipment && (
            <View style={[styles.infoBadge, styles.shipmentBadge]}>
              <FontAwesome5 name="truck" size={8} color="#2563EB" />
              <Text style={styles.infoBadgeText}>Lấy tại nhà</Text>
            </View>
          )}
          {order.isSplitShipment && (
            <View style={[styles.infoBadge, styles.splitBadge]}>
              <FontAwesome5 name="boxes" size={8} color="#F59E0B" />
              <Text style={styles.infoBadgeText}>Tách đơn</Text>
            </View>
          )}
          {order.isDelivering && (
            <View style={[styles.infoBadge, styles.deliveryBadge]}>
              <FontAwesome5 name="truck-moving" size={8} color="#0EA5E9" />
              <Text style={styles.infoBadgeText}>Đang vận chuyển</Text>
            </View>
          )}
        </View>
      </View>

      {/* Item List */}
      <View style={styles.itemsSection}>
        {order.orderItems && order.orderItems.length > 0 ? (
          <>
            {/* First Item - Always Visible */}
            <View style={styles.orderItemRow}>
              <View style={styles.itemImageContainer}>
                {order.firstItemImage ? (
                  <Image
                    source={{ uri: order.firstItemImage }}
                    style={styles.itemImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.imagePlaceholder]}>
                    <FontAwesome5 name="image" size={16} color="#D1D5DB" />
                  </View>
                )}
              </View>
              <View style={styles.itemInfoContainer}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {order.orderItems[0].product_name || "Sản phẩm"}
                </Text>
                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemQuantity}>
                    SL: {order.orderItems[0].quantity || 1} {order.orderItems[0].unit || "cái"}
                  </Text>
                  {order.orderItems[0].unit_price && (
                    <Text style={styles.itemPrice}>
                      {formatPrice(order.orderItems[0].unit_price * order.orderItems[0].quantity)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Remaining Items - Expandable */}
            {order.orderItems.length > 1 && (
              <>
                {isExpanded && (
                  <>
                    {order.orderItems.slice(1).map((item: any, index: number) => (
                      <View key={index} style={styles.orderItemRow}>
                        <View style={styles.itemImageContainer}>
                          {item.product_image || item.product_thumbnail_url ? (
                            <Image
                              source={{ uri: item.product_image || item.product_thumbnail_url }}
                              style={styles.itemImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.itemImage, styles.imagePlaceholder]}>
                              <FontAwesome5 name="image" size={16} color="#D1D5DB" />
                            </View>
                          )}
                        </View>
                        <View style={styles.itemInfoContainer}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.product_name || "Sản phẩm"}
                          </Text>
                          <View style={styles.itemBottomRow}>
                            <Text style={styles.itemQuantity}>
                              SL: {item.quantity || 1} {item.unit || "cái"}
                            </Text>
                            {item.unit_price && (
                              <Text style={styles.itemPrice}>
                                {formatPrice(item.unit_price * item.quantity)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  activeOpacity={1}
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded
                      ? `Thu gọn (${order.orderItems.length - 1} sản phẩm)`
                      : `Xem thêm ${order.orderItems.length - 1} sản phẩm`}
                  </Text>
                  <FontAwesome5
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={12}
                    color="#2563EB"
                  />
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <Text style={styles.noItemsText}>Không có sản phẩm</Text>
        )}
      </View>

      {/* Order Code and Time */}
      <View style={styles.orderMetaSection}>
        <Text style={styles.orderMeta}>
          #{order.orderId} • {order.dateTime}
        </Text>
        <Text style={styles.orderRelativeTime}>
          {order.time}
        </Text>
      </View>

      {/* Full Address */}
      <View style={styles.addressSection}>
        <FontAwesome5 name="map-marker-alt" size={12} color="#6B7280" />
        <Text style={styles.fullAddressText}>{order.fullAddress}</Text>
      </View>

      {/* Order Body: Price */}
      <View style={styles.orderBody}>
        {order.totalItemCount > 0 && (
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>
              {order.totalItemCount} sản phẩm
            </Text>
          </View>
        )}
        <View style={styles.orderPriceContainer}>
          <View style={styles.orderPrice}>
            <Text style={styles.priceValue}>{order.price}</Text>
            {order.paymentMethod && (
              <Text style={styles.priceMethod}>
                {order.paymentMethod}
              </Text>
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        {!order.isException && (
          <View style={styles.orderIcons}>
            <View style={styles.iconBubble}>
              <FontAwesome5
                name="tshirt"
                size={8}
                color="#6B7280"
              />
            </View>
            <View style={styles.iconBubble}>
              <FontAwesome5
                name="bottle-water"
                size={8}
                color="#6B7280"
              />
            </View>
          </View>
        )}
        <Text
          style={[
            styles.viewDetail,
            order.isException && styles.viewDetailException,
          ]}
        >
          {order.isException
            ? "Vui lòng xác nhận ngay"
            : "Xem chi tiết"}{" "}
          <FontAwesome5 name="chevron-right" size={8} />
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  orderCardException: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  exceptionBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
    zIndex: 10,
  },
  exceptionBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  orderTopHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadgesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  shipmentBadge: {
    backgroundColor: "#DBEAFE",
  },
  splitBadge: {
    backgroundColor: "#FEF3C7",
  },
  deliveryBadge: {
    backgroundColor: "#E0F2FE",
  },
  infoBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemsSection: {
    marginBottom: 12,
  },
  orderItemRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  itemImageContainer: {
    width: 56,
    height: 56,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  itemInfoContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemQuantity: {
    fontSize: 11,
    color: "#6B7280",
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  noItemsText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  orderMetaSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  orderRelativeTime: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  addressSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  fullAddressText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  orderBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderPriceContainer: {
    alignItems: "flex-end",
    gap: 6,
  },
  itemCountBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemCountText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  orderPrice: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  priceMethod: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F9FAFB",
    paddingTop: 12,
  },
  orderIcons: {
    flexDirection: "row",
    gap: -8,
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetail: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  viewDetailException: {
    color: "#EF4444",
    fontWeight: "700",
  },
});

