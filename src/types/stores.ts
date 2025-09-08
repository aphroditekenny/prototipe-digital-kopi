import { PerformanceMetrics, PerformanceBudget } from './3d'
import { Product, ProductVariant, User, Cart } from './api'

// Scene Store Types
export interface SceneState {
  isLoading: boolean
  isInitialized: boolean
  currentScene: string
  camera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    fov: number
  }
  lighting: {
    environmentMap: string | null
    intensity: number
    shadowsEnabled: boolean
  }
  environment: string
  loadedModels: Map<string, any>
  activeInteractions: Set<string>
  renderSettings: {
    antialias: boolean
    shadows: boolean
    postProcessing: boolean
    qualityLevel: 'high' | 'medium' | 'low'
  }
}

export interface SceneActions {
  initialize(): Promise<void>
  setLoading(loading: boolean): void
  loadModel(id: string, path: string): Promise<any>
  unloadModel(id: string): void
  updateCamera(config: Partial<SceneState['camera']>): void
  updateLighting(config: Partial<SceneState['lighting']>): void
  setEnvironment(environment: string): void
  addInteraction(id: string): void
  removeInteraction(id: string): void
  updateRenderSettings(settings: Partial<SceneState['renderSettings']>): void
  cleanup(): void
}

export interface SceneGetters {
  isModelLoaded: (id: string) => boolean
  hasActiveInteractions: boolean
  currentCameraConfig: SceneState['camera']
  currentLightingConfig: SceneState['lighting']
  renderQuality: SceneState['renderSettings']['qualityLevel']
}

// Product Store Types
export interface ProductState {
  products: Product[]
  categories: string[]
  selectedProduct: Product | null
  selectedVariant: ProductVariant | null
  activeColor: string
  activeMaterial: string
  viewMode: '3d' | 'gallery' | 'details'
  filters: ProductFilters
  searchQuery: string
  isLoading: boolean
  loadingStates: Map<string, boolean>
}

export interface ProductFilters {
  category: string[]
  priceRange: [number, number]
  colors: string[]
  materials: string[]
  inStock: boolean
  featured: boolean
  onSale: boolean
}

export interface ProductActions {
  fetchProducts(): Promise<void>
  fetchCategories(): Promise<void>
  selectProduct(productId: string): void
  selectVariant(variantId: string): void
  setActiveColor(color: string): void
  setActiveMaterial(material: string): void
  setViewMode(mode: ProductState['viewMode']): void
  updateFilters(filters: Partial<ProductFilters>): void
  setSearchQuery(query: string): void
  clearSelection(): void
  preloadProduct(productId: string): Promise<void>
}

export interface ProductGetters {
  filteredProducts: Product[]
  availableColors: string[]
  availableMaterials: string[]
  currentProductVariants: ProductVariant[]
  isProductSelected: boolean
  selectedProductModel: string | null
  productsByCategory: Record<string, Product[]>
}

// Performance Store Types
export interface PerformanceState {
  isMonitoring: boolean
  currentMetrics: PerformanceMetrics
  budget: PerformanceBudget
  history: PerformanceMetrics[]
  alerts: PerformanceAlert[]
  settings: PerformanceSettings
  deviceInfo: DeviceInfo
}

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error'
  metric: keyof PerformanceMetrics
  threshold: number
  currentValue: number
  timestamp: string
  resolved: boolean
}

export interface PerformanceSettings {
  enabled: boolean
  historySize: number
  alertThresholds: Partial<PerformanceBudget>
  autoOptimize: boolean
  reportingInterval: number
}

export interface DeviceInfo {
  userAgent: string
  platform: string
  gpu: string
  cpuCores: number
  memory: number
  screenSize: { width: number; height: number }
  pixelRatio: number
  supportsWebGL2: boolean
  supportsWebGPU: boolean
  maxTextureSize: number
}

export interface PerformanceActions {
  startMonitoring(): void
  stopMonitoring(): void
  updateMetrics(metrics: Partial<PerformanceMetrics>): void
  setBudget(budget: Partial<PerformanceBudget>): void
  addAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void
  resolveAlert(alertId: string): void
  clearHistory(): void
  updateSettings(settings: Partial<PerformanceSettings>): void
  collectDeviceInfo(): Promise<void>
}

export interface PerformanceGetters {
  currentFPS: number
  isPerformant: boolean
  criticalAlerts: PerformanceAlert[]
  averageMetrics: PerformanceMetrics
  memoryUsagePercentage: number
  exceedsThreshold: (metric: keyof PerformanceMetrics) => boolean
}

// User Store Types
export interface UserState {
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  preferences: User['preferences']
  session: {
    id: string
    startTime: string
    lastActivity: string
  } | null
}

export interface UserActions {
  login(credentials: { email: string; password: string }): Promise<void>
  logout(): Promise<void>
  register(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>
  updateProfile(updates: Partial<User>): Promise<void>
  updatePreferences(preferences: Partial<User['preferences']>): Promise<void>
  refreshToken(): Promise<void>
  startSession(): void
  endSession(): void
}

export interface UserGetters {
  isLoggedIn: boolean
  userInitials: string
  preferredTheme: User['preferences']['theme']
  preferredLanguage: string
  performanceMode: User['preferences']['performanceMode']
}

// Realtime Store Types
export interface RealtimeState {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastMessage: any
  messageHistory: any[]
  subscriptions: Set<string>
  reconnectAttempts: number
  latency: number
}

export interface RealtimeActions {
  connect(): Promise<void>
  disconnect(): void
  sendMessage(message: any): void
  subscribe(channel: string): void
  unsubscribe(channel: string): void
  handleMessage(message: any): void
  handleDisconnect(): void
  handleReconnect(): void
}

export interface RealtimeGetters {
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  isSubscribedTo: (channel: string) => boolean
  messageCount: number
  averageLatency: number
}

// Root Store Type
export interface RootState {
  scene: SceneState
  products: ProductState
  performance: PerformanceState
  user: UserState
  realtime: RealtimeState
}
