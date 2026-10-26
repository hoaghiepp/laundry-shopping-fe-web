import { ItemPassportScreen } from "@/components/screens/shared/ItemPassportScreen";
import {
  conditionLabel,
  getItemStatusDisplay,
} from "@/components/store/logistics/logisticsUtils";
import { LogisticTripStatus } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorCode, extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService, TripReceiveScan } from "@/services/api/logisticService";
import { FontAwesome5 } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ReceiveItemsScreenProps {
  tripId: string;
  tripCode: string;
  sourceStoreName: string;
  hubId: string;
  hubType: "factory" | "store";
  /** Header top inset; web embeds this screen under the fixed nav bar. 32 + 16 = old 48. */
  topInset?: number;
  onBack: () => void;
  onComplete: () => void;
}

export const ReceiveItemsScreen: React.FC<ReceiveItemsScreenProps> = ({
  tripId,
  tripCode,
  sourceStoreName,
  hubType,
  topInset = 32,
  onBack,
  onComplete,
}) => {
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [barcode, setBarcode] = useState("");
  const [damaged, setDamaged] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<{ barcode: string; reason: string }[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [passportBarcode, setPassportBarcode] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const title = hubType === "factory" ? "Nhận hàng từ tiệm" : "Nhận hàng từ xưởng";

  const loadManifest = async () => {
    const response = await logisticService.getManifest(tripId);
    setManifest(response?.data);
    return response?.data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await logisticService.getManifest(tripId);
        if (!cancelled) setManifest(response?.data);
      } catch (error) {
        if (!cancelled) {
          compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tải manifest chuyến hàng"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const counts = manifest?.counts || { expected: 0, received: 0, missing: 0, pending: 0, damaged: 0 };
  const lines: any[] = manifest?.lines || [];
  const pending = lines.filter((line) => line.line_status === "SEALED");
  const progressBase = counts.expected || lines.length || 1;
  const done = (counts.received || 0) + (counts.missing || 0);
  const progress = Math.min(100, (done / progressBase) * 100);
  const tripStatus = manifest?.trip?.status;

  const sendScans = async (scans: TripReceiveScan[], code?: string) => {
    if (busy || scans.length === 0) return;
    setBusy(true);
    setShowScanner(false);
    try {
      const response = await logisticService.receiveTrip(tripId, scans);
      const result = response?.data;
      const rejectedRows = result?.rejected || [];
      setRejected(rejectedRows);
      if (rejectedRows.length > 0) {
        const detail = rejectedRows.map((row: any) => `${row.barcode}: ${row.reason}`).join("\n");
        compatAlert("Không nhận được", detail);
      } else if (code && (result?.already_received || []).includes(code)) {
        compatAlert("Đã nhận", `${code} đã được quét trước đó.`);
      }
      setBarcode("");
      setNote("");
      setDamaged(false);
      await loadManifest();
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể quét nhận hàng"));
    } finally {
      setBusy(false);
    }
  };

  const submitScan = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    return sendScans(
      [
        {
          barcode: code,
          condition: damaged ? "DAMAGED" : "NORMAL",
          note: note.trim() || undefined,
        },
      ],
      code,
    );
  };

  /** Mark a manifest line received without a camera (web / keyboard wedge scanner). */
  const receiveLine = (lineBarcode: string) =>
    sendScans(
      [
        {
          barcode: lineBarcode,
          condition: damaged ? "DAMAGED" : "NORMAL",
          note: damaged ? note.trim() || undefined : undefined,
        },
      ],
      lineBarcode,
    );

  const receiveAllPending = () => {
    const scans: TripReceiveScan[] = pending
      .filter((line) => line.barcode)
      .map((line) => ({ barcode: line.barcode, condition: "NORMAL" }));
    if (scans.length === 0) return;
    compatAlert(
      "Nhận tất cả",
      `Đánh dấu ${scans.length} món còn lại là đã nhận (bình thường)?`,
      [
        { text: "Quay lại", style: "cancel" },
        { text: "Nhận tất cả", onPress: () => void sendScans(scans) },
      ],
    );
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        compatAlert("Cần quyền camera", "Nhập barcode bằng tay nếu không dùng được camera.");
        return;
      }
    }
    setShowScanner(true);
  };

  const finish = (missingBarcodes: string[]) => {
    const run = async () => {
      setBusy(true);
      try {
        await logisticService.completeTrip(tripId, {
          missing_barcodes: missingBarcodes.length > 0 ? missingBarcodes : undefined,
        });
        onComplete();
      } catch (error) {
        const code = extractApiErrorCode(error);
        compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể hoàn tất chuyến"));
        if (code === "400051") {
          try {
            await loadManifest();
          } catch {
            // The alert already explains the remaining items.
          }
        }
      } finally {
        setBusy(false);
      }
    };

    if (missingBarcodes.length > 0) {
      compatAlert(
        "Còn món chưa nhận",
        `${missingBarcodes.length} món sẽ được đánh dấu thất lạc và tạo sự cố mất đồ.`,
        [
          { text: "Quay lại", style: "cancel" },
          { text: "Đánh dấu thất lạc", style: "destructive", onPress: () => void run() },
        ]
      );
      return;
    }
    void run();
  };

  const markArrived = async () => {
    setBusy(true);
    try {
      await logisticService.arriveTrip(tripId);
      await loadManifest();
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể xác nhận đến nơi"));
    } finally {
      setBusy(false);
    }
  };

  if (passportBarcode) {
    return (
      <ItemPassportScreen
        initialBarcode={passportBarcode}
        onBack={() => setPassportBarcode(null)}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {tripCode} · {sourceStoreName}
          </Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>
          Đã nhận {counts.received}/{counts.expected}
          {counts.pending ? ` · chờ ${counts.pending}` : ""}
          {counts.missing ? ` · thiếu ${counts.missing}` : ""}
          {counts.damaged ? ` · hỏng ${counts.damaged}` : ""}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.scanBox}>
        <TextInput
          style={styles.input}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Barcode"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          onSubmitEditing={() => submitScan(barcode)}
        />
        <View style={styles.damageRow}>
          <Text style={styles.damageLabel}>Hư hỏng khi nhận</Text>
          <Switch value={damaged} onValueChange={setDamaged} />
        </View>
        {damaged ? (
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú hư hỏng"
            placeholderTextColor="#9CA3AF"
          />
        ) : null}
        <View style={styles.scanActions}>
          {Platform.OS !== "web" ? (
            <TouchableOpacity style={styles.secondary} onPress={openScanner} disabled={busy}>
              <Text style={styles.secondaryText}>Camera</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primary} onPress={() => submitScan(barcode)} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? "Đang gửi" : "Nhận món"}</Text>
          </TouchableOpacity>
        </View>
        {Platform.OS === "web" ? (
          <Text style={styles.hint}>
            Camera không dùng được trên web: nhập mã bằng máy quét cầm tay hoặc chọn món bên dưới.
          </Text>
        ) : null}
        {tripStatus === LogisticTripStatus.IN_TRANSIT ? (
          <TouchableOpacity onPress={markArrived} disabled={busy}>
            <Text style={styles.link}>Xác nhận đến nơi trước khi quét</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {rejected.length > 0 ? (
        <View style={styles.rejectBox}>
          {rejected.map((row) => (
            <Text key={row.barcode} style={styles.rejectText}>
              {row.barcode}: {row.reason}
            </Text>
          ))}
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Chờ nhận ({pending.length})</Text>
          {pending.length > 0 ? (
            <TouchableOpacity onPress={receiveAllPending} disabled={busy}>
              <Text style={styles.sectionAction}>Nhận tất cả</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {pending.map((line) => (
          <LineCard
            key={line.line_id}
            line={line}
            busy={busy}
            onReceive={line.barcode ? () => receiveLine(line.barcode) : undefined}
            onPassport={setPassportBarcode}
          />
        ))}
        <Text style={styles.section}>Đã xử lý</Text>
        {lines
          .filter((line) => line.line_status !== "SEALED" && line.line_status !== "REMOVED")
          .map((line) => (
            <LineCard key={line.line_id} line={line} onPassport={setPassportBarcode} />
          ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primary}
          disabled={busy}
          onPress={() => finish(pending.map((line) => line.barcode).filter(Boolean))}
        >
          <Text style={styles.primaryText}>
            {pending.length > 0 ? "Hoàn tất và đánh dấu phần còn lại là thất lạc" : "Hoàn tất chuyến"}
          </Text>
        </TouchableOpacity>
      </View>

      {showScanner ? (
        <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => submitScan(data)}
          />
          <TouchableOpacity style={styles.closeScan} onPress={() => setShowScanner(false)}>
            <Text style={styles.primaryText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

function LineCard({
  line,
  busy,
  onReceive,
  onPassport,
}: {
  line: any;
  busy?: boolean;
  onReceive?: () => void;
  onPassport: (barcode: string) => void;
}) {
  const status = getItemStatusDisplay(line.line_status);
  return (
    <View style={styles.line}>
      <TouchableOpacity
        style={styles.lineMain}
        onPress={() => line.barcode && onPassport(line.barcode)}
        disabled={!line.barcode}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.lineTitle}>{line.barcode || line.tracking_id}</Text>
          <Text style={styles.lineMeta}>
            {line.order_code || "—"}
            {line.container_code ? ` · bao ${line.container_code}` : ""}
          </Text>
          {line.received_condition && line.received_condition !== "NORMAL" ? (
            <Text style={styles.lineMeta}>{conditionLabel(line.received_condition)}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={{ color: status.color, fontSize: 12, fontWeight: "700" }}>{status.text}</Text>
        </View>
      </TouchableOpacity>
      {onReceive ? (
        <TouchableOpacity
          style={styles.lineReceive}
          onPress={onReceive}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Nhận món ${line.barcode}`}
        >
          <FontAwesome5 name="check" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subtitle: { color: "#6B7280", fontSize: 13 },
  progressCard: { margin: 16, marginBottom: 0, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12 },
  progressTitle: { color: "#111827", fontWeight: "600", marginBottom: 8 },
  track: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, backgroundColor: "#2563EB" },
  scanBox: { margin: 16, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  damageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  damageLabel: { color: "#374151", fontWeight: "600" },
  scanActions: { flexDirection: "row", gap: 8 },
  primary: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", textAlign: "center" },
  secondary: {
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#2563EB", fontWeight: "700" },
  hint: { color: "#6B7280", fontSize: 12 },
  link: { color: "#2563EB", fontWeight: "600" },
  rejectBox: { marginHorizontal: 16, backgroundColor: "#FEF2F2", borderRadius: 8, padding: 10 },
  rejectText: { color: "#B91C1C", fontSize: 13 },
  list: { flex: 1 },
  section: { fontWeight: "700", color: "#111827", marginBottom: 8, marginTop: 8 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionAction: { color: "#2563EB", fontWeight: "700", marginTop: 8 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  lineMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  lineReceive: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  lineTitle: { fontWeight: "700", color: "#111827" },
  lineMeta: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  scanner: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 20 },
  closeScan: {
    position: "absolute",
    top: 48,
    right: 16,
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 12,
  },
});
