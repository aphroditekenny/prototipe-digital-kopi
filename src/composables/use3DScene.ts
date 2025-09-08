import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSceneStore } from '@/stores/scene'
import { usePerformanceStore } from '@/stores/performance'
import type { CameraConfig, LightingConfig, SceneConfig } from '@/types/3d'

interface SceneOptions {
  enableShadows?: boolean
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
  alpha?: boolean
  autoResize?: boolean
}

export function use3DScene(options?: SceneOptions) {
  const sceneStore = useSceneStore()
  const performanceStore = usePerformanceStore()

  // Default configuration
  const defaultOptions: Required<SceneOptions> = {
    enableShadows: true,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: true,
    autoResize: true
  }

  const config = { ...defaultOptions, ...options }

  // Reactive state
  const isReady = ref(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const sceneContainer = ref<HTMLElement | null>(null)

  // Scene configuration
  const sceneConfig = ref<SceneConfig>({
    enableShadows: config.enableShadows,
    antialias: config.antialias,
    powerPreference: config.powerPreference,
    alpha: config.alpha
  })

  const cameraConfig = ref<CameraConfig>({
    fov: 50,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 5, z: 10 }
  })

  const lightingConfig = ref<LightingConfig>({
    ambient: {
      color: '#ffffff',
      intensity: 0.4
    },
    directional: {
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 10, y: 10, z: 5 },
      castShadow: true
    },
    environment: '/assets/textures/environments/studio-hdri.hdr'
  })

  // Computed properties
  const isSceneLoaded = computed(() => sceneStore.isInitialized)
  const currentPerformance = computed(() => performanceStore.currentMetrics)

  // Methods
  const initializeScene = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      // Initialize the scene store
      await sceneStore.initialize()

      // Update scene settings
      sceneStore.updateRenderSettings({
        antialias: sceneConfig.value.antialias,
        shadows: sceneConfig.value.enableShadows,
        qualityLevel: 'high'
      })

      // Update camera configuration
      sceneStore.updateCamera(cameraConfig.value)

      // Update lighting configuration
      sceneStore.updateLighting({
        environmentMap: lightingConfig.value.environment,
        intensity: lightingConfig.value.ambient.intensity,
        shadowsEnabled: lightingConfig.value.directional.castShadow
      })

      isReady.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize scene'
      console.error('Scene initialization failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  const updateCameraPosition = (position: { x: number; y: number; z: number }): void => {
    cameraConfig.value.position = position
    sceneStore.updateCamera({ position })
  }

  const updateCameraFOV = (fov: number): void => {
    cameraConfig.value.fov = fov
    sceneStore.updateCamera({ fov })
  }

  const setEnvironmentMap = (path: string): void => {
    lightingConfig.value.environment = path
    sceneStore.updateLighting({ environmentMap: path })
  }

  const updateLightIntensity = (intensity: number): void => {
    lightingConfig.value.ambient.intensity = intensity
    sceneStore.updateLighting({ intensity })
  }

  const enableShadows = (enable: boolean): void => {
    sceneConfig.value.enableShadows = enable
    lightingConfig.value.directional.castShadow = enable
    sceneStore.updateRenderSettings({ shadows: enable })
    sceneStore.updateLighting({ shadowsEnabled: enable })
  }

  const setQualityLevel = (level: 'high' | 'medium' | 'low'): void => {
    sceneStore.updateRenderSettings({ qualityLevel: level })

    // Adjust settings based on quality level
    switch (level) {
      case 'high':
        sceneConfig.value.antialias = true
        enableShadows(true)
        break
      case 'medium':
        sceneConfig.value.antialias = true
        enableShadows(false)
        break
      case 'low':
        sceneConfig.value.antialias = false
        enableShadows(false)
        break
    }
  }

  const loadModel = async (id: string, path: string): Promise<void> => {
    try {
      await sceneStore.loadModel(id, path)
    } catch (err) {
      console.error(`Failed to load model ${id}:`, err)
      throw err
    }
  }

  const unloadModel = (id: string): void => {
    sceneStore.unloadModel(id)
  }

  const handleResize = (): void => {
    if (!config.autoResize) return

    // This would typically update the renderer size and camera aspect ratio
    // In a real implementation, this would interface with the Three.js renderer
    console.log('Scene resized')
  }

  const optimizeForDevice = async (): Promise<void> => {
    try {
      // Collect device information
      await performanceStore.collectDeviceInfo()
      
      const deviceInfo = performanceStore.deviceInfo

      // Adjust quality based on device capabilities
      if (deviceInfo.memory < 4) {
        // Low memory device
        setQualityLevel('low')
        console.log('Applied low quality settings for limited memory device')
      } else if (deviceInfo.memory < 8) {
        // Medium memory device
        setQualityLevel('medium')
        console.log('Applied medium quality settings for average device')
      } else {
        // High memory device
        setQualityLevel('high')
        console.log('Applied high quality settings for powerful device')
      }

      // Adjust based on pixel ratio
      if (deviceInfo.pixelRatio > 2) {
        // High DPI display - might need texture quality adjustment
        console.log('High DPI display detected')
      }

      // Adjust based on GPU capabilities
      if (!deviceInfo.supportsWebGL2) {
        console.warn('WebGL2 not supported, falling back to WebGL1')
        setQualityLevel('low')
      }

    } catch (err) {
      console.warn('Failed to optimize for device:', err)
    }
  }

  const cleanup = (): void => {
    sceneStore.cleanup()
    isReady.value = false
    isLoading.value = false
    error.value = null
  }

  // Lifecycle
  onMounted(async () => {
    // Set up resize listener
    if (config.autoResize) {
      window.addEventListener('resize', handleResize)
    }

    // Initialize the scene
    await initializeScene()

    // Optimize for the current device
    await optimizeForDevice()
  })

  onUnmounted(() => {
    if (config.autoResize) {
      window.removeEventListener('resize', handleResize)
    }
    cleanup()
  })

  return {
    // State
    isReady,
    isLoading,
    error,
    sceneContainer,
    sceneConfig,
    cameraConfig,
    lightingConfig,
    
    // Computed
    isSceneLoaded,
    currentPerformance,
    
    // Methods
    initializeScene,
    updateCameraPosition,
    updateCameraFOV,
    setEnvironmentMap,
    updateLightIntensity,
    enableShadows,
    setQualityLevel,
    loadModel,
    unloadModel,
    handleResize,
    optimizeForDevice,
    cleanup
  }
}
