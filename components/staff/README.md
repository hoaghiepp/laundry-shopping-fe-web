# Staff Components

This directory contains reusable UI components for the staff/store management interface.

## Components

### StaffHeader
Header component displaying store name, notifications, and print button.

**Props:**
- `storeName`: string - Name of the store/location
- `onStorePress`: () => void - Callback for store name press
- `onNotificationPress`: () => void - Callback for notification bell
- `onPrintPress`: () => void - Callback for print button
- `hasNotification`: boolean (optional) - Show notification badge

### StaffBottomNav
Bottom navigation bar with 5 tabs (Orders, Inventory, QR Scanner, Logistics, Report).

**Props:**
- `activeTab`: StaffTabType - Current active tab ('orders' | 'inventory' | 'logistics' | 'report')
- `onTabChange`: (tab: StaffTabType) => void - Callback for tab change
- `onQRScan`: () => void (optional) - Callback for center QR button

### OrderCard
Card component for displaying order information with customer details and items.

**Props:**
- `orderId`: string - Order ID (e.g., "#DH-2310-001")
- `customerName`: string - Customer full name
- `customerPhone`: string - Customer phone number
- `customerTier`: string (optional) - Membership tier (e.g., "Gold")
- `items`: OrderItem[] - Array of order items
- `status`: object - Status badge configuration
- `borderColor`: string - Tailwind border color class
- `badge`: object (optional) - Additional badge configuration
- `actionButton`: object (optional) - Action button configuration
- `footerNote`: string (optional) - Footer note text
- `onPress`: () => void (optional) - Callback for card press

### Stepper
Progress stepper component showing workflow steps.

**Props:**
- `steps`: Step[] - Array of step objects with label and active status

### InventoryItem
Card component for displaying inventory item details.

**Props:**
- `name`: string - Product name
- `sku`: string - Product SKU code
- `location`: string - Storage location
- `quantity`: number - Current stock quantity
- `unit`: string - Unit of measurement
- `icon`: string - FontAwesome icon name
- `iconColor`: string - Icon color
- `iconBg`: string - Icon background Tailwind class
- `isLowStock`: boolean (optional) - Low stock indicator
- `onAddStock`: () => void - Callback for add stock button

## Usage Example

```tsx
import { StaffHeader, StaffBottomNav, OrderCard } from '@/components/staff';

function MyScreen() {
  return (
    <View>
      <StaffHeader
        storeName="Royal City Hub"
        onStorePress={() => console.log('Store pressed')}
        onNotificationPress={() => console.log('Notifications')}
        onPrintPress={() => console.log('Print')}
        hasNotification={true}
      />
      
      <OrderCard
        orderId="#DH-001"
        customerName="John Doe"
        customerPhone="0912345678"
        items={[
          { icon: 'tshirt', text: 'Laundry service', iconColor: '#3B82F6' }
        ]}
        status={{ text: 'New', bgColor: 'bg-blue-100', textColor: 'text-blue-700' }}
        borderColor="border-blue-500"
      />
      
      <StaffBottomNav
        activeTab="orders"
        onTabChange={(tab) => setActiveTab(tab)}
        onQRScan={() => console.log('Scan QR')}
      />
    </View>
  );
}
```

## Color Scheme

The staff interface uses a blue-gray color scheme:
- Primary: Blue-800 (#1E40AF) for header
- Secondary: Blue-600 (#2563EB) for buttons
- Accent: Various colors for order statuses (blue, orange, red, green, purple)
- Background: Gray-50 (#F9FAFB)

## Icons

Uses FontAwesome 5 icons:
- Orders: clipboard-list
- Inventory: boxes
- Logistics: truck-moving
- Report: chart-pie
- QR Scanner: qrcode

