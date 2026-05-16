import { compatAlert } from "@/lib/compatAlert";
import { logisticService } from "@/services/api/logisticService";
import { Order, orderService } from "@/services/api/orderService";
import { FontAwesome5 } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface GenericQRScannerScreenProps {
  hubId: string;
  mode?: 'order' | 'barcode' | 'both';
  title?: string;
  onBack: () => void;
  onOrderFound?: (order: Order) => void;
  onBarcodeFound?: (barcode: string, trackingItem?: any) => void;
  onTripFound?: (tripId: string, tripCode: string) => void;
}

export const GenericQRScannerScreen: React.FC<GenericQRScannerScreenProps> = ({
  hubId,
  mode = 'both',
  title = 'Quét / nhập mã đơn',
  onBack,
  onOrderFound,
  onBarcodeFound,
  onTripFound,
}) => {
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Request permission on mount
  useEffect(() => {
    (async () => {
      if (!permission || !permission.granted) {
        await requestPermission();
      }
    })();
  }, [permission, requestPermission]);

  // Animate scan line continuously
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 256],
  });

  const lookupByBarcode = async (barcode: string): Promise<boolean> => {
    if (mode === 'order') return false;
    
    try {
      const trackingResponse = await logisticService.searchTrackingItems(
        {
          barcode: barcode,
          current_store_id: hubId,
        },
        { page: 0, size: 1 }
      );
      
      if (trackingResponse?.data && trackingResponse.data.length > 0) {
        if (onBarcodeFound) {
          onBarcodeFound(barcode, trackingResponse.data[0]);
        }
        return true;
      }
    } catch (error) {
      console.error('Error searching for barcode:', error);
    }
    return false;
  };

  const lookupByOrderCode = async (code: string): Promise<boolean> => {
    if (mode === 'barcode') return false;
    
    try {
      const response = await orderService.searchStoreOrders(
        {
          code: code,
          hub_id: hubId,
          fetch_order_items: true,
        },
        { page: 0, size: 1 }
      );

      if (response.data && response.data.length > 0) {
        if (onOrderFound) {
          onOrderFound(response.data[0]);
        }
        return true;
      }
    } catch (error) {
      console.error("Error looking up order:", error);
    }
    return false;
  };

  const lookupByTripCode = async (code: string): Promise<boolean> => {
    if (!onTripFound) return false;
    
    try {
      // Search trips by trip_code - check both inbound and outbound
      const inboundResponse = await logisticService.searchTrips(
        {
          trip_code: code,
          destination_store_id: hubId,
        },
        { page: 0, size: 1 }
      );

      if (inboundResponse?.data && inboundResponse.data.length > 0) {
        const trip = inboundResponse.data[0];
        if (onTripFound) {
          onTripFound(trip.id, trip.trip_code);
        }
        return true;
      }

      // Try outbound trips (trips from this hub)
      const outboundResponse = await logisticService.searchTrips(
        {
          trip_code: code,
          source_store_id: hubId,
        },
        { page: 0, size: 1 }
      );

      if (outboundResponse?.data && outboundResponse.data.length > 0) {
        const trip = outboundResponse.data[0];
        if (onTripFound) {
          onTripFound(trip.id, trip.trip_code);
        }
        return true;
      }
    } catch (error) {
      console.error("Error looking up trip:", error);
    }
    return false;
  };

  const lookupCode = async (code?: string) => {
    const codeToSearch = code || inputCode.trim();
    if (!codeToSearch) {
      compatAlert("Lỗi", "Vui lòng nhập mã đơn hoặc quét QR code");
      return;
    }

    try {
      setLoading(true);
      
      // Try trip code first (if callback provided)
      if (onTripFound) {
        const foundAsTrip = await lookupByTripCode(codeToSearch);
        if (foundAsTrip) {
          setLoading(false);
          return;
        }
      }
      
      // Try barcode (if mode allows)
      if (mode === 'barcode' || mode === 'both') {
        const foundAsBarcode = await lookupByBarcode(codeToSearch);
        if (foundAsBarcode) {
          setLoading(false);
          return;
        }
      }
      
      // Try order code (if mode allows)
      if (mode === 'order' || mode === 'both') {
        const foundAsOrder = await lookupByOrderCode(codeToSearch);
        if (foundAsOrder) {
          setLoading(false);
          return;
        }
      }
      
      // Nothing found
      compatAlert("Không tìm thấy", `Không tìm thấy với mã: ${codeToSearch}`);
    } catch (error: any) {
      console.error("Error looking up code:", error);
      compatAlert(
        "Lỗi",
        error.message || "Không thể tìm kiếm. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeScanned = async (data: string) => {
    // Extract code from scanned data
    let extractedCode = data.trim();
    
    // If it's a URL, try to extract code from it
    if (extractedCode.includes("/")) {
      const parts = extractedCode.split("/");
      extractedCode = parts[parts.length - 1];
    }

    setInputCode(extractedCode);
    setScanned(true);
    
    await lookupCode(extractedCode);
    
    // Reset scanned state after 2 seconds to allow rescanning
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  // Render camera scanner area
  const renderCameraArea = () => {
    if (!permission) {
      return (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.cameraPlaceholderText}>Đang tải camera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.cameraPlaceholder}>
          <FontAwesome5 name="camera" size={48} color="#9CA3AF" />
          <Text style={styles.cameraPlaceholderText}>
            Cần quyền truy cập camera
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                compatAlert(
                  "Cần quyền camera",
                  "Cần quyền truy cập camera để quét QR code. Vui lòng cấp quyền trong cài đặt."
                );
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "code93"],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : (event: { data: string }) => {
                  setScanned(true);
                  handleQRCodeScanned(event.data);
                }
          }
        />

        {/* Scan overlay */}
        <View style={styles.scanOverlay} pointerEvents="none">
          <View style={styles.scanFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Animated scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslateY }] },
              ]}
            />
          </View>
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {scanned ? "Đã quét! Đang tìm..." : "Di chuyển camera vào mã QR"}
            </Text>
          </View>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>Quét lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.content}>
        {/* Camera area always visible at top */}
        <View style={styles.cameraWrapper}>
          {renderCameraArea()}
        </View>

        <Text style={styles.subtitle}>
          Quét QR trực tiếp hoặc tải ảnh QR, hoặc nhập mã thủ công
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Mã đơn / Barcode / QR data</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã đơn hoặc dán dữ liệu QR"
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            activeOpacity={0.8}
            onPress={handleUploadImage}
          >
            <FontAwesome5 name="image" size={16} color="#2563EB" />
            <Text style={styles.uploadButtonText}>Tải ảnh QR</Text>
          </TouchableOpacity>
        </View> */}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          activeOpacity={0.8}
          onPress={() => lookupCode()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome5 name="search" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>
                {mode === 'barcode' ? 'Tìm kiếm' : 'Mở đơn'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cameraWrapper: {
    height: 360,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  submitButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Camera view styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  cameraPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scanFrame: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 12,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#3B82F6",
  },
  cornerTopLeft: {
    top: -4,
    left: -4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: -4,
    right: -4,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: -4,
    left: -4,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: -4,
    right: -4,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#EF4444",
  },
  instructionContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 24,
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  rescanButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  rescanButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

