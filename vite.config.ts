import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { templateCompilerOptions } from '@tresjs/core'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@composables': resolve(__dirname, 'src/composables'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  server: {
    port: 3000,
    hmr: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'tres': ['@tresjs/core', '@tresjs/cientos'],
          'gsap': ['gsap'],
          'vue-vendor': ['vue', 'pinia']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'three',
      '@tresjs/core',
      '@tresjs/cientos',
      'gsap'
    ]
  },
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})