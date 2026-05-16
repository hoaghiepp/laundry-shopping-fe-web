# Authentication Components

This directory contains reusable authentication components cloned from the HTML design using React Native and styled to match the original design exactly.

## Component Structure

### 1. **RoleSelector** (`RoleSelector.tsx`)
- Allows users to select their role: User (Customer), Store (Hub), or Factory
- Fully styled with active/inactive states
- Colors match the HTML design (Blue: #2563EB, Gray: #4B5563, #E5E7EB)
- Uses FontAwesome5 icons

**Props:**
```typescript
{
  selectedRole: 'user' | 'store' | 'factory';
  onRoleChange: (role: UserRole) => void;
}
```

### 2. **AuthInput** (`AuthInput.tsx`)
- Reusable input field with left icon support
- Supports password fields with eye icon toggle
- Styled with gray background (#F9FAFB) and rounded corners
- Error state support

**Props:**
```typescript
{
  label: string;
  icon: string; // FontAwesome5 icon name
  error?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  // Plus all TextInput props
}
```

### 3. **OTPInput** (`OTPInput.tsx`)
- Specialized input for OTP verification
- Built-in countdown timer (60 seconds)
- "Get Code" button with loading state
- Validates phone number before sending

**Props:**
```typescript
{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSendOTP: () => Promise<void>;
  phoneNumber?: string;
}
```

### 4. **LoginForm** (`LoginForm.tsx`)
- Complete login form with role-specific UI
- Toggle between password and OTP login (for users only)
- Remember me checkbox
- Forgot password link
- Role-specific titles and labels

**Props:**
```typescript
{
  role: UserRole;
  onLogin: (phone: string, password?: string, otp?: string) => void;
  onSwitchToRegister: () => void;
  onSwitchToForgot: () => void;
}
```

**Role-specific behavior:**
- **User**: Can login with password OR OTP
- **Store/Factory**: Password only (no OTP option)

### 5. **RegisterForm** (`RegisterForm.tsx`)
- Registration form with role-specific fields
- Employee code field for Store/Factory roles (highlighted in yellow)
- OTP verification for User role only
- All fields match HTML design

**Props:**
```typescript
{
  role: UserRole;
  onRegister: (data: RegisterData) => void;
  onSwitchToLogin: () => void;
}
```

**Role-specific fields:**
- **User**: Name, Phone, OTP, Password
- **Store/Factory**: Name, Phone, Employee Code, Password (no OTP)

### 6. **ForgotPasswordForm** (`ForgotPasswordForm.tsx`)
- Password reset flow with OTP verification
- Back button to return to login
- Simple 3-step process: Phone → OTP → New Password

**Props:**
```typescript
{
  onSubmit: (phone: string, otp: string, newPassword: string) => void;
  onBack: () => void;
}
```

## Color Palette (Matching HTML)

```typescript
// Primary Blue
Primary: '#2563EB' // Blue-600

// Backgrounds
Background: '#F3F4F6' // Gray-100
InputBg: '#F9FAFB' // Gray-50
White: '#FFFFFF'

// Text Colors
TitleText: '#1F2937' // Gray-800
BodyText: '#6B7280' // Gray-500
LabelText: '#6B7280' // Gray-500
PlaceholderText: '#9CA3AF' // Gray-400

// Borders
Border: '#E5E7EB' // Gray-200
BorderFocus: '#2563EB' // Blue-600

// Buttons
ButtonPrimary: '#2563EB' // Blue-600
ButtonSuccess: '#16A34A' // Green-600
ButtonDisabled: '#E5E7EB' // Gray-200

// Error/Warning
Error: '#EF4444' // Red-500
Warning: '#D97706' // Amber-600
WarningBg: '#FFFBEB' // Amber-50
```

## Usage Example

```typescript
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  RoleSelector,
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  UserRole
} from '@/components/auth';

export default function AuthScreen() {
  const [role, setRole] = useState<UserRole>('user');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  return (
    <View>
      {mode !== 'forgot' && (
        <RoleSelector 
          selectedRole={role} 
          onRoleChange={setRole} 
        />
      )}

      {mode === 'login' && (
        <LoginForm
          role={role}
          onLogin={(phone, password, otp) => {
            // Handle login
          }}
          onSwitchToRegister={() => setMode('register')}
          onSwitchToForgot={() => setMode('forgot')}
        />
      )}

      {mode === 'register' && (
        <RegisterForm
          role={role}
          onRegister={(data) => {
            // Handle registration
          }}
          onSwitchToLogin={() => setMode('login')}
        />
      )}

      {mode === 'forgot' && (
        <ForgotPasswordForm
          onSubmit={(phone, otp, newPassword) => {
            // Handle password reset
          }}
          onBack={() => setMode('login')}
        />
      )}
    </View>
  );
}
```

## Features Implemented

✅ Role-based authentication (User, Store, Factory)
✅ Multiple login methods (Password, OTP)
✅ Registration with OTP verification
✅ Employee code field for staff roles
✅ Password reset flow
✅ Remember me checkbox
✅ OTP countdown timer
✅ Responsive form validation
✅ Icons using FontAwesome5 (@expo/vector-icons)
✅ Exact color matching from HTML
✅ All animations and transitions
✅ Mobile-first design
✅ Keyboard avoiding behavior

## Dependencies

- `@expo/vector-icons` - For FontAwesome5 icons
- `react-native` - Core components
- `expo-router` - Navigation

## Styling Approach

All components use StyleSheet.create() for optimal performance and type safety. Colors and spacing values are hardcoded to match the HTML design exactly. Components are self-contained with no external style dependencies.

## Maintainability

Each component is:
- **Self-contained**: All styles included in the same file
- **Reusable**: Props-based configuration
- **Type-safe**: Full TypeScript support
- **Documented**: Clear prop interfaces
- **Testable**: Pure components with clear inputs/outputs

## Next Steps

To integrate with your backend:
1. Replace mock `onLogin`, `onRegister`, `onSendOTP` calls with actual API calls
2. Add form validation library (e.g., Formik, React Hook Form)
3. Implement secure token storage (expo-secure-store)
4. Add loading states during API calls
5. Implement error handling and display

