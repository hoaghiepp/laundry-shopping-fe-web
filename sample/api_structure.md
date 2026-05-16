# API Structure Design - Laundry Pro System

## Nguyên tắc thiết kế

1. **RESTful Convention**: Sử dụng HTTP verbs chuẩn (GET, POST, PUT, PATCH, DELETE)
2. **Versioning**: `/v1/` prefix cho tất cả endpoints
3. **Role-based**: Phân chia theo role (Customer, Store Staff, Factory Staff, Admin)
4. **Domain-driven**: Nhóm theo domain (Auth, Products, Orders, Assets, Operations)
5. **Unified Commerce**: API hỗ trợ cả hàng hóa, dịch vụ và tài sản ảo

---

## 1. Authentication & Authorization (`/v1/auth`)

### 1.1 Public Endpoints
```
POST   /v1/auth/register              # Đăng ký tài khoản (Customer)
POST   /v1/auth/login                 # Đăng nhập (tất cả roles)
POST   /v1/auth/refresh              # Refresh token
POST   /v1/auth/forgot-password        # Quên mật khẩu
POST   /v1/auth/reset-password        # Đặt lại mật khẩu
```

### 1.2 Protected Endpoints (cần JWT)
```
GET    /v1/auth/me                    # Lấy thông tin user hiện tại
PUT    /v1/auth/me                    # Cập nhật profile
POST   /v1/auth/logout                # Đăng xuất
```

---

## 2. Customer APIs (`/v1/customers`)

### 2.1 Profile Management
```
GET    /v1/customers/me                # Thông tin khách hàng hiện tại
PUT    /v1/customers/me                # Cập nhật profile
PATCH  /v1/customers/me/avatar          # Upload avatar
GET    /v1/customers/me/locations      # Danh sách địa chỉ
POST   /v1/customers/me/locations      # Thêm địa chỉ
PUT    /v1/customers/me/locations/{id}  # Cập nhật địa chỉ
DELETE /v1/customers/me/locations/{id} # Xóa địa chỉ
```

### 2.2 Assets Management (Ví & Gói)
```
GET    /v1/customers/me/wallet         # Số dư ví + lịch sử giao dịch
POST   /v1/customers/me/wallet/topup   # Nạp tiền vào ví (tạo đơn TOPUP)
GET    /v1/customers/me/packages       # Danh sách gói đang sở hữu
GET    /v1/customers/me/packages/{id}  # Chi tiết gói
GET    /v1/customers/me/vouchers       # Danh sách voucher
POST   /v1/customers/me/vouchers/apply # Áp dụng voucher vào đơn
```

---

## 3. Products & Catalog (`/v1/products`)

### 3.1 Public Catalog
```
GET    /v1/products                   # Danh sách sản phẩm (filter: type, store_id, search)
GET    /v1/products/{id}              # Chi tiết sản phẩm
GET    /v1/products/{id}/availability # Kiểm tra tồn kho tại các tiệm
```

### 3.2 Package Store (Gói dịch vụ & Nạp tiền)
```
GET    /v1/products/packages           # Danh sách gói dịch vụ (type=PACKAGE)
GET    /v1/products/topups             # Danh sách gói nạp tiền (type=TOPUP)
GET    /v1/products/packages/{id}     # Chi tiết gói dịch vụ
GET    /v1/products/topups/{id}        # Chi tiết gói nạp tiền
```

### 3.3 Admin Management (chỉ Admin)
```
POST   /v1/products                   # Tạo sản phẩm mới
PUT    /v1/products/{id}              # Cập nhật sản phẩm
PATCH  /v1/products/{id}/status       # Bật/tắt sản phẩm
DELETE /v1/products/{id}              # Xóa sản phẩm (soft delete)
POST   /v1/products/{id}/images       # Upload ảnh sản phẩm
```

---

## 4. Cart & Checkout (`/v1/cart`)

### 4.1 Cart Management
```
GET    /v1/cart                        # Lấy giỏ hàng hiện tại
POST   /v1/cart/items                  # Thêm item vào giỏ
PUT    /v1/cart/items/{item_id}        # Cập nhật số lượng
DELETE /v1/cart/items/{item_id}        # Xóa item khỏi giỏ
DELETE /v1/cart                        # Xóa toàn bộ giỏ hàng
```

### 4.2 Checkout Preview (Tính toán trước khi đặt)
```
POST   /v1/cart/preview                # Preview đơn hàng (tính toán tài chính)
       Body: {
         items: [...],
         shipping_address_id: int,
         pickup_time_slot?: string,    # Nếu có dịch vụ
         voucher_code?: string,
         use_packages?: boolean,        # Có dùng gói không
         use_wallet?: boolean           # Có dùng ví không
       }
       Response: {
         total_amount: decimal,
         package_deduction: decimal,
         voucher_deduction: decimal,
         wallet_deduction: decimal,
         cod_amount: decimal,
         breakdown: [...]
       }
```

### 4.3 Order Placement
```
POST   /v1/cart/checkout               # Chốt đơn hàng (atomic transaction)
       Body: {
         shipping_address_id: int,
         pickup_time_slot?: string,
         voucher_code?: string,
         use_packages: boolean,
         use_wallet: boolean,
         payment_method: "COD" | "WALLET" | "CARD"
       }
       Response: {
         order_code: string,
         order_id: int,
         payment_status: string,
         cod_amount: decimal
       }
```

---

## 5. Orders (`/v1/orders`)

### 5.1 Customer Order Management
```
GET    /v1/orders                      # Danh sách đơn hàng của tôi (filter: status, date_range)
GET    /v1/orders/{order_code}          # Chi tiết đơn hàng
GET    /v1/orders/{order_code}/tracking # Tracking chi tiết (dịch vụ + hàng hóa)
POST   /v1/orders/{order_code}/cancel  # Hủy đơn (nếu chưa xử lý)
POST   /v1/orders/{order_code}/review   # Đánh giá đơn hàng
```

### 5.2 Store Staff Order Management (`/v1/store/orders`)
```
GET    /v1/store/orders                # Danh sách đơn hàng tại tiệm (filter: status, date)
GET    /v1/store/orders/{order_code}   # Chi tiết đơn hàng
POST   /v1/store/orders/{order_code}/receive  # Nhận đồ từ khách (check-in)
POST   /v1/store/orders/{order_code}/items/{item_id}/tag  # In tem mã vạch cho món đồ
PUT    /v1/store/orders/{order_code}/items/{item_id}/qty   # Cập nhật số lượng thực tế (cân lại)
POST   /v1/store/orders/{order_code}/items/{item_id}/scan  # Quét mã vạch để tracking
POST   /v1/store/orders/{order_code}/ship-to-factory       # Gửi đồ đi xưởng (tạo Logistics Trip)
POST   /v1/store/orders/{order_code}/consolidate           # Gom đồ sạch + hàng mua
POST   /v1/store/orders/{order_code}/ready-for-delivery    # Sẵn sàng giao hàng
```

### 5.3 Factory Staff Order Management (`/v1/factory/orders`)
```
GET    /v1/factory/orders              # Danh sách đơn tại xưởng
GET    /v1/factory/orders/{order_code} # Chi tiết đơn
POST   /v1/factory/trips/{trip_code}/receive  # Nhận bao tải từ tiệm (quét QR bao)
POST   /v1/factory/items/{barcode}/checkin    # Check-in từng món đồ (quét mã vạch)
POST   /v1/factory/items/{barcode}/incident   # Báo lỗi món đồ (chụp ảnh + mô tả)
PUT    /v1/factory/items/{barcode}/status     # Cập nhật trạng thái (WASHING → DRIED → IRONED)
POST   /v1/factory/items/{barcode}/pack       # Đóng gói món đồ sạch
POST   /v1/factory/batches                    # Tạo mẻ giặt mới
PUT    /v1/factory/batches/{batch_id}/status  # Cập nhật trạng thái mẻ giặt
POST   /v1/factory/trips/{trip_code}/ship     # Gửi đồ sạch về tiệm
GET    /v1/factory/items/search               # Tìm kiếm món đồ (theo barcode/order_code)
```

---

## 6. Logistics (`/v1/logistics`)

### 6.1 Trip Management (Store & Factory)
```
GET    /v1/logistics/trips             # Danh sách chuyến xe
POST   /v1/logistics/trips             # Tạo chuyến xe mới
GET    /v1/logistics/trips/{trip_code} # Chi tiết chuyến xe
PUT    /v1/logistics/trips/{trip_code}/status  # Cập nhật trạng thái (CREATED → IN_TRANSIT → COMPLETED)
POST   /v1/logistics/trips/{trip_code}/containers  # Thêm bao/sọt vào chuyến
```

### 6.2 Container Management
```
GET    /v1/logistics/containers        # Danh sách bao/sọt
POST   /v1/logistics/containers       # Tạo bao/sọt mới
POST   /v1/logistics/containers/{container_code}/seal  # Niêm phong bao
POST   /v1/logistics/containers/{container_code}/scan   # Quét bao để tracking
```

---

## 7. Inventory Management (`/v1/inventory`)

### 7.1 Store Inventory (Store Staff)
```
GET    /v1/inventory/stores/{store_id}/products  # Tồn kho tại tiệm
PUT    /v1/inventory/stores/{store_id}/products/{product_id}  # Cập nhật số lượng
POST   /v1/inventory/stores/{store_id}/products/{product_id}/receive  # Nhập hàng mới
GET    /v1/inventory/stores/{store_id}/low-stock  # Cảnh báo hết hàng
```

### 7.2 Order Picking (Store Staff)
```
GET    /v1/inventory/stores/{store_id}/picking-list  # Danh sách cần soạn hàng
POST   /v1/inventory/stores/{store_id}/orders/{order_code}/pick  # Soạn hàng cho đơn
```

---

## 8. Promotions & Vouchers (`/v1/promotions`)

### 8.1 Public
```
GET    /v1/promotions                  # Danh sách khuyến mãi đang active
GET    /v1/promotions/{code}           # Chi tiết voucher theo code
POST   /v1/promotions/{code}/claim     # Nhận voucher (claim vào tài khoản)
```

### 8.2 Admin Management
```
POST   /v1/promotions                 # Tạo khuyến mãi mới
PUT    /v1/promotions/{id}            # Cập nhật khuyến mãi
DELETE /v1/promotions/{id}            # Xóa khuyến mãi
GET    /v1/promotions/{id}/usage      # Thống kê sử dụng voucher
```

---

## 9. Admin APIs (`/v1/admin`)

### 9.1 User Management
```
GET    /v1/admin/users                 # Danh sách users (filter: role, status)
GET    /v1/admin/users/{id}            # Chi tiết user
PUT    /v1/admin/users/{id}/status     # Bật/tắt tài khoản
GET    /v1/admin/users/{id}/wallet     # Xem ví của user
POST   /v1/admin/users/{id}/wallet/adjust  # Điều chỉnh số dư (manual adjustment)
GET    /v1/admin/users/{id}/orders    # Lịch sử đơn hàng của user
```

### 9.2 Store Management
```
GET    /v1/admin/stores                # Danh sách tiệm/xưởng
POST   /v1/admin/stores                # Tạo tiệm/xưởng mới
PUT    /v1/admin/stores/{id}           # Cập nhật thông tin
GET    /v1/admin/stores/{id}/staff     # Danh sách nhân viên tại tiệm
POST   /v1/admin/stores/{id}/staff     # Thêm nhân viên vào tiệm
```

### 9.3 Staff Management
```
GET    /v1/admin/staff                 # Danh sách nhân viên
POST   /v1/admin/staff                 # Tạo tài khoản nhân viên
PUT    /v1/admin/staff/{id}            # Cập nhật thông tin nhân viên
PUT    /v1/admin/staff/{id}/assign-store  # Gán nhân viên vào tiệm
```

### 9.4 Dashboard & Reports
```
GET    /v1/admin/dashboard             # Dashboard tổng quan
GET    /v1/admin/reports/revenue       # Báo cáo doanh thu (filter: date_range, store_id)
GET    /v1/admin/reports/liability    # Báo cáo tiền khách nạp chưa dùng
GET    /v1/admin/reports/orders        # Báo cáo đơn hàng
GET    /v1/admin/reports/inventory    # Báo cáo tồn kho
```

---

## 10. Notifications (`/v1/notifications`)

```
GET    /v1/notifications                # Danh sách thông báo
GET    /v1/notifications/unread        # Số lượng thông báo chưa đọc
PUT    /v1/notifications/{id}/read     # Đánh dấu đã đọc
PUT    /v1/notifications/read-all      # Đánh dấu tất cả đã đọc
POST   /v1/notifications/preferences   # Cập nhật cài đặt thông báo
```

---

## 11. File Upload (`/v1/upload`)

```
POST   /v1/upload/avatar               # Upload avatar (Customer/Staff)
POST   /v1/upload/product-image         # Upload ảnh sản phẩm (Admin)
POST   /v1/upload/incident-image        # Upload ảnh sự cố (Factory Staff)
```

---

## 12. System & Health (`/v1/system`)

```
GET    /v1/system/health               # Health check (đã có)
GET    /v1/system/info                 # Thông tin hệ thống
GET    /v1/system/config                # Cấu hình hệ thống (public configs)
```

---

## Response Format Standard

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "E1-05",
    "message": "Human readable message",
    "detail": "Technical detail (optional)"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

---

## Authentication & Authorization

### JWT Token Structure
```
Header: Authorization: Bearer <token>
```

### Role-based Access
- **CUSTOMER**: Chỉ truy cập `/v1/customers/me/*`, `/v1/orders` (của mình)
- **STAFF** (Store): Truy cập `/v1/store/*`, `/v1/inventory/stores/{assigned_store_id}/*`
- **STAFF** (Factory): Truy cập `/v1/factory/*`
- **ADMIN**: Truy cập tất cả `/v1/admin/*`

---

## Error Codes Reference

| Code | Scenario | HTTP Status |
|------|----------|-------------|
| E1-01 | Inventory Clash (Hết hàng) | 409 Conflict |
| E1-02 | Slot Full (Quá tải dịch vụ) | 409 Conflict |
| E1-03 | Empty Service (Xóa dịch vụ) | 200 OK (UI switch) |
| E1-04 | Out of Range (Ngoài vùng) | 400 Bad Request |
| E1-05 | Asset Race Condition | 409 Conflict |
| E1-06 | Package Expired | 400 Bad Request |
| E1-07 | Negative Balance | 500 Internal Error |
| E1-08 | Voucher Invalid | 400 Bad Request |
| E2-01 | Weight Mismatch (Cân lại) | 200 OK (Auto deduct) |

---

## Implementation Priority (MVP)

### Phase 1: Core (Week 1-2)
1. Auth APIs (`/v1/auth`)
2. Products Catalog (`/v1/products`)
3. Cart & Checkout (`/v1/cart`)
4. Order Management (`/v1/orders` - Customer)

### Phase 2: Store Operations (Week 3)
1. Store Order Management (`/v1/store/orders`)
2. Inventory (`/v1/inventory`)
3. Logistics (`/v1/logistics`)

### Phase 3: Factory Operations (Week 4)
1. Factory APIs (`/v1/factory/*`)
2. Tracking (`/v1/orders/{code}/tracking`)

### Phase 4: Admin & Reports (Week 5-6)
1. Admin APIs (`/v1/admin/*`)
2. Dashboard & Reports

---

## File Structure Suggestion

```
app/
├── api/
│   ├── __init__.py
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── auth.py          # Authentication routes
│   │   ├── customers.py     # Customer profile & assets
│   │   ├── products.py      # Product catalog
│   │   ├── cart.py          # Cart & checkout
│   │   ├── orders.py        # Order management (Customer)
│   │   ├── store.py         # Store operations
│   │   ├── factory.py       # Factory operations
│   │   ├── logistics.py     # Logistics & trips
│   │   ├── inventory.py     # Inventory management
│   │   ├── promotions.py    # Promotions & vouchers
│   │   ├── admin.py         # Admin APIs
│   │   ├── notifications.py # Notifications
│   │   └── upload.py        # File upload
│   └── dependencies.py      # Shared dependencies (auth, permissions)
├── services/                # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py
│   ├── order_service.py
│   ├── pricing_service.py   # Pricing engine (Package → Voucher → Wallet)
│   ├── wallet_service.py
│   ├── inventory_service.py
│   └── tracking_service.py
├── utils/
│   ├── __init__.py
│   ├── permissions.py      # Role-based permissions
│   ├── exceptions.py        # Custom exceptions
│   └── validators.py       # Input validators
└── core/
    ├── __init__.py
    ├── config.py           # App configuration
    └── security.py         # JWT, password hashing
```

