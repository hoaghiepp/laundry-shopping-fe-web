import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ImagePickerSectionProps {
  images: ImagePicker.ImagePickerAsset[];
  onImagesChange: (images: ImagePicker.ImagePickerAsset[]) => void;
  maxImages?: number;
}

export const ImagePickerSection: React.FC<ImagePickerSectionProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    return {
      camera: cameraPermission.granted,
      media: mediaPermission.granted,
    };
  };

  const handleTakePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Giới hạn ảnh', `Chỉ có thể thêm tối đa ${maxImages} ảnh`);
      return;
    }

    const permissions = await requestPermissions();

    if (!permissions.camera) {
      Alert.alert(
        'Cần quyền truy cập',
        'Cần quyền truy cập camera để chụp ảnh'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImagesChange([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const handlePickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Giới hạn ảnh', `Chỉ có thể thêm tối đa ${maxImages} ảnh`);
      return;
    }

    const permissions = await requestPermissions();

    if (!permissions.media) {
      Alert.alert(
        'Cần quyền truy cập',
        'Cần quyền truy cập thư viện ảnh để chọn ảnh'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const remainingSlots = maxImages - images.length;
        const newImages = result.assets.slice(0, remainingSlots);
        onImagesChange([...images, ...newImages]);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Giới hạn ảnh',
            `Chỉ thêm được ${remainingSlots} ảnh. Đã bỏ qua ${
              result.assets.length - remainingSlots
            } ảnh.`
          );
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc muốn xóa ảnh này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          onImagesChange(images.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hình ảnh minh chứng</Text>
        <Text style={styles.subtitle}>
          {images.length}/{maxImages} ảnh
        </Text>
      </View>

      {/* Image Grid */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
          contentContainerStyle={styles.imageScrollContent}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveImage(index)}
              >
                <FontAwesome5 name="times" size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action Buttons */}
      {images.length < maxImages && (
        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.cameraButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleTakePhoto}
          >
            <FontAwesome5 name="camera" size={24} color="#2563EB" />
            <Text style={styles.actionButtonText}>Chụp ảnh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.galleryButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handlePickImage}
          >
            <FontAwesome5 name="images" size={24} color="#059669" />
            <Text style={styles.actionButtonText}>Chọn từ thư viện</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  imageScroll: {
    marginBottom: 16,
  },
  imageScrollContent: {
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cameraButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  galleryButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
});

