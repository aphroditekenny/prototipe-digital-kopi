import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PerformanceState, PerformanceActions, PerformanceGetters } from '@/types/stores'
import type { PerformanceMetrics, PerformanceBudget, PerformanceAlert, DeviceInfo } from '@/types/stores'

export const usePerformanceStore = defineStore('performance', () => {
  // State
  const isMonitoring = ref(false)
  
  const currentMetrics = ref<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    textureMemory: 0,
    geometryMemory: 0
  })

  const budget = ref<PerformanceBudget>({
    maxTriangles: 50000,
    maxDrawCalls: 200,
    maxTextureSize: 2048,
    targetFPS: 60,
    maxMemoryUsage: 512
  })

  const history = ref<PerformanceMetrics[]>([])
  const alerts = ref<PerformanceAlert[]>([])
  
  const settings = ref({
    enabled: true,
    historySize: 100,
    alertThresholds: {
      maxTriangles: 45000,
      maxDrawCalls: 180,
      targetFPS: 55,
      maxMemoryUsage: 400
    },
    autoOptimize: false,
    reportingInterval: 1000
  })

  const deviceInfo = ref<DeviceInfo>({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    gpu: 'Unknown',
    cpuCores: navigator.hardwareConcurrency || 4,
    memory: (navigator as any).deviceMemory || 4,
    screenSize: { 
      width: window.screen.width, 
      height: window.screen.height 
    },
    pixelRatio: window.devicePixelRatio || 1,
    supportsWebGL2: !!document.createElement('canvas').getContext('webgl2'),
    supportsWebGPU: 'gpu' in navigator,
    maxTextureSize: 2048
  })

  let monitoringInterval: number | null = null

  // Actions
  const startMonitoring = (): void => {
    if (isMonitoring.value) return
    
    isMonitoring.value = true
    
    monitoringInterval = window.setInterval(() => {
      updateMetrics({
        fps: Math.floor(Math.random() * 10) + 55, // Simulated
        frameTime: 16.67,
        drawCalls: Math.floor(Math.random() * 50) + 10,
        triangles: Math.floor(Math.random() * 10000) + 5000,
        memoryUsage: Math.floor(Math.random() * 100) + 50,
        textureMemory: Math.floor(Math.random() * 50) + 25,
        geometryMemory: Math.floor(Math.random() * 30) + 15
      })
    }, settings.value.reportingInterval)
  }

  const stopMonitoring = (): void => {
    if (!isMonitoring.value) return
    
    isMonitoring.value = false
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
  }

  const updateMetrics = (metrics: Partial<PerformanceMetrics>): void => {
    currentMetrics.value = { ...currentMetrics.value, ...metrics }
    
    // Add to history
    history.value.push({ ...currentMetrics.value })
    
    // Limit history size
    if (history.value.length > settings.value.historySize) {
      history.value.shift()
    }
    
    // Check for alerts
    checkPerformanceAlerts()
  }

  const setBudget = (newBudget: Partial<PerformanceBudget>): void => {
    budget.value = { ...budget.value, ...newBudget }
  }

  const addAlert = (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void => {
    const newAlert: PerformanceAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      resolved: false
    }
    alerts.value.push(newAlert)
  }

  const resolveAlert = (alertId: string): void => {
    const alert = alerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  const clearHistory = (): void => {
    history.value = []
  }

  const updateSettings = (newSettings: Partial<typeof settings.value>): void => {
    settings.value = { ...settings.value, ...newSettings }
  }

  const collectDeviceInfo = async (): Promise<void> => {
    try {
      // Collect GPU info if available
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          deviceInfo.value.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown'
        }
        
        deviceInfo.value.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048
      }
      
      // Additional device memory info
      if ('deviceMemory' in navigator) {
        deviceInfo.value.memory = (navigator as any).deviceMemory
      }
    } catch (error) {
      console.warn('Could not collect complete device info:', error)
    }
  }

  const checkPerformanceAlerts = (): void => {
    const thresholds = settings.value.alertThresholds
    
    // Check FPS
    if (currentMetrics.value.fps < (thresholds.targetFPS || 55)) {
      addAlert({
        type: 'warning',
        metric: 'fps',
        threshold: thresholds.targetFPS || 55,
        currentValue: currentMetrics.value.fps
      })
    }
    
    // Check draw calls
    if (currentMetrics.value.drawCalls > (thresholds.maxDrawCalls || 180)) {
      addAlert({
        type: 'warning',
        metric: 'drawCalls',
        threshold: thresholds.maxDrawCalls || 180,
        currentValue: currentMetrics.value.drawCalls
      })
    }
    
    // Check memory usage
    if (currentMetrics.value.memoryUsage > (thresholds.maxMemoryUsage || 400)) {
      addAlert({
        type: 'error',
        metric: 'memoryUsage',
        threshold: thresholds.maxMemoryUsage || 400,
        currentValue: currentMetrics.value.memoryUsage
      })
    }
  }

  // Getters
  const currentFPS = computed((): number => currentMetrics.value.fps)
  
  const isPerformant = computed((): boolean => {
    return currentMetrics.value.fps >= budget.value.targetFPS &&
           currentMetrics.value.drawCalls <= budget.value.maxDrawCalls &&
           currentMetrics.value.memoryUsage <= budget.value.maxMemoryUsage
  })

  const criticalAlerts = computed((): PerformanceAlert[] => {
    return alerts.value.filter(alert => alert.type === 'error' && !alert.resolved)
  })

  const averageMetrics = computed((): PerformanceMetrics => {
    if (history.value.length === 0) return currentMetrics.value
    
    const avg = history.value.reduce((acc, metrics) => ({
      fps: acc.fps + metrics.fps,
      frameTime: acc.frameTime + metrics.frameTime,
      drawCalls: acc.drawCalls + metrics.drawCalls,
      triangles: acc.triangles + metrics.triangles,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      textureMemory: acc.textureMemory + metrics.textureMemory,
      geometryMemory: acc.geometryMemory + metrics.geometryMemory
    }), {
      fps: 0, frameTime: 0, drawCalls: 0, triangles: 0,
      memoryUsage: 0, textureMemory: 0, geometryMemory: 0
    })

    const len = history.value.length
    return {
      fps: Math.round(avg.fps / len),
      frameTime: Math.round((avg.frameTime / len) * 100) / 100,
      drawCalls: Math.round(avg.drawCalls / len),
      triangles: Math.round(avg.triangles / len),
      memoryUsage: Math.round(avg.memoryUsage / len),
      textureMemory: Math.round(avg.textureMemory / len),
      geometryMemory: Math.round(avg.geometryMemory / len)
    }
  })

  const memoryUsagePercentage = computed((): number => {
    return Math.round((currentMetrics.value.memoryUsage / budget.value.maxMemoryUsage) * 100)
  })

  const exceedsThreshold = (metric: keyof PerformanceMetrics): boolean => {
    const current = currentMetrics.value[metric]
    const threshold = settings.value.alertThresholds[metric as keyof typeof settings.value.alertThresholds]
    
    if (typeof current === 'number' && typeof threshold === 'number') {
      return metric === 'fps' ? current < threshold : current > threshold
    }
    
    return false
  }

  return {
    // State
    isMonitoring,
    currentMetrics,
    budget,
    history,
    alerts,
    settings,
    deviceInfo,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    setBudget,
    addAlert,
    resolveAlert,
    clearHistory,
    updateSettings,
    collectDeviceInfo,
    
    // Getters
    currentFPS,
    isPerformant,
    criticalAlerts,
    averageMetrics,
    memoryUsagePercentage,
    exceedsThreshold
  }
})
