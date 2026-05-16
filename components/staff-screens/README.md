# Staff Screens

This directory contains full-screen components for the staff/store management interface.

## Screens

### OrdersScreen
Main screen displaying orders with tabs for different statuses.

**Features:**
- Search bar with QR scanner button
- Order status tabs: New (3), Processing (2), Factory (8), Pickup (4)
- Order cards with customer info and items
- Action buttons for order processing

**Props:**
- `onOrderPress`: (orderId: string, type: string) => void - Callback when order is pressed
- `onQRScan`: () => void - Callback for QR scan button

### InventoryScreen
Screen for managing store inventory.

**Features:**
- Filter tabs: All / Low Stock
- Product cards with stock levels
- Add stock buttons
- SKU and location information

**Props:**
- `onAddStock`: (itemId: string) => void - Callback for add stock button

### LogisticsScreen
Screen for managing shipments and deliveries.

**Features:**
- In/Out tab switcher
- Outbound: Create shipment for factory
- Inbound: Receive shipment from factory
- Shipment history

**Props:**
- `onCreateShipment`: () => void - Callback for creating shipment
- `onReceiveShipment`: () => void - Callback for receiving shipment

### ProcessDetailScreen
Detailed order processing screen with customer info and workflow steps.

**Features:**
- Customer information card with call button
- Progress stepper (3 steps)
- Retail picking section (immediate delivery)
- Service processing section (delayed delivery)
- Weight input for laundry services
- Print tag functionality

**Props:**
- `orderId`: string - Order ID
- `customerName`: string - Customer name
- `customerPhone`: string - Customer phone (clickable to call)
- `customerTier`: string - Membership tier
- `customerAddress`: string - Delivery address
- `onBack`: () => void - Back button callback
- `onShipRetail`: () => void - Ship retail items callback
- `onCompleteService`: () => void - Complete service callback

### ReportScreen
Screen displaying daily reports and statistics.

**Features:**
- Date picker
- Total orders count
- Revenue (GMV) display
- Cash flow breakdown (COD + Counter sales)
- Order status chart with progress bars

**Props:**
- `onShowDetail`: (type: string) => void (optional) - Callback for showing detailed reports

## Usage Example

```tsx
import { OrdersScreen } from '@/components/staff-screens';

function StaffHome() {
  const [showDetail, setShowDetail] = useState(false);
  
  const handleOrderPress = (orderId: string) => {
    setShowDetail(true);
  };
  
  return (
    <View>
      {!showDetail ? (
        <OrdersScreen
          onOrderPress={handleOrderPress}
          onQRScan={() => console.log('Scan')}
        />
      ) : (
        <ProcessDetailScreen
          orderId="#DH-001"
          customerName="John Doe"
          customerPhone="0912345678"
          customerTier="Gold"
          customerAddress="123 Main St"
          onBack={() => setShowDetail(false)}
          onShipRetail={() => console.log('Ship')}
          onCompleteService={() => console.log('Complete')}
        />
      )}
    </View>
  );
}
```

## Order Status Flow

1. **New** → Order received, needs processing
2. **Processing** → Being prepared (printing tags, picking items)
3. **Factory** → Sent to factory or waiting at factory
4. **Pickup** → Ready for customer pickup/delivery

## Split Shipment Logic

Orders can have two shipments:
1. **Retail Items** (Immediate) - Products sold directly, shipped immediately
2. **Service Items** (Delayed) - Laundry services, shipped after completion

## Color Coding

- Blue: New orders, general actions
- Orange: In progress, printing
- Purple: Split shipment, picking
- Red: Issues, exceptions
- Green: Ready, completed
- Yellow: In transit, pending

