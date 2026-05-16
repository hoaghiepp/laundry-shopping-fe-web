import { paymentService } from '@/services/api/paymentService';
import { vietqrTestService } from '@/services/api/vietqrTestService';
import { cacheManager } from '@/services/cache';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

type RouteParams = {
  QrPayment: {
    url: string;
    content: string;
    amount: string;
  };
};

export const QrPaymentWebView = () => {
  const route = useRoute<RouteProp<RouteParams, 'QrPayment'>>();
  const navigation = useNavigation();
  const { url, content, amount } = route.params;
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const isPollingRef = useRef(false);
  const mountedRef = useRef(true);

  // Stop polling when screen loses focus (user navigates away)
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      
      return () => {
        // Screen is losing focus, stop polling and invalidate customer cache
        console.log('[QrPaymentWebView] Screen losing focus - stopping polling flow');
        mountedRef.current = false;
        isPollingRef.current = false;
        // Invalidate customer cache to refresh customer data (wallet balance, etc.)
        cacheManager.invalidate("customer:profile");
      };
    }, [])
  );

  useEffect(() => {
    if (!content) {
      return;
    }

    console.log('content', content);
    console.log('amount', amount);

    // Start long polling when component mounts
    const startPolling = async () => {
      if (isPollingRef.current || !mountedRef.current) {
        return;
      }
      isPollingRef.current = true;

      const pollTransaction = async () => {
        // Check if component is still mounted and polling should continue
        if (!mountedRef.current || !isPollingRef.current) {
          console.log('[QrPaymentWebView] Polling stopped - component unmounted or polling disabled');
          return;
        }

        try {
          // waitTransaction is a long polling endpoint that waits until transaction completes
          const response = await paymentService.waitTransaction(content);
          
          // Check if component is still mounted before updating state
          if (!mountedRef.current || !isPollingRef.current) {
            console.log('[QrPaymentWebView] Polling stopped during waitTransaction response - component unmounted or polling disabled');
            return;
          }
          
          // Check if transaction is successful - stop polling if status is true
          const isSuccess = 
            response?.data === true ||
            response?.status === true ||
            response?.data?.toastMessage === 'Success';
          
          if (isSuccess) {
            // Stop polling and show success dialog
            console.log('[QrPaymentWebView] Transaction completed successfully - stopping polling flow');
            isPollingRef.current = false;
            if (mountedRef.current) {
              setShowSuccessDialog(true);
            }
            return;
          } else {
            // Transaction not completed yet, continue waiting
            if (mountedRef.current && isPollingRef.current) {
              console.log('Transaction still pending, continuing to wait...');
              pollTransaction();
            }
            return;
          }
        } catch (error: any) {
          // Check if component is still mounted and polling should continue
          if (!mountedRef.current || !isPollingRef.current) {
            console.log('[QrPaymentWebView] Polling stopped during error handling - component unmounted or polling disabled');
            return;
          }

          // Check if it's a timeout response (meta.code === "40800")
          const responseData = error?.response?.data;
          const isTimeout = 
            responseData?.meta?.code === "40800" ||
            responseData?.meta?.message === "Request timeout" ||
            error?.response?.status === 408;
          
          if (isTimeout) {
            // Timeout is expected in long polling, check transaction status
            console.log('Long polling timeout, checking transaction status...');
            
            try {
              const statusResponse = await paymentService.getStatusTransaction(content);
              
              // Check if component is still mounted before updating state
              if (!mountedRef.current || !isPollingRef.current) {
                console.log('[QrPaymentWebView] Polling stopped during timeout status check - component unmounted or polling disabled');
                return;
              }
              
              const isSuccess = 
                statusResponse?.data === true ||
                statusResponse?.status === true;
              
              console.log('statusResponse', statusResponse);
              
              if (isSuccess) {
                // Transaction completed, stop polling
                console.log('[QrPaymentWebView] Transaction completed (after timeout check) - stopping polling flow');
                isPollingRef.current = false;
                if (mountedRef.current) {
                  setShowSuccessDialog(true);
                }
                return;
              } else {
                // Transaction not completed yet, continue waiting
                if (mountedRef.current && isPollingRef.current) {
                  console.log('Transaction still pending, continuing to wait...');
                  pollTransaction();
                }
                return;
              }
            } catch (statusError) {
              console.error('Failed to get transaction status:', statusError);
              // If status check fails, continue waiting only if still mounted
              if (mountedRef.current && isPollingRef.current) {
                pollTransaction();
              }
              return;
            }
          }
          
          // Check for network timeout errors
          const errorMessage = error?.message || '';
          const errorCode = error?.code || '';
          
          if (errorMessage.includes('timeout') || 
              errorMessage.includes('ECONNABORTED') ||
              errorCode === 'ECONNABORTED') {
            // Network timeout, check transaction status and continue if pending
            console.log('Network timeout, checking transaction status...');
            
            try {
              const statusResponse = await paymentService.getStatusTransaction(content);
              
              // Check if component is still mounted before updating state
              if (!mountedRef.current || !isPollingRef.current) {
                console.log('[QrPaymentWebView] Polling stopped during network timeout status check - component unmounted or polling disabled');
                return;
              }
              
              const isSuccess = 
                statusResponse?.data === true ||
                statusResponse?.status === true;
              
              if (isSuccess) {
                console.log('[QrPaymentWebView] Transaction completed (after network timeout check) - stopping polling flow');
                isPollingRef.current = false;
                if (mountedRef.current) {
                  setShowSuccessDialog(true);
                }
                return;
              } else {
                // Continue waiting only if still mounted
                if (mountedRef.current && isPollingRef.current) {
                  pollTransaction();
                }
                return;
              }
            } catch (statusError) {
              console.error('Failed to get transaction status:', statusError);
              // Continue waiting only if still mounted
              if (mountedRef.current && isPollingRef.current) {
                pollTransaction();
              }
              return;
            }
          }
          
          // For other errors (including 500), stop polling
          console.error('[QrPaymentWebView] Polling error - stopping polling flow:', error);
          isPollingRef.current = false;
          
          // Show error alert only if still mounted
          if (mountedRef.current) {
            Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái giao dịch');
          }
        }
      };

      // Since waitTransaction is long polling, we call it directly
      // It will wait until the transaction completes or times out
      pollTransaction();
    };

    startPolling();

    // Cleanup on unmount
    return () => {
      console.log('[QrPaymentWebView] Component unmounting - stopping polling flow');
      mountedRef.current = false;
      isPollingRef.current = false;
    };
  }, [content]);

  const handleSuccessDialogClose = () => {
    // Stop polling before navigating away
    console.log('[QrPaymentWebView] Success dialog closed - stopping polling flow');
    isPollingRef.current = false;
    mountedRef.current = false;
    setShowSuccessDialog(false);
    // Invalidate customer cache to refresh customer data (wallet balance, etc.)
    cacheManager.invalidate("customer:profile");
    // Navigate back and trigger refresh
    navigation.goBack();
    // The ProfileScreen will refresh when it comes into focus
  };

  const handleSimulateTransaction = async () => {
    if (!content) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin giao dịch');
      return;
    }

    setIsSimulating(true);
    try {
      await vietqrTestService.simulateTransaction(content, amount);
      Alert.alert('Thành công', 'Đã mô phỏng giao dịch thành công');
    } catch (error: any) {
      console.error('Error simulating transaction:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể mô phỏng giao dịch';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: url }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />
      
      {/* Floating Test Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleSimulateTransaction}
        disabled={isSimulating}
        activeOpacity={0.7}
      >
        <Text style={styles.floatingButtonText}>
          {isSimulating ? 'Đang xử lý...' : 'Test'}
        </Text>
      </TouchableOpacity>
      
      {/* Success Dialog */}
      <Modal
        visible={showSuccessDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessDialogClose}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.dialogTitle}>Thanh toán thành công!</Text>
            <Text style={styles.dialogMessage}>
              Giao dịch của bạn đã được xử lý thành công.
            </Text>
            <TouchableOpacity
              style={styles.dialogButton}
              onPress={handleSuccessDialogClose}
              activeOpacity={0.7}
            >
              <Text style={styles.dialogButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 32,
    color: '#059669',
    fontWeight: 'bold',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  dialogButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
  },
  dialogButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#10B981',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
