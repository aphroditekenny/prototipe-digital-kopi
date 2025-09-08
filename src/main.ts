import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/main.css'

// Performance monitoring setup
import { usePerformanceMonitor } from '@/composables/usePerformanceMonitor'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Initialize performance monitoring in development
if (import.meta.env.DEV) {
  const { initializeMonitoring } = usePerformanceMonitor()
  initializeMonitoring()
}

app.mount('#app')