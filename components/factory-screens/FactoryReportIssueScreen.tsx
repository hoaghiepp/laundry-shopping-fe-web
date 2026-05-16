import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FactoryReportIssueScreenProps {
  onClose: () => void;
  onSubmit: (errorType: string) => void;
}

export const FactoryReportIssueScreen: React.FC<FactoryReportIssueScreenProps> = ({
  onClose,
  onSubmit,
}) => {
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const errors = [
    { id: 'tear', icon: 'cut', color: '#ef4444', label: 'Rách' },
    { id: 'stain', icon: 'tint', color: '#a855f7', label: 'Lem màu' },
    { id: 'burn', icon: 'fire', color: '#f97316', label: 'Cháy' },
  ];

  const handleTakePhoto = () => {
    // Photo functionality to be implemented
  };

  const handleSubmit = () => {
    if (selectedError) {
      onSubmit(selectedError);
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraView}>
        <View style={styles.cameraPlaceholder}>
          <FontAwesome5 name="tshirt" size={144} color="#374151" style={{ opacity: 0.5 }} />
        </View>
        
        <View style={styles.cameraControls}>
          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
            ]}
            onPress={handleTakePhoto}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          onPress={onClose}
        >
          <FontAwesome5 name="times" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Error Selection */}
      <View style={styles.errorSelection}>
        <Text style={styles.title}>Loại lỗi</Text>
        <View style={styles.errorGrid}>
          {errors.map((error) => (
            <Pressable
              key={error.id}
              style={({ pressed }) => [
                styles.errorOption,
                selectedError === error.id && styles.errorOptionSelected,
                pressed && styles.errorOptionPressed,
              ]}
              onPress={() => setSelectedError(error.id)}
            >
              <FontAwesome5 name={error.icon} size={20} color={error.color} />
              <Text style={styles.errorLabel}>{error.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
        </Pressable>
      </View>
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
    zIndex: 60,
  },
  cameraView: {
    height: '50%',
    backgroundColor: '#1f2937',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  errorSelection: {
    height: '50%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
    position: 'relative',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  errorOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  errorOptionSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorOptionPressed: {
    transform: [{ scale: 0.95 }],
  },
  errorLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  submitButton: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
