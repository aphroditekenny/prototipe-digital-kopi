import { ref, onMounted, onUnmounted } from 'vue'
import Stats from 'stats.js'

interface PerformanceMonitorConfig {
  showStats: boolean
  trackMemory: boolean
  trackFPS: boolean
  trackDrawCalls: boolean
  alertThresholds: {
    fps: number
    memory: number
    drawCalls: number
  }
}

export function usePerformanceMonitor(config?: Partial<PerformanceMonitorConfig>) {
  const defaultConfig: PerformanceMonitorConfig = {
    showStats: true,
    trackMemory: true,
    trackFPS: true,
    trackDrawCalls: true,
    alertThresholds: {
      fps: 55,
      memory: 400,
      drawCalls: 200
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  
  // Reactive state
  const isMonitoring = ref(false)
  const currentFPS = ref(60)
  const currentMemory = ref(0)
  const currentDrawCalls = ref(0)
  const alerts = ref<string[]>([])
  
  // Stats.js instance
  let stats: Stats | null = null
  let monitoringInterval: number | null = null

  const initializeMonitoring = (): void => {
    if (typeof window === 'undefined') return

    try {
      // Initialize stats.js
      if (finalConfig.showStats) {
        stats = new Stats()
        stats.showPanel(0) // 0: fps, 1: ms, 2: mb
        
        // Style the stats panel
        stats.dom.style.position = 'fixed'
        stats.dom.style.left = '10px'
        stats.dom.style.top = '10px'
        stats.dom.style.zIndex = '9999'
        
        document.body.appendChild(stats.dom)
      }

      startMonitoring()
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error)
    }
  }

  const startMonitoring = (): void => {
    if (isMonitoring.value) return

    isMonitoring.value = true

    // Start the monitoring loop
    monitoringInterval = window.setInterval(() => {
      updateMetrics()
      checkAlerts()
    }, 1000) // Update every second

    console.log('Performance monitoring started')
  }

  const stopMonitoring = (): void => {
    if (!isMonitoring.value) return

    isMonitoring.value = false

    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }

    console.log('Performance monitoring stopped')
  }

  const updateMetrics = (): void => {
    try {
      // Update FPS (from stats.js if available)
      if (stats && finalConfig.trackFPS) {
        // Stats.js tracks FPS automatically
        const fps = parseInt(stats.dom.children[0].children[0].children[1].innerHTML)
        if (!isNaN(fps)) {
          currentFPS.value = fps
        }
      }

      // Update memory usage
      if (finalConfig.trackMemory && 'memory' in performance) {
        const memInfo = (performance as any).memory
        if (memInfo) {
          currentMemory.value = Math.round(memInfo.usedJSHeapSize / 1024 / 1024)
        }
      }

      // Update draw calls (would need to be provided by the renderer)
      // This is a simplified simulation
      if (finalConfig.trackDrawCalls) {
        // In a real implementation, this would come from the Three.js renderer
        currentDrawCalls.value = Math.floor(Math.random() * 50) + 10
      }
    } catch (error) {
      console.warn('Error updating performance metrics:', error)
    }
  }

  const checkAlerts = (): void => {
    const newAlerts: string[] = []

    // Check FPS threshold
    if (finalConfig.trackFPS && currentFPS.value < finalConfig.alertThresholds.fps) {
      newAlerts.push(`Low FPS: ${currentFPS.value} (threshold: ${finalConfig.alertThresholds.fps})`)
    }

    // Check memory threshold
    if (finalConfig.trackMemory && currentMemory.value > finalConfig.alertThresholds.memory) {
      newAlerts.push(`High Memory: ${currentMemory.value}MB (threshold: ${finalConfig.alertThresholds.memory}MB)`)
    }

    // Check draw calls threshold
    if (finalConfig.trackDrawCalls && currentDrawCalls.value > finalConfig.alertThresholds.drawCalls) {
      newAlerts.push(`High Draw Calls: ${currentDrawCalls.value} (threshold: ${finalConfig.alertThresholds.drawCalls})`)
    }

    alerts.value = newAlerts
  }

  const getPerformanceReport = () => {
    return {
      fps: currentFPS.value,
      memory: currentMemory.value,
      drawCalls: currentDrawCalls.value,
      alerts: alerts.value,
      timestamp: new Date().toISOString()
    }
  }

  const cleanup = (): void => {
    stopMonitoring()
    
    if (stats && stats.dom.parentNode) {
      stats.dom.parentNode.removeChild(stats.dom)
      stats = null
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    if (import.meta.env.DEV) {
      initializeMonitoring()
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isMonitoring,
    currentFPS,
    currentMemory,
    currentDrawCalls,
    alerts,
    
    // Methods
    initializeMonitoring,
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    getPerformanceReport,
    cleanup
  }
}
