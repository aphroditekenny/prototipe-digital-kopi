<template>
  <div id="app" class="w-full h-screen overflow-hidden">
    <!-- Loading Screen Component -->
    <LoadingScreen v-if="isLoading" />
    
    <!-- Main Application Layout -->
    <div v-else class="relative w-full h-full">
      <!-- 3D Canvas Container -->
      <div class="absolute inset-0 z-0">
        <MainScene />
      </div>
      
      <!-- UI Overlay -->
      <div class="absolute inset-0 z-10 pointer-events-none">
        <ResponsiveNavigation class="pointer-events-auto" />
        
        <div class="flex h-full">
          <!-- Left Panel - Product Selector -->
          <div class="w-80 h-full pointer-events-auto">
            <ProductSelector />
          </div>
          
          <!-- Right Panel - Color Picker & Controls -->
          <div class="flex-1" />
          <div class="w-80 h-full pointer-events-auto">
            <ColorPicker />
          </div>
        </div>
      </div>
      
      <!-- Performance Monitor (Dev Only) -->
      <PerformanceMonitor v-if="isDev" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSceneStore } from '@/stores/scene'
import { usePerformanceStore } from '@/stores/performance'

// Components
import LoadingScreen from '@/components/ui/LoadingScreen.vue'
import ResponsiveNavigation from '@/components/ui/ResponsiveNavigation.vue'
import ProductSelector from '@/components/ui/ProductSelector.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import MainScene from '@/components/3d/scenes/MainScene.vue'
import PerformanceMonitor from '@/components/shared/PerformanceMonitor.vue'

// Stores
const sceneStore = useSceneStore()
const performanceStore = usePerformanceStore()

// Reactive state
const { isLoading } = storeToRefs(sceneStore)
const isDev = import.meta.env.DEV

// Lifecycle
onMounted(async () => {
  // Initialize application
  await sceneStore.initialize()
  
  // Start performance monitoring
  performanceStore.startMonitoring()
})
</script>

<style scoped>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>