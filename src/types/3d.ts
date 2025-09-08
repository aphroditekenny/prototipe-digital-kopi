import { Object3D, Scene, Camera, Renderer } from 'three'

// 3D Scene Types
export interface SceneConfig {
  enableShadows: boolean
  antialias: boolean
  powerPreference: 'default' | 'high-performance' | 'low-power'
  alpha: boolean
}

export interface CameraConfig {
  fov: number
  near: number
  far: number
  position: {
    x: number
    y: number
    z: number
  }
}

export interface LightingConfig {
  ambient: {
    color: string
    intensity: number
  }
  directional: {
    color: string
    intensity: number
    position: {
      x: number
      y: number
      z: number
    }
    castShadow: boolean
  }
  environment?: string
}

export interface ProductModel {
  id: string
  name: string
  category: string
  modelPath: string
  thumbnailPath: string
  price: number
  description: string
  availableColors: string[]
  materialProperties: {
    metalness: number
    roughness: number
    envMapIntensity: number
  }
}

export interface LODLevel {
  distance: number
  modelPath: string
  triangleCount: number
}

export interface OptimizedAsset {
  id: string
  name: string
  format: 'glb' | 'gltf'
  compressed: boolean
  dracoCompressed: boolean
  textureCompression: 'ktx2' | 'basis' | 'none'
  lodLevels: LODLevel[]
  fileSize: number
  triangleCount: number
}

// Performance Types
export interface PerformanceBudget {
  maxTriangles: number
  maxDrawCalls: number
  maxTextureSize: number
  targetFPS: number
  maxMemoryUsage: number
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  memoryUsage: number
  textureMemory: number
  geometryMemory: number
}

// Animation Types
export interface AnimationConfig {
  duration: number
  ease: string
  delay?: number
  loop?: boolean
}

export interface TransitionConfig extends AnimationConfig {
  from: any
  to: any
  onComplete?: () => void
  onUpdate?: (progress: number) => void
}

// Touch Controls
export interface TouchControlsConfig {
  enableRotate: boolean
  enableZoom: boolean
  enablePan: boolean
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  dampingFactor: number
}

// Responsive
export interface ViewportConfig {
  width: number
  height: number
  aspectRatio: number
  pixelRatio: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export interface ResponsiveCameraConfig {
  mobile: CameraConfig
  tablet: CameraConfig
  desktop: CameraConfig
}

// Three.js Extended Types
export interface ExtendedObject3D extends Object3D {
  userData: {
    id?: string
    type?: string
    interactive?: boolean
    originalMaterial?: any
    highlightMaterial?: any
  }
}

export interface SceneGraph {
  scene: Scene
  camera: Camera
  renderer: Renderer
  objects: Map<string, ExtendedObject3D>
}
