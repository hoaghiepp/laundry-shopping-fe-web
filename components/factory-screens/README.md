# Factory Screens

Screen components for the factory app, cloned from the HTML design.

## Screens

### FactoryDashboardScreen
Main dashboard with search, filters (todo/issue/wait/done), and item cards.

### FactoryLogisticsScreen
Logistics management with IN (incoming) and OUT (outgoing) tabs.

### FactoryScanScreen
Full-screen QR code scanner interface with action buttons.

### FactoryItemDetailScreen
Item detail view with status update actions (washing, drying, ironing, packing).
Supports different item states: normal, exception_wait, return.

### FactoryReportIssueScreen
Camera interface for reporting issues with error type selection.

### FactoryHistoryScreen
Search and view item processing history.

### FactoryProfileScreen
User profile with stats, settings, and logout.

## Usage

All screens are used in the main `factory-home.tsx` page with state management for navigation and data flow.
