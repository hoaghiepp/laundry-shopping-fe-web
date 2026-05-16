# Factory Incident Reporting Components

This directory contains modular components for reporting incidents in the factory workflow.

## Components

### 1. IncidentReportForm
Main form component that orchestrates the incident reporting flow.

**Props:**
- `orderId: string` - The order ID
- `orderCode: string` - The order code for display
- `onSubmit: (report: IncidentReport) => void` - Callback when report is submitted
- `onCancel: () => void` - Callback when user cancels

**Features:**
- Validates all required fields
- Combines incident type, description, and images
- Shows guidelines and warnings
- Handles submission state

### 2. IncidentTypeSelector
Horizontal scrollable selector for incident types.

**Props:**
- `selectedType: string | null` - Currently selected incident type ID
- `onSelectType: (typeId: string) => void` - Callback when type is selected

**Incident Types:**
- `TORN` - Rách, thủng
- `STAIN` - Vết bẩn cứng đầu
- `COLOR_FADE` - Phai màu
- `SHRINK` - Co rút
- `BUTTON_MISSING` - Mất cúc áo
- `ZIPPER_BROKEN` - Hỏng khóa kéo
- `DISCOLORATION` - Đổi màu
- `OTHER` - Khác

### 3. ImagePickerSection
Handles image capture and selection with preview.

**Props:**
- `images: ImagePickerAsset[]` - Array of selected images
- `onImagesChange: (images: ImagePickerAsset[]) => void` - Callback when images change
- `maxImages?: number` - Maximum number of images (default: 5)

**Features:**
- Take photo with camera
- Pick from gallery (multiple selection)
- Preview selected images
- Remove images
- Enforces max image limit

## Usage Example

```tsx
import { IncidentReportForm, IncidentReport } from '@/components/factory/incident';

function MyScreen() {
  const handleSubmit = (report: IncidentReport) => {
    // Upload images and submit report
    console.log('Type:', report.type);
    console.log('Description:', report.description);
    console.log('Images:', report.images);
  };

  return (
    <IncidentReportForm
      orderId="order-123"
      orderCode="ORD-2024-001"
      onSubmit={handleSubmit}
      onCancel={() => navigation.goBack()}
    />
  );
}
```

## Data Structure

### IncidentReport
```typescript
interface IncidentReport {
  type: string;           // Incident type ID
  description: string;    // Detailed description
  images: ImagePickerAsset[]; // Array of images
}
```

### IncidentType
```typescript
interface IncidentType {
  id: string;       // Unique identifier
  label: string;    // Display label
  icon: string;     // FontAwesome icon name
  color: string;    // Primary color
  bgColor: string;  // Background color
}
```

## Permissions Required

The components require the following permissions:
- Camera permission (for taking photos)
- Media library permission (for selecting photos)

These are configured in `app.json`:
```json
{
  "plugins": [
    [
      "expo-image-picker",
      {
        "photosPermission": "Ứng dụng cần quyền truy cập ảnh để bạn có thể tải lên hình ảnh sản phẩm."
      }
    ]
  ]
}
```

## Styling

All components use inline StyleSheet for consistency and maintainability. Colors follow the Tailwind color palette for consistency with the rest of the app.

## Future Enhancements

- [ ] Add image compression before upload
- [ ] Add image annotation (draw on images)
- [ ] Add voice notes
- [ ] Add predefined templates for common incidents
- [ ] Add offline support with queue

