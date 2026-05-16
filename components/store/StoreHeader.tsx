import { STORE_WEB_HEADER_HEIGHT } from "@/constants/storeWebLayout";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface StoreHeaderProps {
  storeName: string;
  onStorePress: () => void;
  onNotificationPress: () => void;
  onPrintPress: () => void;
  onProfilePress: () => void;
  onManageAccountPress?: () => void;
  onPromotionPress?: () => void;
  hasNotification?: boolean;
  showManageAccount?: boolean;
  showPromotionButton?: boolean;
  onManageStorePress?: () => void;
  showManageStoreButton?: boolean;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  storeName,
  onStorePress,
  onNotificationPress,
  onPrintPress,
  onProfilePress,
  onManageAccountPress,
  onPromotionPress,
  hasNotification = false,
  showManageAccount = false,
  showPromotionButton = false,
  onManageStorePress,
  showManageStoreButton = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.storeInfo}
        onPress={onStorePress}
        activeOpacity={0.7}
      >
        <Text style={styles.label}>ĐIỂM GIAO DỊCH</Text>
        <View style={styles.storeName}>
          <FontAwesome5
            name="store"
            size={12}
            color="#FFFFFF"
            style={styles.storeIcon}
          />
          <Text style={styles.storeText}>{storeName}</Text>
          <FontAwesome5
            name="caret-down"
            size={12}
            color="#FFFFFF"
            style={styles.caretIcon}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        {showManageStoreButton && onManageStorePress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onManageStorePress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="store-alt" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {showPromotionButton && onPromotionPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPromotionPress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="tag" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {showManageAccount && onManageAccountPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onManageAccountPress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="user-cog" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="bell" size={12} color="#FFFFFF" />
          {hasNotification && <View style={styles.notificationDot} />}
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="user" size={12} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPrintPress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="print" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 14,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,

    ...Platform.select({
      web: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
        paddingTop: 10,
        paddingBottom: 8,
        minHeight: STORE_WEB_HEADER_HEIGHT,
        maxHeight: STORE_WEB_HEADER_HEIGHT,
      },
      default: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: 18,
        paddingBottom: 10,
      },
    }),
  },

  // container: {
  //   backgroundColor: '#1e40af',
  //   paddingHorizontal: 16,
  //   paddingVertical: 12,
  //   paddingTop: 32,

  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',

  //   position: 'absolute',
  //   top: 0,
  //   zIndex: 50,

  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 6,
  //   elevation: 4,
  // },
  storeInfo: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 1,
  },
  storeName: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeIcon: {
    marginRight: 4,
  },
  storeText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  caretIcon: {
    marginLeft: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#1E3A8A",
  },
});
