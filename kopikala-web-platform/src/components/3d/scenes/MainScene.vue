<template>
  <div class="relative w-full h-full">
    <!-- TresJS Canvas -->
    <TresCanvas
      ref="canvasRef"
      v-bind="canvasConfig"
      class="w-full h-full"
      @ready="onCanvasReady"
    >
      <!-- Scene Content -->
      <TresScene>
        <!-- Camera -->
        <TresPerspectiveCamera
          ref="cameraRef"
          :fov="camera.fov"
          :near="camera.near"
          :far="camera.far"
          :position="camera.position"
        />

        <!-- Lighting Setup -->
        <TresAmbientLight
          :color="lighting.ambient.color"
          :intensity="lighting.ambient.intensity"
        />
        
        <TresDirectionalLight
          :color="lighting.directional.color"
          :intensity="lighting.directional.intensity"
          :position="lighting.directional.position"
          :cast-shadow="lighting.directional.castShadow"
          :shadow-camera-top="10"
          :shadow-camera-bottom="-10"
          :shadow-camera-left="-10"
          :shadow-camera-right="10"
          :shadow-camera-near="0.1"
          :shadow-camera-far="50"
          :shadow-mapSize-width="2048"
          :shadow-mapSize-height="2048"
        />

        <!-- Environment -->
        <TresGroup name="environment">
          <!-- Coffee Shop Environment -->
          <CoffeeEnvironment v-if="environment === 'coffee-shop'" />
          
          <!-- Studio Environment (default) -->
          <Suspense v-else>
            <template #default>
              <StudioEnvironment />
            </template>
            <template #fallback>
              <TresBoxGeometry :args="[10, 0.1, 10]" />
              <TresMeshStandardMaterial color="#f0f0f0" />
            </template>
          </Suspense>
        </TresGroup>

        <!-- Product Display Area -->
        <TresGroup name="products" :position="[0, 0, 0]">
          <Suspense>
            <template #default>
              <ProductViewer
                v-if="selectedProduct"
                :product="selectedProduct"
                :variant="selectedVariant"
                :color="activeColor"
                :material="activeMaterial"
                @model-loaded="onModelLoaded"
                @model-error="onModelError"
              />
            </template>
            <template #fallback>
              <LoadingPlaceholder />
            </template>
          </Suspense>
        </TresGroup>

        <!-- Interactive Elements -->
        <TresGroup name="interactions">
          <!-- Ground plane for shadows -->
          <TresMesh
            :receive-shadow="true"
            :position="[0, -2, 0]"
            :rotation="[-Math.PI / 2, 0, 0]"
          >
            <TresPlaneGeometry :args="[20, 20]" />
            <TresMeshStandardMaterial
              color="#ffffff"
              :transparent="true"
              :opacity="0.1"
            />
          </TresMesh>
        </TresGroup>

        <!-- Controls -->
        <OrbitControls
          ref="controlsRef"
          v-bind="controlsConfig"
          @change="onControlsChange"
        />

        <!-- Performance Stats (Development) -->
        <Stats v-if="showStats && isDev" />
      </TresScene>
    </TresCanvas>

    <!-- Loading Overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="text-white text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading 3D Scene...</p>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="absolute top-4 right-4 bg-red-500 text-white p-4 rounded-lg max-w-sm z-50"
    >
      <h3 class="font-semibold mb-2">Scene Error</h3>
      <p class="text-sm">{{ error }}</p>
      <button
        @click="retryInitialization"
        class="mt-2 px-3 py-1 bg-white text-red-500 rounded text-sm hover:bg-gray-100"
      >
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { TresCanvas, TresScene } from '@tresjs/core'
import { 
  OrbitControls, 
  Stats,
  TresPerspectiveCamera,
  TresAmbientLight,
  TresDirectionalLight,
  TresGroup,
  TresMesh,
  TresPlaneGeometry,
  TresBoxGeometry,
  TresMeshStandardMaterial
} from '@tresjs/cientos'
import { storeToRefs } from 'pinia'
import { useSceneStore } from '@/stores/scene'
import { useProductStore } from '@/stores/products'
import { use3DScene } from '@/composables/use3DScene'
import { useGSAPAnimations } from '@/composables/useGSAPAnimations'

// Components
import ProductViewer from '../objects/ProductViewer.vue'
import CoffeeEnvironment from './CoffeeEnvironment.vue'
import StudioEnvironment from './StudioEnvironment.vue'
import LoadingPlaceholder from '../objects/LoadingPlaceholder.vue'

// Stores
const sceneStore = useSceneStore()
const productStore = useProductStore()

// Composables
const scene3D = use3DScene({
  enableShadows: true,
  antialias: true,
  powerPreference: 'high-performance'
})

const animations = useGSAPAnimations()

// Reactive references
const { isLoading, environment, renderSettings } = storeToRefs(sceneStore)
const { selectedProduct, selectedVariant, activeColor, activeMaterial } = storeToRefs(productStore)

// Component refs
const canvasRef = ref()
const cameraRef = ref()
const controlsRef = ref()

// Local state
const error = ref<string | null>(null)
const isDev = import.meta.env.DEV
const showStats = ref(isDev)

// Configuration
const canvasConfig = computed(() => ({
  shadows: renderSettings.value.shadows,
  antialias: renderSettings.value.antialias,
  alpha: true,
  powerPreference: 'high-performance',
  clearColor: '#000000',
  shadowMapType: 2, // PCFSoftShadowMap
  outputEncoding: 3001, // sRGBEncoding
  toneMapping: 4, // ACESFilmicToneMapping
  toneMappingExposure: 1.0
}))

const camera = computed(() => ({
  fov: 50,
  near: 0.1,
  far: 1000,
  position: [0, 5, 10]
}))

const lighting = computed(() => ({
  ambient: {
    color: '#ffffff',
    intensity: 0.4
  },
  directional: {
    color: '#ffffff',
    intensity: 1.0,
    position: [10, 10, 5],
    castShadow: true
  }
}))

const controlsConfig = computed(() => ({
  enableDamping: true,
  dampingFactor: 0.05,
  enableZoom: true,
  enablePan: true,
  enableRotate: true,
  minDistance: 3,
  maxDistance: 20,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI / 1.5,
  autoRotate: false,
  autoRotateSpeed: 0.5
}))

// Event handlers
const onCanvasReady = () => {
  console.log('Canvas ready')
  initializeScene()
}

const onControlsChange = () => {
  // Controls changed - could trigger performance monitoring
}

const onModelLoaded = (modelData: any) => {
  console.log('Model loaded:', modelData)
  
  // Animate model entrance
  if (modelData.object) {
    animations.scaleIn(modelData.object, {
      duration: 0.8,
      ease: 'back.out(1.7)'
    })
  }
}

const onModelError = (error: Error) => {
  console.error('Model loading error:', error)
  // Could show user-friendly error message
}

// Methods
const initializeScene = async () => {
  try {
    await scene3D.initializeScene()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize scene'
  }
}

const retryInitialization = () => {
  error.value = null
  initializeScene()
}

const focusOnProduct = () => {
  if (!cameraRef.value) return
  
  // Animate camera to focus on product
  animations.animateCamera(cameraRef.value, {
    position: { x: 2, y: 3, z: 8 },
    rotation: { x: -0.2, y: 0.2, z: 0 }
  }, {
    duration: 1.5,
    ease: 'power2.inOut'
  })
}

// Watchers
watch(selectedProduct, (newProduct) => {
  if (newProduct) {
    focusOnProduct()
  }
})

watch(activeColor, (newColor) => {
  // Color change animation could be triggered here
  console.log('Active color changed to:', newColor)
})

// Lifecycle
onMounted(async () => {
  // Initialize products if not already loaded
  if (productStore.products.length === 0) {
    await productStore.fetchProducts()
  }
})
</script>

<style scoped>
/* Ensure proper canvas sizing */
:deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* Loading spinner animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
