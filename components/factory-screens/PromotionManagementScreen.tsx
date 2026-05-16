import { DiscountType } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { CreatePromotionRequest, promotionService } from '@/services/api/promotionService';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PromotionManagementScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const PromotionManagementScreen: React.FC<PromotionManagementScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxDiscountValue, setMaxDiscountValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date): string => {
    // Set time to midnight UTC and return ISO 8601 format
    const dateAtMidnight = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    return dateAtMidnight.toISOString();
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateChange = (
    event: any,
    date: Date | undefined,
    type: 'start' | 'end'
  ) => {
    if (Platform.OS === 'android') {
      if (type === 'start') {
        setShowStartDatePicker(false);
      } else {
        setShowEndDatePicker(false);
      }
      if (event.type === 'dismissed') {
        return;
      }
    }

    if (date) {
      if (type === 'start') {
        setStartDate(date);
        if (Platform.OS === 'ios') {
          setShowStartDatePicker(false);
        }
      } else {
        setEndDate(date);
        if (Platform.OS === 'ios') {
          setShowEndDatePicker(false);
        }
      }
    }
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setDiscountType(DiscountType.PERCENTAGE);
    setDiscountValue('');
    setMinOrderValue('');
    setMaxDiscountValue('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!code.trim()) {
      compatAlert('Lỗi', 'Vui lòng nhập mã khuyến mãi');
      return;
    }
    if (!name.trim()) {
      compatAlert('Lỗi', 'Vui lòng nhập tên khuyến mãi');
      return;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      compatAlert('Lỗi', 'Vui lòng nhập giá trị giảm giá hợp lệ');
      return;
    }
    if (!minOrderValue || parseFloat(minOrderValue) < 0) {
      compatAlert('Lỗi', 'Vui lòng nhập giá trị đơn hàng tối thiểu');
      return;
    }
    if (discountType === DiscountType.PERCENTAGE && (!maxDiscountValue || parseFloat(maxDiscountValue) <= 0)) {
      compatAlert('Lỗi', 'Vui lòng nhập giá trị giảm giá tối đa');
      return;
    }
    if (endDate <= startDate) {
      compatAlert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setLoading(true);
    try {
      const promotionData: CreatePromotionRequest = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_value: parseFloat(minOrderValue),
        max_discount_value: discountType === DiscountType.PERCENTAGE ? parseFloat(maxDiscountValue) : parseFloat(discountValue),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      };
      console.log(promotionData);
      await promotionService.createPromotions(promotionData);
      
      // Reset form
      resetForm();
      
      compatAlert('Thành công', 'Đã tạo khuyến mãi thành công', [
        {
          text: 'OK',
          onPress: () => {
            if (onSuccess) {
              onSuccess();
            }
            onBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Failed to create promotion:', error);
      compatAlert(
        'Lỗi',
        error?.response?.data?.message || 'Không thể tạo khuyến mãi. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} pointerEvents="none">Tạo khuyến mãi</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Code */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Mã khuyến mãi <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="VD: SUMMER2024"
            value={code}
            onChangeText={setCode}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Tên khuyến mãi <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Khuyến mãi mùa hè"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả chi tiết về khuyến mãi"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Discount Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Loại giảm giá <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                discountType === DiscountType.PERCENTAGE && styles.radioButtonSelected,
              ]}
              onPress={() => setDiscountType(DiscountType.PERCENTAGE)}
            >
              <View style={styles.radioCircle}>
                {discountType === DiscountType.PERCENTAGE && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text
                style={[
                  styles.radioLabel,
                  discountType === DiscountType.PERCENTAGE && styles.radioLabelSelected,
                ]}
              >
                Phần trăm (%)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                discountType === DiscountType.FIXED && styles.radioButtonSelected,
              ]}
              onPress={() => setDiscountType(DiscountType.FIXED)}
            >
              <View style={styles.radioCircle}>
                {discountType === DiscountType.FIXED && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text
                style={[
                  styles.radioLabel,
                  discountType === DiscountType.FIXED && styles.radioLabelSelected,
                ]}
              >
                Số tiền cố định (VNĐ)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Discount Value */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Giá trị giảm giá <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={discountType === DiscountType.PERCENTAGE ? 'VD: 20' : 'VD: 50000'}
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.hint}>
            {discountType === DiscountType.PERCENTAGE
              ? 'Nhập phần trăm giảm giá (ví dụ: 20 cho 20%)'
              : 'Nhập số tiền giảm giá (VNĐ)'}
          </Text>
        </View>

        {/* Max Discount Value (only for percentage) */}
        {discountType === DiscountType.PERCENTAGE && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Giảm giá tối đa (VNĐ) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 100000"
              value={maxDiscountValue}
              onChangeText={setMaxDiscountValue}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.hint}>
              Số tiền giảm giá tối đa có thể áp dụng
            </Text>
          </View>
        )}

        {/* Min Order Value */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Đơn hàng tối thiểu (VNĐ) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="VD: 100000"
            value={minOrderValue}
            onChangeText={setMinOrderValue}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.hint}>
            Giá trị đơn hàng tối thiểu để áp dụng khuyến mãi
          </Text>
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Ngày bắt đầu <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDateDisplay(startDate)}</Text>
            <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, 'start')}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Ngày kết thúc <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDateDisplay(endDate)}</Text>
            <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, 'end')}
              minimumDate={startDate}
            />
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome5 name="check" size={16} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Tạo khuyến mãi</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 15,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  radioButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  radioLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  radioLabelSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

