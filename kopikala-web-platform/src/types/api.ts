// API Response Types
export interface ApiResponse<T = any> {
  data: T
  message: string
  status: 'success' | 'error'
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// WebSocket Types
export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
  id: string
}

export interface RealtimeUpdate {
  type: 'price_update' | 'stock_update' | 'user_interaction' | 'system_message'
  data: any
  userId?: string
  timestamp: string
}

// User Types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: boolean
  performanceMode: 'high' | 'balanced' | 'low'
  graphicsQuality: 'high' | 'medium' | 'low'
}

// Product Types
export interface Product {
  id: string
  name: string
  category: string
  subcategory: string
  description: string
  price: number
  currency: string
  stock: number
  images: string[]
  model3D: string
  variants: ProductVariant[]
  attributes: ProductAttribute[]
  metadata: ProductMetadata
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  name: string
  color: string
  colorCode: string
  material: string
  price: number
  stock: number
  model3D: string
  thumbnail: string
}

export interface ProductAttribute {
  key: string
  value: string | number | boolean
  unit?: string
  displayName: string
}

export interface ProductMetadata {
  tags: string[]
  featured: boolean
  popular: boolean
  newArrival: boolean
  onSale: boolean
  discountPercentage?: number
  seoTitle?: string
  seoDescription?: string
}

// Cart & Order Types
export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  price: number
  customizations?: Record<string, any>
}

export interface Cart {
  id: string
  userId?: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
  updatedAt: string
}

export interface Order {
  id: string
  userId: string
  items: CartItem[]
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment: PaymentInfo
  shipping: ShippingInfo
  totals: OrderTotals
  createdAt: string
  updatedAt: string
}

export interface PaymentInfo {
  method: 'credit_card' | 'paypal' | 'bank_transfer'
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'
  transactionId?: string
  amount: number
  currency: string
}

export interface ShippingInfo {
  address: Address
  method: string
  cost: number
  estimatedDelivery: string
  trackingNumber?: string
}

export interface Address {
  street: string
  city: string
  state: string
  country: string
  postalCode: string
  phone?: string
}

export interface OrderTotals {
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  currency: string
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  path?: string
  stack?: string
}

export interface ValidationError extends AppError {
  field: string
  value: any
  constraint: string
}

// Analytics Types
export interface AnalyticsEvent {
  name: string
  category: string
  properties: Record<string, any>
  userId?: string
  sessionId: string
  timestamp: string
}

export interface UserSession {
  id: string
  userId?: string
  startTime: string
  endTime?: string
  events: AnalyticsEvent[]
  metadata: {
    userAgent: string
    browser: string
    os: string
    device: string
    viewport: {
      width: number
      height: number
    }
  }
}
