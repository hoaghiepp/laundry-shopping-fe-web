# Store Screen Components

This directory contains full-screen components for the store staff application.

## Screens

### OrdersScreen
Main orders management screen with multiple tabs for different order statuses.

**Features:**
- Search bar with QR scan option
- Tab navigation: New (3), Processing (2), Factory (8), Pickup (4)
- Order cards with status indicators
- Action buttons for each order

**Props:**
- `onOrderPress: (orderId: string, orderType?: string) => void` - Handle order selection
- `onQRScan: () => void` - Open QR scanner

**Tabs:**
1. **New Orders** - Recently received orders that need processing
2. **Processing** - Orders currently being prepared (weighing, tagging, picking)
3. **Factory** - Orders sent to factory for washing
4. **Pickup** - Orders ready for customer pickup

### InventoryScreen
Warehouse inventory management screen.

**Features:**
- Filter buttons (All, Low Stock)
- Inventory item cards showing:
  - Product name
  - SKU and location
  - Current quantity
  - Stock status indicator
  - Quick add stock button

**Mock Data:**
- Nước giặt Omo 3.6kg - 45 units (Good stock)
- Giấy thơm Bounce - 3 units (Low stock)

### LogisticsScreen
Shipping coordination screen for inbound and outbound logistics.

**Features:**
- Toggle between Outbound (Out) and Inbound (In) tabs
- **Outbound Tab:**
  - Summary of pending orders (count, weight, items)
  - Create shipment button
  - Shipment history
- **Inbound Tab:**
  - Receive clean items from factory
  - Scan barcode to receive
  - Receive history

**Use Cases:**
- Bundle orders to send to factory
- Track shipments in transit
- Receive cleaned items back to store

### ReportScreen
Analytics and reporting screen with daily metrics.

**Features:**
- Date selector
- Summary cards:
  - Total orders count
  - Total GMV (Gross Merchandise Value)
- Cash flow breakdown:
  - COD from orders
  - Retail counter sales
  - Total cash to submit
- Order status chart with progress bars

**Mock Data:**
- 25 total orders
- 5,200k GMV
- 1,500,000đ total cash collection

### ProcessDetailScreen
Detailed order processing workflow screen.

**Features:**
- Customer information card with call button
- Progress stepper (3 stages)
- Split shipment handling:
  - **Section 1**: Retail items (ship immediately)
  - **Section 2**: Service items (send to factory)
- Weight input and tag printing
- COD calculation
- Completion actions

**Props:**
- `orderId: string` - Order ID to display
- `onBack: () => void` - Navigation back handler

**Workflow:**
1. **Receive Order**: View customer info and items
2. **Process Retail**: Check items, calculate COD, call shipper
3. **Process Service**: Input actual weight, print tags
4. **Complete**: Mark ready for factory or pickup

## Navigation Flow

```
app/store-home.tsx (Main Container)
  ├─ OrdersScreen (Default)
  │   └─ ProcessDetailScreen (Full screen overlay)
  ├─ InventoryScreen
  ├─ LogisticsScreen
  └─ ReportScreen
```

## State Management

The main `store-home.tsx` manages:
- `activeTab`: Current bottom nav tab
- `activeScreen`: Current visible screen
- `selectedOrderId`: Order being processed

## Design Principles

### Split Shipment Handling
Orders can contain:
1. **Retail items** (Giao ngay) - Ship immediately to customer
2. **Service items** (Giao sau) - Send to factory, return later

Each section has independent:
- Status tracking
- COD calculation
- Action buttons

### Status Flow
```
New → Processing → Factory → Pickup → Completed
            ↓
       Exception (if issue detected)
```

### Color Coding
- **Blue**: New orders, primary actions
- **Orange**: Processing/In-progress
- **Purple**: Special handling (split shipment)
- **Green**: Ready for pickup, success states
- **Red**: Exceptions, alerts
- **Gray**: Factory/neutral status

## Integration Points

### Backend Integration
Each screen expects these API endpoints:
- `GET /api/store/orders?status={status}` - OrdersScreen
- `GET /api/store/inventory` - InventoryScreen
- `GET /api/store/logistics/shipments` - LogisticsScreen
- `GET /api/store/reports/daily?date={date}` - ReportScreen
- `GET /api/store/orders/{id}` - ProcessDetailScreen

### Actions
- Print tags: Integrate with thermal printer
- QR Scanner: Use `expo-barcode-scanner`
- Phone calls: Use `Linking.openURL('tel:...')`

## Testing Scenarios

1. **New Order Processing**
   - Scan QR to find order
   - View customer details
   - Process retail section
   - Process service section
   - Complete order

2. **Inventory Management**
   - Filter low stock items
   - Add stock for items
   - View all inventory

3. **Logistics**
   - Create outbound shipment
   - Track shipment status
   - Receive inbound items

4. **Daily Report**
   - Select date
   - Review metrics
   - Check cash collection

## Future Enhancements

- [ ] Batch processing for multiple orders
- [ ] Real-time order status updates
- [ ] Photo capture for exceptions
- [ ] Signature capture on pickup
- [ ] Integration with POS system
- [ ] Offline mode support







