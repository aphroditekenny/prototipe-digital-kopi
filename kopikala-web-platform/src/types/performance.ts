// Performance Budget Configuration
export interface PerformanceBudgetConfig {
  // Frame Rate Targets
  targetFPS: number
  minFPS: number
  
  // Rendering Limits
  maxDrawCalls: number
  maxTriangles: number
  maxVertices: number
  
  // Memory Limits (in MB)
  maxTextureMemory: number
  maxGeometryMemory: number
  maxTotalMemory: number
  
  // Texture Constraints
  maxTextureSize: number
  maxTextureCount: number
  
  // Loading Performance
  maxAssetLoadTime: number
  maxInitializationTime: number
  
  // Core Web Vitals
  maxLCP: number // Largest Contentful Paint
  maxFID: number // First Input Delay
  maxCLS: number // Cumulative Layout Shift
}

// Runtime Performance Metrics
export interface RuntimeMetrics {
  // Frame Performance
  fps: number
  frameTime: number
  deltaTime: number
  
  // Render Statistics
  drawCalls: number
  triangles: number
  vertices: number
  
  // Memory Usage
  usedTextureMemory: number
  usedGeometryMemory: number
  totalMemoryUsage: number
  
  // GPU Information
  gpuMemoryUsage: number
  gpuUtilization: number
  
  // Browser Performance
  domNodes: number
  jsHeapUsed: number
  jsHeapTotal: number
  
  // Network
  networkRequests: number
  totalTransferSize: number
}

// Performance Monitoring Configuration
export interface MonitoringConfig {
  enabled: boolean
  sampleRate: number
  reportingInterval: number
  maxHistorySize: number
  
  // Alert Thresholds
  fpsThreshold: number
  memoryThreshold: number
  loadTimeThreshold: number
  
  // Auto-optimization
  enableAutoOptimization: boolean
  optimizationAggression: 'conservative' | 'moderate' | 'aggressive'
  
  // Reporting
  enableReporting: boolean
  reportingEndpoint?: string
  enableAnalytics: boolean
}

// Device Capability Detection
export interface DeviceCapabilities {
  // GPU Information
  gpuVendor: string
  gpuRenderer: string
  gpuVersion: string
  
  // WebGL Support
  webglVersion: '1' | '2'
  webglExtensions: string[]
  maxTextureSize: number
  maxVertexAttributes: number
  maxVertexUniformVectors: number
  maxFragmentUniformVectors: number
  maxVaryingVectors: number
  maxTextureImageUnits: number
  
  // Hardware
  hardwareConcurrency: number
  deviceMemory?: number
  
  // Display
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  colorDepth: number
  
  // Performance Hints
  powerPreference: 'default' | 'high-performance' | 'low-power'
  
  // Estimated Performance Tier
  performanceTier: 'low' | 'medium' | 'high'
}

// Quality Level Configurations
export interface QualitySettings {
  // Rendering Quality
  antialias: boolean
  shadows: boolean
  shadowMapSize: number
  
  // Texture Quality
  textureQuality: 'low' | 'medium' | 'high'
  anisotropicFiltering: number
  
  // Model Quality
  lodBias: number
  maxLODLevel: number
  
  // Effects
  postProcessing: boolean
  environmentMapping: boolean
  reflections: boolean
  
  // Animation
  animationQuality: 'low' | 'medium' | 'high'
  particleCount: number
}

// Optimization Strategies
export interface OptimizationStrategy {
  name: string
  description: string
  trigger: {
    metric: keyof RuntimeMetrics
    threshold: number
    duration: number
  }
  actions: OptimizationAction[]
  reversible: boolean
  priority: number
}

export interface OptimizationAction {
  type: 'quality_reduction' | 'lod_adjustment' | 'effect_disable' | 'memory_cleanup'
  target: string
  parameters: Record<string, any>
  impact: {
    performance: number
    quality: number
  }
}

// Performance Profiling
export interface PerformanceProfile {
  id: string
  name: string
  timestamp: string
  duration: number
  
  // System Information
  deviceInfo: DeviceCapabilities
  browserInfo: {
    name: string
    version: string
    engine: string
  }
  
  // Metrics Collection
  samples: RuntimeMetrics[]
  averages: RuntimeMetrics
  peaks: RuntimeMetrics
  
  // Event Timeline
  events: PerformanceEvent[]
  
  // Analysis
  bottlenecks: PerformanceBottleneck[]
  recommendations: PerformanceRecommendation[]
}

export interface PerformanceEvent {
  timestamp: number
  type: 'user_interaction' | 'asset_load' | 'scene_change' | 'optimization'
  data: any
  duration?: number
  impact: {
    fps: number
    memory: number
  }
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'gpu' | 'memory' | 'network'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedMetrics: string[]
  suggestedFix: string
}

export interface PerformanceRecommendation {
  category: 'rendering' | 'assets' | 'code' | 'settings'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  expectedImprovement: {
    fps: number
    memory: number
  }
  implementation: string
}

// Asset Performance Tracking
export interface AssetPerformanceData {
  id: string
  type: 'model' | 'texture' | 'audio'
  
  // Size Information
  fileSize: number
  compressedSize: number
  compressionRatio: number
  
  // Load Performance
  loadTime: number
  parseTime: number
  setupTime: number
  
  // Runtime Impact
  memoryFootprint: number
  renderCost: number
  triangleCount?: number
  textureResolution?: { width: number; height: number }
  
  // Optimization Status
  optimized: boolean
  optimizations: string[]
  
  // Usage Statistics
  usageCount: number
  lastUsed: string
}
