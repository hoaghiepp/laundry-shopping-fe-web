# Address Components

Reusable address form components for selecting city, district, ward, and entering detailed address. Built with GlueStack UI components and integrated with GoShip API.

## Components

### Select
A reusable dropdown/select component with modal picker.

**Props:**
- `label: string` - Label text
- `placeholder?: string` - Placeholder text (default: "Chọn...")
- `value?: string | number | null` - Selected value
- `options: SelectOption[]` - Array of options
- `onSelect: (value: string | number) => void` - Callback when option is selected
- `error?: string` - Error message
- `disabled?: boolean` - Disable the select
- `loading?: boolean` - Show loading state

**Example:**
```tsx
<Select
  label="Chọn thành phố"
  value={selectedCity}
  options={[
    { value: 1, label: 'Hà Nội' },
    { value: 2, label: 'Hồ Chí Minh' },
  ]}
  onSelect={(value) => setSelectedCity(value)}
/>
```

### CitySelector
Fetches and displays cities from GoShip API.

**Props:**
- `value?: string | number | null` - Selected city ID
- `onSelect: (cityId: string | number, cityName: string) => void` - Callback with ID and name
- `error?: string` - Error message

**Example:**
```tsx
<CitySelector
  value={cityId}
  onSelect={(id, name) => {
    setCityId(id);
    setCityName(name);
  }}
/>
```

### DistrictSelector
Fetches and displays districts based on selected city.

**Props:**
- `cityId?: string | number | null` - Selected city ID (required to enable)
- `value?: string | number | null` - Selected district ID
- `onSelect: (districtId: string | number, districtName: string) => void` - Callback with ID and name
- `error?: string` - Error message

**Example:**
```tsx
<DistrictSelector
  cityId={cityId}
  value={districtId}
  onSelect={(id, name) => {
    setDistrictId(id);
    setDistrictName(name);
  }}
/>
```

### WardSelector
Fetches and displays wards based on selected district.

**Props:**
- `districtId?: string | number | null` - Selected district ID (required to enable)
- `value?: string | number | null` - Selected ward ID
- `onSelect: (wardId: string | number, wardName: string) => void` - Callback with ID and name
- `error?: string` - Error message

**Example:**
```tsx
<WardSelector
  districtId={districtId}
  value={wardId}
  onSelect={(id, name) => {
    setWardId(id);
    setWardName(name);
  }}
/>
```

### AddressInput
Multiline text input for detailed address.

**Props:**
- `label: string` - Label text
- `error?: string` - Error message
- All standard `TextInputProps` are supported

**Example:**
```tsx
<AddressInput
  label="Địa chỉ chi tiết"
  placeholder="Nhập số nhà, tên đường..."
  value={address}
  onChangeText={setAddress}
  error={errors.address}
/>
```

### AddAddressScreenWrapper ⭐ (Recommended)
High-level wrapper that handles all address logic automatically.

**Props:**
- `onBack: () => void` - Back button callback
- `onSuccess?: () => void` - Called after successful save
- `editingAddressId?: string | null` - Address ID to edit (null for new)
- `existingAddressesCount?: number` - Count of existing addresses

**Features:**
- ✅ Auto-fetches user profile for pre-fill
- ✅ Handles create & update operations
- ✅ Shows success/error alerts
- ✅ Minimal setup required

**Example:**
```tsx
import { AddAddressScreenWrapper } from '@/components/address';

{showAddAddress && (
  <AddAddressScreenWrapper
    onBack={() => setShowAddAddress(false)}
    onSuccess={() => fetchAddresses()}
    editingAddressId={editingId}
    existingAddressesCount={addresses.length}
  />
)}
```

### AddAddressScreen (Low-Level)
Base component for custom save logic.

**Props:**
- `onBack: () => void` - Callback when back button is pressed
- `onSave: (data: AddressFormData) => void` - Callback when save button is pressed
- `initialData?: Partial<AddressFormData>` - Initial form data for editing

## Features

- ✅ Cascading selections (City → District → Ward)
- ✅ Automatic API integration with GoShip service
- ✅ Form validation with error messages
- ✅ Loading states for async operations
- ✅ Disabled states for dependent fields
- ✅ Modal-based selection UI
- ✅ Built with GlueStack UI components
- ✅ TypeScript support
- ✅ Modular and reusable components

## Usage Examples

### In ProfileScreen (Edit & Add)

```tsx
import { AddAddressScreenWrapper } from '@/components/address';

const [showAddAddress, setShowAddAddress] = useState(false);
const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
const [addresses, setAddresses] = useState([]);

const handleAddAddress = () => {
  setEditingAddressId(null);
  setShowAddAddress(true);
};

const handleEditAddress = (id: string) => {
  setEditingAddressId(id);
  setShowAddAddress(true);
};

const handleAddressSuccess = async () => {
  // Refresh addresses
  const response = await customerAddressService.getCustomerAddresses();
  setAddresses(response.data);
};

// In render
{showAddAddress && (
  <AddAddressScreenWrapper
    onBack={() => {
      setShowAddAddress(false);
      setEditingAddressId(null);
    }}
    onSuccess={handleAddressSuccess}
    editingAddressId={editingAddressId}
    existingAddressesCount={addresses.length}
  />
)}
```

### In CartScreen (Add Only)

```tsx
import { AddAddressScreenWrapper } from '@/components/address';

const [showAddAddress, setShowAddAddress] = useState(false);
const [addresses, setAddresses] = useState([]);

const handleAddressSuccess = async () => {
  // Refresh addresses and selected address
  await fetchAddresses();
};

// In render
{showAddAddress && (
  <AddAddressScreenWrapper
    onBack={() => setShowAddAddress(false)}
    onSuccess={handleAddressSuccess}
    existingAddressesCount={addresses.length}
  />
)}
```

