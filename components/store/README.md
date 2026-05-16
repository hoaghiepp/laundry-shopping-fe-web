# Store Management Components

This directory contains reusable components for the store staff interface.

## Components

### StoreHeader
Header component with store selector, notifications, and print button.

**Props:**
- `storeName: string` - Name of the current store location
- `onStorePress: () => void` - Callback when store selector is pressed
- `onNotificationPress: () => void` - Callback for notification button
- `onPrintPress: () => void` - Callback for print button
- `hasNotification?: boolean` - Whether to show notification indicator

**Usage:**
```tsx
<StoreHeader
  storeName="Royal City Hub"
  onStorePress={() => console.log('Select store')}
  onNotificationPress={() => console.log('Notifications')}
  onPrintPress={() => console.log('Print')}
  hasNotification={true}
/>
```

### StoreBottomNav
Bottom navigation bar with 4 main tabs and center QR button.

**Props:**
- `activeTab: StoreTabType` - Currently active tab ('orders' | 'inventory' | 'logistics' | 'report')
- `onTabChange: (tab: StoreTabType) => void` - Callback when tab changes
- `onQRPress: () => void` - Callback for center QR button

**Usage:**
```tsx
<StoreBottomNav
  activeTab="orders"
  onTabChange={(tab) => setActiveTab(tab)}
  onQRPress={() => console.log('QR Scanner')}
/>
```

### OrderCard
Reusable card component for displaying order information.

**Props:**
- `order: OrderCardData` - Order data object
- `onPress: () => void` - Callback when card is pressed

**OrderCardData Interface:**
```typescript
interface OrderCardData {
  id: string;
  status: 'new' | 'processing' | 'factory' | 'pickup' | 'exception';
  customerName: string;
  customerPhone: string;
  membershipTier?: string;
  items: Array<{ icon: string; name: string; note?: string }>;
  specialBadge?: { text: string; color: string; bgColor: string; icon?: string };
  actionButton?: { text: string; onPress: () => void };
  note?: string;
  amount?: string;
}
```

### StepperProgress
Progress stepper for order processing workflow.

**Props:**
- `steps: Step[]` - Array of step objects

**Step Interface:**
```typescript
interface Step {
  label: string;
  isActive: boolean;
}
```

**Usage:**
```tsx
<StepperProgress
  steps={[
    { label: 'Tiếp nhận', isActive: true },
    { label: 'Xử lý', isActive: false },
    { label: 'Giao nhận', isActive: false },
  ]}
/>
```

### CustomerInfoCard
Card component for displaying customer information in order processing.

**Props:**
- `name: string` - Customer name
- `phone: string` - Customer phone number
- `address: string` - Customer address
- `membershipTier?: string` - Membership tier (e.g., 'Gold')
- `onCallPress: () => void` - Callback for call button

**Usage:**
```tsx
<CustomerInfoCard
  name="Nguyễn Văn A"
  phone="0912 345 678"
  address="Tòa R2, Royal City, 72 Nguyễn Trãi"
  membershipTier="Gold"
  onCallPress={() => Linking.openURL('tel:0912345678')}
/>
```

## Design Patterns

### Color Scheme
- **Primary**: Blue (#2563EB, #1E3A8A) - Main actions and active states
- **Status Colors**:
  - New Orders: Blue (#3B82F6)
  - Processing: Orange (#F59E0B)
  - Factory: Gray (#6B7280)
  - Pickup: Green (#10B981)
  - Exception: Red (#EF4444)

### Component Structure
All components follow these principles:
1. **Reusability**: Components accept props for all dynamic content
2. **Consistency**: Unified styling using StyleSheet
3. **Accessibility**: Proper touch targets (minimum 44x44)
4. **Feedback**: Visual feedback for all interactive elements (activeOpacity)

### Icons
Using FontAwesome5 for all icons. Common icons:
- `store` - Store/location
- `bell` - Notifications
- `print` - Print function
- `qrcode` - QR scanner
- `clipboard-list` - Orders
- `boxes` - Inventory
- `truck-moving` - Logistics
- `chart-pie` - Reports

## Related Screens
Screen components are located in `components/screens/store/`:
- `OrdersScreen` - Order management with tabs
- `InventoryScreen` - Warehouse inventory
- `LogisticsScreen` - Shipping coordination
- `ReportScreen` - Analytics and reports
- `ProcessDetailScreen` - Order processing workflow







