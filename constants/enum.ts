export enum SecureStoreKeys {
  LOGIN_TOKEN = "login_token",
  REFRESH_TOKEN = "refresh_token",
  GOSHIP_ACCESS_TOKEN = "goship_access_token",
  GOSHIP_REFRESH_TOKEN = "goship_refresh_token",
  GOSHIP_TOKEN_EXPIRES_AT = "goship_token_expires_at",
  REMEMBER_ME_ENABLED = "remember_me_enabled",
  REMEMBER_ME_EMAIL = "remember_me_email",
  REMEMBER_ME_PASSWORD = "remember_me_password",
  REMEMBER_ME_ROLE = "remember_me_role",
  CUSTOMER_PROFILE = "customer_profile",
  LAST_SELECTED_STORE_ID = "last_selected_store_id",
  LAST_SELECTED_FACTORY_ID = "last_selected_factory_id",
  CUSTOMER_ORDER_ACCESS_TOKEN = "customer_order_access_token",
  CUSTOMER_ORDER_REFRESH_TOKEN = "customer_order_refresh_token",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum OrderStatus {
  CREATED = "CREATED",
  PROCESSING = "PROCESSING",
  NEED_CUSTOMER_CONFIRMATION = "NEED_CUSTOMER_CONFIRMATION",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED",
  CUSTOMER_REJECTED = "CUSTOMER_REJECTED",
  CUSTOMER_INCIDENTS_REJECTED = "CUSTOMER_INCIDENTS_REJECTED",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PARTIAL_PAID = "PARTIAL_PAID",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
}

export enum FactoryTab {
  DASHBOARD = "dashboard",
  LOGISTICS = "logistics",
  SCAN = "scan",
  HISTORY = "history",
  PROFILE = "profile",
}

export enum StoreTabType {
  ORDERS = "orders",
  INVENTORY = "inventory",
  LOGISTICS = "logistics",
  REPORT = "report",
  PROFILE = "profile",
}

export enum ProductType {
  SERVICE = "SERVICE",
  GOODS = "GOODS",
  ASSET = "ASSET",
}

export enum ProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE"
}

export enum PickupMethod {
  SELF = "SELF",
  SERVICE = "SERVICE",
}

export enum StoreType {
  HUB = "HUB",
  FACTORY = "FACTORY",
}

export enum ScreenType {
  HOME = "home",
  ALL_OFFERS = "all-offers",
  ALL_SERVICES = "all-services",
  ALL_PRODUCTS = "all-products",
  STORES = "stores",
  PROFILE = "profile",
  WALLET = "wallet",
  CART = "cart",
  ORDERS = "orders",
  ORDER_SUCCESS = "order-success",
  ORDER_DETAIL = "order-detail",
  LAUNDRY_SERVICE = "laundry-service",
  PRODUCT_DETAIL = "product-detail",
}

export enum DeliveryOptions {
  COMBINED = "combined",
  SEPARATE = "separate",
}

export enum GoodsOrderItemStatus {
  CREATED = "CREATED",
  PACKING = "PACKING",
  SHIPPING = "SHIPPING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ServiceOrderItemStatus {
  CREATED = "CREATED",
  PICKING = "PICKING",
  AT_FACTORY = "AT_FACTORY",
  WASHING = "WASHING",
  DELIVERING = "DELIVERING",
  COMPLETED = "COMPLETED",
  WASHED = "WASHED",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

export enum LogisticTripItemType {
  BAG_INBOUND = "BAG_INBOUND",
  BIN_OUTBOUND = "BIN_OUTBOUND",
}

export enum LogisticTripStatus {
  CREATED = "CREATED",
  IN_TRANSIT = "IN_TRANSIT",
  COMPLETED = "COMPLETED",
}

export enum IncidentType {
  TEAR = "TEAR",
  COLOR_FADE = "COLOR_FADE",
  LOST = "LOST",
}

export enum IncidentStatus {
  CREATED = "CREATED",
  USER_ACCEPTED = "USER_ACCEPTED",
  USER_REJECTED = "USER_REJECTED",
}

export enum FactoryBatchMachineType {
  WASHER = "WASHER",
  DRYER = "DRYER",
}

export enum AddressType {
  HOUSE = "HOUSE",
  COMPANY = "COMPANY",
}

export enum FactoryBatchStatus {
  CREATED = "CREATED",
  IN_PROCESS = "IN_PROCESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum PlatformMobile {
  ANDROID = "ANDROID",
  IOS = "IOS",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export enum PromotionStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
}

export enum CustomerPackageStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  USED_UP = "USED_UP",
}

export enum PackageProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum PaymentType {
  DEPOSIT = "DEPOSIT",
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
}

export enum ImportExportType {
  IMPORT = "IMPORT",
  EXPORT = "EXPORT",
}