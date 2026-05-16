# Laundry Pro - Home Components

Complete React Native implementation of the laundry app from `pane_mocked.html`

## Component Architecture

### Base Layout Components
- **StatusBar.tsx** - Custom status bar with time and icons
- **BottomNav.tsx** - Bottom navigation with 4 tabs and badge support
- **HomeHeader.tsx** - Blue header with user info, location, store finder
- **WalletCard.tsx** - Floating wallet card with balance and membership

### Home Screen Components
- **PromotionBanner.tsx** - Horizontal scrolling gradient promotion cards
- **ProductCard.tsx** - Product card with image, price, discount badge
- **ServiceButton.tsx** - Service icon button with custom colors
- **CurrentOrderCard.tsx** - Current order status card
- **BusinessFooter.tsx** - Company info and social links

### Screen Components (components/screens/)
- **AllOffersScreen.tsx** - List of all promotional offers
- **AllServicesScreen.tsx** - Grid of all laundry services
- **AllProductsScreen.tsx** - (To create) Product grid
- **StoreLocatorScreen.tsx** - (To create) Store list with map
- **ProfileScreen.tsx** - (To create) User profile and settings
- **CartScreen.tsx** - (To create) Shopping cart with smart logic
- **AddressListScreen.tsx** - (To create) Address selection
- **OrderListScreen.tsx** - (To create) Order history
- **OrderDetailScreen.tsx** - (To create) Order tracking
- **WalletScreen.tsx** - (To create) Wallet and packages

## Color Palette

```typescript
// Primary Colors
Blue600: '#2563EB'
Blue500: '#3B82F6'
Blue50: '#EFF6FF'

// Success/Green
Green600: '#059669'
Green50: '#ECFDF5'

// Warning/Orange
Orange600: '#EA580C'
Orange50: '#FFF7ED'

// Purple
Purple600: '#9333EA'
Purple50: '#F3E8FF'

// Backgrounds
Gray50: '#F9FAFB'
Gray100: '#F3F4F6'
White: '#FFFFFF'

// Text
Gray800: '#1F2937'
Gray600: '#4B5563'
Gray400: '#9CA3AF'
```

## Usage Pattern

```typescript
import { CustomStatusBar } from '@/components/home/StatusBar';
import { BottomNav } from '@/components/home/BottomNav';
import { HomeHeader } from '@/components/home/HomeHeader';
import { WalletCard } from '@/components/home/WalletCard';

// In your screen:
<View>
  <CustomStatusBar />
  <HomeHeader
    userName="Nguyễn Văn A"
    location="Royal City, HN"
    onProfilePress={() => {}}
    onStoreFinderPress={() => {}}
    onNotificationPress={() => {}}
  />
  <WalletCard
    balance="550.000đ"
    membershipTier="Gold Member"
    packageRemaining={2}
    onTopUpPress={() => {}}
  />
  {/* More content */}
  <BottomNav activeTab="home" onTabChange={setTab} />
</View>
```

## Features Implemented

✅ Custom status bar with real-time clock
✅ Blue header with user greeting and location
✅ Floating wallet card with negative margin
✅ Gradient promotion banners (using expo-linear-gradient)
✅ Horizontal scrolling product cards
✅ Service button grid with custom colors
✅ Current order status card
✅ Business footer with contact info
✅ Bottom navigation with badges
✅ All Offers screen
✅ All Services screen (9 services in grid)

## Remaining Screens To Implement

Due to scope, the following screens need to be created:

1. **AllProductsScreen** - 2-column product grid
2. **StoreLocatorScreen** - Store list with distance and status
3. **ProfileScreen** - User profile with avatar and addresses
4. **CartScreen** - Unified cart with service + products
5. **AddressListScreen** - Address selection with radio buttons
6. **AddressAddScreen** - Add new address form
7. **OrderListScreen** - Order history with tabs
8. **OrderDetailScreen** - Order tracking timeline
9. **OrderSuccessScreen** - Success animation
10. **WalletScreen** - Wallet balance and active packages
11. **ProductDetailModal** - Bottom sheet product detail

## Integration Example

Main home screen would integrate all screens with state management:

```typescript
const [activeScreen, setActiveScreen] = useState('home');
const [activeTab, setActiveTab] = useState('home');

const renderScreen = () => {
  switch (activeScreen) {
    case 'home': return <HomeScreen />;
    case 'all-offers': return <AllOffersScreen onBack={() => setActiveScreen('home')} />;
    case 'all-services': return <AllServicesScreen onBack={() => setActiveScreen('home')} />;
    // ... more screens
  }
};

return (
  <View style={{flex: 1}}>
    {renderScreen()}
    <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
  </View>
);
```

## Dependencies

- `@expo/vector-icons` - FontAwesome5 icons
- `expo-linear-gradient` - Gradient backgrounds
- `react-native` - Core components

## Next Steps

1. Complete remaining screen components
2. Add navigation state management (consider React Navigation or Zustand)
3. Connect to backend APIs
4. Add animations (React Native Reanimated)
5. Implement address selection logic
6. Add product detail bottom sheet
7. Implement cart smart logic (package deduction)
8. Add image picker for profile avatar
9. Implement real-time order tracking
10. Add payment integration

All components follow the exact HTML design with proper TypeScript types, reusable architecture, and maintainable code structure.

