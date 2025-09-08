<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-coffee-900 via-coffee-800 to-coffee-700">
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0 bg-repeat" style="background-image: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.1"><circle cx="30" cy="30" r="2"/></g></svg>')"></div>
    </div>

    <div class="relative z-10 text-center">
      <!-- Logo/Brand -->
      <div class="mb-8">
        <h1 class="text-4xl md:text-6xl font-bold text-cream-100 mb-2">
          KopiKala
        </h1>
        <p class="text-cream-300 text-lg md:text-xl font-medium">
          Immersive Coffee Experience
        </p>
      </div>

      <!-- Loading animation -->
      <div class="mb-8">
        <div class="relative w-24 h-24 mx-auto">
          <!-- Outer rotating ring -->
          <div class="absolute inset-0 border-4 border-cream-400 border-opacity-20 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-transparent border-t-cream-400 rounded-full animate-spin"></div>
          
          <!-- Coffee cup icon in center -->
          <div class="absolute inset-0 flex items-center justify-center">
            <svg class="w-8 h-8 text-cream-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 21h16c1.1 0 2-.9 2-2V5H2v14c0 1.1.9 2 2 2zm3.5-13h11l-11 11V8zm13.5-4H3c-.55 0-1 .45-1 1s.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Loading progress -->
      <div class="w-64 mx-auto mb-6">
        <div class="flex justify-between text-sm text-cream-300 mb-2">
          <span>{{ currentTask }}</span>
          <span>{{ progress }}%</span>
        </div>
        <div class="w-full bg-coffee-600 bg-opacity-50 rounded-full h-2">
          <div 
            class="bg-gradient-to-r from-cream-400 to-cream-300 h-2 rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>

      <!-- Loading tasks -->
      <div class="text-cream-400 text-sm space-y-1">
        <div 
          v-for="task in loadingTasks" 
          :key="task.id"
          class="flex items-center justify-center space-x-2"
          :class="{ 'text-cream-200': task.completed, 'text-cream-500': !task.active && !task.completed }"
        >
          <div class="w-4 h-4 flex items-center justify-center">
            <div v-if="task.completed" class="text-green-400">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div v-else-if="task.active" class="w-2 h-2 bg-cream-300 rounded-full animate-pulse"></div>
            <div v-else class="w-2 h-2 bg-cream-600 rounded-full"></div>
          </div>
          <span>{{ task.name }}</span>
        </div>
      </div>

      <!-- Performance tip -->
      <div class="mt-8 text-cream-400 text-xs max-w-sm mx-auto">
        <p>💡 Tip: For the best experience, use a device with dedicated graphics.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface LoadingTask {
  id: string
  name: string
  active: boolean
  completed: boolean
  duration: number
}

// Props
interface Props {
  progress?: number
  currentTask?: string
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  currentTask: 'Initializing...'
})

// Loading tasks simulation
const loadingTasks = ref<LoadingTask[]>([
  { id: '1', name: 'Loading 3D Engine', active: false, completed: false, duration: 1000 },
  { id: '2', name: 'Initializing Scene', active: false, completed: false, duration: 800 },
  { id: '3', name: 'Loading Assets', active: false, completed: false, duration: 1200 },
  { id: '4', name: 'Optimizing Performance', active: false, completed: false, duration: 600 },
  { id: '5', name: 'Setting up Interactions', active: false, completed: false, duration: 400 },
  { id: '6', name: 'Ready to Explore', active: false, completed: false, duration: 200 }
])

const internalProgress = ref(0)
const internalCurrentTask = ref('Starting up...')

// Use internal values if no props provided (for standalone testing)
const progress = computed(() => props.progress || internalProgress.value)
const currentTask = computed(() => props.currentTask || internalCurrentTask.value)

// Simulate loading process for demo
onMounted(() => {
  if (!props.progress && !props.currentTask) {
    simulateLoading()
  }
})

const simulateLoading = async () => {
  let currentProgress = 0
  const totalTasks = loadingTasks.value.length
  
  for (let i = 0; i < totalTasks; i++) {
    const task = loadingTasks.value[i]
    
    // Mark task as active
    task.active = true
    internalCurrentTask.value = task.name
    
    // Simulate task duration
    const increment = 100 / totalTasks
    const startProgress = currentProgress
    const endProgress = Math.min(100, currentProgress + increment)
    
    // Animate progress
    const animationDuration = task.duration
    const steps = 20
    const stepDuration = animationDuration / steps
    const progressStep = (endProgress - startProgress) / steps
    
    for (let step = 0; step < steps; step++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      internalProgress.value = Math.min(100, startProgress + (progressStep * (step + 1)))
    }
    
    // Mark task as completed
    task.active = false
    task.completed = true
    currentProgress = endProgress
    
    // Small delay between tasks
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Final completion
  internalProgress.value = 100
  internalCurrentTask.value = 'Ready!'
  
  // Emit completion event
  setTimeout(() => {
    // In a real app, this would trigger the main app to show
    console.log('Loading completed!')
  }, 500)
}
</script>

<style scoped>
/* Additional custom animations */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.float {
  animation: float 3s ease-in-out infinite;
}

/* Coffee steam animation */
@keyframes steam {
  0% {
    transform: translateY(0) scaleY(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-20px) scaleY(0.5);
    opacity: 0;
  }
}

.steam {
  animation: steam 2s ease-out infinite;
}
</style>
