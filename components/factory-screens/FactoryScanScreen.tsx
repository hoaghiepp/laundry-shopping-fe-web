import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface FactoryScanScreenProps {
  onClose: () => void;
  onScanItem: () => void;
  onScanBag: () => void;
}

export const FactoryScanScreen: React.FC<FactoryScanScreenProps> = ({
  onClose,
  onScanItem,
  onScanBag,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, [scanLineAnim]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 256],
  });

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <FontAwesome5 name="camera" size={144} color="#1f2937" style={{ opacity: 1 }} />
      </View>

      {/* Scan Frame */}
      <View style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          {/* Corners */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          
          {/* Animated Scan Line */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineTranslateY }] },
            ]}
          />
        </View>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Di chuyển camera vào mã vạch</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onScanItem}
        >
          <View style={[styles.actionButtonCircle, { backgroundColor: '#2563eb' }]}>
            <FontAwesome5 name="tshirt" size={20} color="#fff" />
          </View>
          <Text style={styles.actionButtonLabel}>Xử lý Món</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onScanBag}
        >
          <View style={[styles.actionButtonCircle, { backgroundColor: '#059669' }]}>
            <FontAwesome5 name="truck-loading" size={20} color="#fff" />
          </View>
          <Text style={styles.actionButtonLabel}>Nhập/Xuất Bao</Text>
        </Pressable>
      </View>

      {/* Close Button */}
      <Pressable
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        onPress={onClose}
      >
        <FontAwesome5 name="times" size={20} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 50,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanFrame: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#3b82f6',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 24,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  actionButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
});
