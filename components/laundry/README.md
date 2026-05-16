# Laundry Service Components

Reusable components for the laundry service selection screen, designed with flexibility and maintainability in mind.

## Components

### ServiceOptionCard
Displays a service option with icon, name, description, and price. Supports selection state and recommended badge.

**Props:**
- `option: ServiceOption` - Service option data
- `isSelected: boolean` - Whether this option is selected
- `onSelect: (id: string) => void` - Callback when option is selected

**Example:**
```tsx
<ServiceOptionCard
  option={{
    id: 'wash-dry',
    name: 'Giặt Sấy',
    description: 'Giặt và sấy khô',
    icon: 'tshirt',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    price: 25000,
    unit: 'kg',
    isRecommended: true,
  }}
  isSelected={true}
  onSelect={(id) => console.log(id)}
/>
```

### QuantitySelector
Allows users to select quantity/weight with increment/decrement buttons. Supports decimal values for weight-based services.

**Props:**
- `label: string` - Label text
- `value: number` - Current value
- `unit: string` - Unit of measurement (kg, item, etc.)
- `min?: number` - Minimum value (default: 0)
- `max?: number` - Maximum value (optional)
- `step?: number` - Step increment (default: 1)
- `onIncrease: () => void` - Callback when increasing
- `onDecrease: () => void` - Callback when decreasing
- `icon?: string` - Optional icon name
- `iconColor?: string` - Icon color
- `iconBg?: string` - Icon background color

**Example:**
```tsx
<QuantitySelector
  label="Số lượng (kg)"
  value={5}
  unit="kg"
  min={1}
  max={20}
  step={0.5}
  onIncrease={() => setQuantity(q => q + 0.5)}
  onDecrease={() => setQuantity(q => q - 0.5)}
  icon="weight"
  iconColor="#2563EB"
  iconBg="#EFF6FF"
/>
```

### ServiceFeatureList
Displays a list of service features with icons and descriptions.

**Props:**
- `features: ServiceFeature[]` - Array of feature objects
- `iconColor?: string` - Color for feature icons (default: '#2563EB')

**Example:**
```tsx
<ServiceFeatureList
  features={[
    {
      id: '1',
      icon: 'check-circle',
      title: 'Giặt sạch 100%',
      description: 'Sử dụng công nghệ giặt hiện đại',
    },
  ]}
  iconColor="#2563EB"
/>
```

### PriceSummaryCard
Displays price breakdown with subtotal, discounts, and total. Supports different price types (default, discount, total).

**Props:**
- `breakdown: PriceBreakdown[]` - Array of price breakdown items
- `total: number` - Total amount
- `estimatedDelivery?: string` - Optional delivery estimate text

**Example:**
```tsx
<PriceSummaryCard
  breakdown={[
    { label: 'Tạm tính', value: 100000, type: 'default' },
    { label: 'Giảm giá', value: 10000, type: 'discount' },
    { label: 'Cần thanh toán', value: 90000, type: 'total' },
  ]}
  total={90000}
  estimatedDelivery="2-3 ngày làm việc"
/>
```

### AddToCartButton
Reusable button component for adding items to cart with loading and disabled states.

**Props:**
- `onPress: () => void` - Callback when pressed
- `disabled?: boolean` - Whether button is disabled
- `loading?: boolean` - Whether button is in loading state
- `text?: string` - Button text (default: 'Thêm vào giỏ hàng')
- `showIcon?: boolean` - Whether to show cart icon (default: true)
- `variant?: 'primary' | 'secondary'` - Button style variant

**Example:**
```tsx
<AddToCartButton
  onPress={handleAddToCart}
  text="Thêm vào giỏ hàng"
  variant="primary"
  loading={isLoading}
/>
```

## Main Screen

### LaundryServiceScreen
Complete laundry service selection screen that combines all components.

**Props:**
- `serviceId?: string` - Service identifier
- `serviceName?: string` - Service name to display
- `onBack?: () => void` - Callback when back button is pressed
- `onAddToCart?: (order: LaundryOrder) => void` - Callback when adding to cart

**Example:**
```tsx
<LaundryServiceScreen
  serviceId="wash-dry"
  serviceName="Giặt Sấy"
  onBack={() => navigation.goBack()}
  onAddToCart={(order) => {
    // Handle adding to cart
    console.log(order);
  }}
/>
```

## Usage in Home Screen

To integrate with the home screen, update the service button handler:

```tsx
// In home.tsx
import { LaundryServiceScreen } from '@/components/screens';

// In the service button handler:
onServicePress={(id) => {
  setActiveScreen(ScreenType.LAUNDRY_SERVICE);
  setSelectedServiceId(id);
}}

// Add new screen type:
enum ScreenType {
  // ... existing types
  LAUNDRY_SERVICE = 'laundry-service',
}

// Render the screen:
if (activeScreen === ScreenType.LAUNDRY_SERVICE) {
  return (
    <LaundryServiceScreen
      serviceId={selectedServiceId}
      onBack={() => setActiveScreen(ScreenType.HOME)}
      onAddToCart={(order) => {
        // Add to cart logic
        setActiveScreen(ScreenType.CART);
      }}
    />
  );
}
```

## Design Principles

- **Reusability**: All components are designed to be reused across different screens
- **Flexibility**: Props allow customization of colors, icons, and behavior
- **Consistency**: Follows app's design system with consistent colors and spacing
- **Maintainability**: Clear component structure with TypeScript types
- **Accessibility**: Proper touch targets and visual feedback

## Theme Colors

Components use the app's standard color palette:
- Primary: `#2563EB` (Blue)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Orange)
- Text: `#1F2937` (Dark Gray)
- Background: `#F9FAFB` (Light Gray)
- White: `#FFFFFF`

