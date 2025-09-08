#!/usr/bin/env node

/**
 * Post-build Optimization Script
 * 
 * This script performs post-build optimizations for the KopiKala platform:
 * - Analyzes bundle sizes and validates budgets
 * - Optimizes static assets
 * - Generates performance reports
 * - Creates deployment-ready artifacts
 * - Validates WebGL resources
 * 
 * Usage: node postbuild-optimization.js [build-dir]
 */

import { readdir, stat, writeFile, copyFile, mkdir } from 'fs/promises'
import { join, extname, basename } from 'path'
import { gzipSync, brotliCompressSync } from 'zlib'
import { readFileSync } from 'fs'

const BUILD_BUDGETS = {
  // Bundle size budgets (gzipped)
  maxMainBundle: 1 * 1024 * 1024,     // 1MB main bundle
  maxVendorBundle: 500 * 1024,        // 500KB vendor bundle
  maxCSSBundle: 200 * 1024,           // 200KB CSS bundle
  maxAssetBundle: 2 * 1024 * 1024,    // 2MB asset bundle
  
  // Total build size
  maxTotalBuild: 10 * 1024 * 1024,    // 10MB total build
  
  // Compression ratios
  minGzipRatio: 0.3,                  // At least 70% compression
  minBrotliRatio: 0.25,               // At least 75% compression
  
  // Performance targets
  maxFirstContentfulPaint: 1500,      // 1.5s FCP
  maxLargestContentfulPaint: 2500,    // 2.5s LCP
  maxCumulativeLayoutShift: 0.1       // CLS < 0.1
}

class PostBuildOptimizer {
  constructor(buildDir = 'dist') {
    this.buildDir = buildDir
    this.optimizations = []
    this.warnings = []
    this.errors = []
    this.stats = {
      totalSize: 0,
      gzippedSize: 0,
      brotliSize: 0,
      bundleCount: 0,
      assetCount: 0,
      compressionRatio: 0
    }
    this.bundles = new Map()
  }

  async optimize() {
    console.log('🚀 Starting post-build optimization...')
    console.log(`📁 Build directory: ${this.buildDir}`)
    console.log('🎯 Performance Budgets:')
    console.log(`   Max main bundle: ${this.formatBytes(BUILD_BUDGETS.maxMainBundle)}`)
    console.log(`   Max vendor bundle: ${this.formatBytes(BUILD_BUDGETS.maxVendorBundle)}`)
    console.log(`   Max total build: ${this.formatBytes(BUILD_BUDGETS.maxTotalBuild)}`)
    console.log('')

    try {
      await this.analyzeBundles()
      await this.validateBudgets()
      await this.compressAssets()
      await this.optimizeWebGLAssets()
      await this.generateServiceWorker()
      await this.createPerformanceReport()
      await this.generateDeploymentManifest()

      this.printResults()
      
      // Exit with error if critical issues found
      if (this.errors.length > 0) {
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ Post-build optimization failed:', error.message)
      process.exit(1)
    }
  }

  async analyzeBundles() {
    console.log('📊 Analyzing build bundles...')
    
    const files = await this.findFiles(this.buildDir, ['.js', '.css', '.wasm', '.glb'])
    
    for (const file of files) {
      const stats = await stat(file)
      const filename = basename(file)
      const ext = extname(file)
      
      // Categorize bundles
      let category = 'other'
      if (filename.includes('vendor') || filename.includes('chunk')) {
        category = 'vendor'
      } else if (filename.includes('main') || filename.includes('app')) {
        category = 'main'
      } else if (ext === '.css') {
        category = 'css'
      } else if (ext === '.glb' || ext === '.wasm') {
        category = 'assets'
      }

      this.bundles.set(file, {
        size: stats.size,
        category: category,
        filename: filename,
        path: file
      })

      this.stats.totalSize += stats.size
      this.stats.bundleCount++
    }

    console.log(`   📦 Found ${this.stats.bundleCount} build artifacts`)
    console.log(`   📏 Total build size: ${this.formatBytes(this.stats.totalSize)}`)
  }

  async validateBudgets() {
    console.log('🎯 Validating performance budgets...')
    
    // Group bundles by category
    const categories = {
      main: [],
      vendor: [],
      css: [],
      assets: [],
      other: []
    }

    for (const [path, info] of this.bundles) {
      categories[info.category].push(info)
    }

    // Check each category
    await this.checkCategoryBudget('main', categories.main, BUILD_BUDGETS.maxMainBundle)
    await this.checkCategoryBudget('vendor', categories.vendor, BUILD_BUDGETS.maxVendorBundle)
    await this.checkCategoryBudget('css', categories.css, BUILD_BUDGETS.maxCSSBundle)
    await this.checkCategoryBudget('assets', categories.assets, BUILD_BUDGETS.maxAssetBundle)

    // Check total build size
    if (this.stats.totalSize <= BUILD_BUDGETS.maxTotalBuild) {
      this.addOptimization(`✅ Total build size within budget: ${this.formatBytes(this.stats.totalSize)}`)
    } else {
      this.addError(`❌ Total build exceeds budget: ${this.formatBytes(this.stats.totalSize)} > ${this.formatBytes(BUILD_BUDGETS.maxTotalBuild)}`)
    }
  }

  async checkCategoryBudget(category, bundles, budget) {
    if (bundles.length === 0) return

    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0)
    
    if (totalSize <= budget) {
      this.addOptimization(`✅ ${category} bundles within budget: ${this.formatBytes(totalSize)}`)
    } else {
      this.addError(`❌ ${category} bundles exceed budget: ${this.formatBytes(totalSize)} > ${this.formatBytes(budget)}`)
      
      // List oversized bundles
      const oversized = bundles.filter(bundle => bundle.size > budget / 2)
      if (oversized.length > 0) {
        console.log(`     Large ${category} files:`)
        oversized.forEach(bundle => {
          console.log(`       ${bundle.filename}: ${this.formatBytes(bundle.size)}`)
        })
      }
    }
  }

  async compressAssets() {
    console.log('🗜️  Compressing assets...')
    
    const compressibleFiles = Array.from(this.bundles.keys()).filter(file => {
      const ext = extname(file)
      return ['.js', '.css', '.html', '.json', '.svg'].includes(ext)
    })

    let totalOriginalSize = 0
    let totalGzippedSize = 0
    let totalBrotliSize = 0

    for (const file of compressibleFiles) {
      try {
        const content = readFileSync(file)
        const originalSize = content.length
        
        // Gzip compression
        const gzipped = gzipSync(content, { level: 9 })
        const gzippedSize = gzipped.length
        
        // Brotli compression
        const brotli = brotliCompressSync(content, {
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11
          }
        })
        const brotliSize = brotli.length

        // Save compressed versions
        await writeFile(`${file}.gz`, gzipped)
        await writeFile(`${file}.br`, brotli)

        totalOriginalSize += originalSize
        totalGzippedSize += gzippedSize
        totalBrotliSize += brotliSize

        // Log compression ratios for large files
        if (originalSize > 100 * 1024) { // > 100KB
          const gzipRatio = gzippedSize / originalSize
          const brotliRatio = brotliSize / originalSize
          console.log(`   📦 ${basename(file)}: ${this.formatBytes(originalSize)} → gzip: ${this.formatBytes(gzippedSize)} (${Math.round(gzipRatio * 100)}%) → br: ${this.formatBytes(brotliSize)} (${Math.round(brotliRatio * 100)}%)`)
        }

      } catch (error) {
        this.addWarning(`⚠️  Failed to compress ${basename(file)}: ${error.message}`)
      }
    }

    this.stats.gzippedSize = totalGzippedSize
    this.stats.brotliSize = totalBrotliSize
    this.stats.compressionRatio = totalBrotliSize / totalOriginalSize

    console.log(`   📊 Compression summary:`)
    console.log(`      Original: ${this.formatBytes(totalOriginalSize)}`)
    console.log(`      Gzipped: ${this.formatBytes(totalGzippedSize)} (${Math.round((totalGzippedSize / totalOriginalSize) * 100)}%)`)
    console.log(`      Brotli: ${this.formatBytes(totalBrotliSize)} (${Math.round((totalBrotliSize / totalOriginalSize) * 100)}%)`)

    if (this.stats.compressionRatio <= BUILD_BUDGETS.minBrotliRatio) {
      this.addOptimization('✅ Good compression ratio achieved')
    } else {
      this.addWarning('⚠️  Compression ratio could be improved')
    }
  }

  async optimizeWebGLAssets() {
    console.log('🎮 Optimizing WebGL assets...')
    
    // Find WebGL-related files
    const webglFiles = Array.from(this.bundles.keys()).filter(file => {
      const filename = basename(file).toLowerCase()
      return filename.includes('draco') || 
             filename.includes('basis') || 
             extname(file) === '.wasm' ||
             extname(file) === '.glb'
    })

    if (webglFiles.length === 0) {
      this.addWarning('⚠️  No WebGL assets found')
      return
    }

    let totalWebGLSize = 0
    const webglAssets = []

    for (const file of webglFiles) {
      const stats = await stat(file)
      totalWebGLSize += stats.size
      
      webglAssets.push({
        file: basename(file),
        size: stats.size,
        type: this.getWebGLAssetType(file)
      })
    }

    console.log(`   🎯 WebGL Assets (${webglAssets.length} files, ${this.formatBytes(totalWebGLSize)}):`)
    webglAssets.forEach(asset => {
      console.log(`      ${asset.type}: ${asset.file} (${this.formatBytes(asset.size)})`)
    })

    // Validate critical WebGL assets
    const requiredAssets = [
      'basis_transcoder.js',
      'basis_transcoder.wasm',
      'draco_decoder.js',
      'draco_decoder.wasm'
    ]

    const foundAssets = webglAssets.map(asset => asset.file.toLowerCase())
    const missingAssets = requiredAssets.filter(required => 
      !foundAssets.some(found => found.includes(required.replace('.', '').split('_')[0]))
    )

    if (missingAssets.length === 0) {
      this.addOptimization('✅ All required WebGL decoders present')
    } else {
      this.addError(`❌ Missing WebGL decoders: ${missingAssets.join(', ')}`)
    }
  }

  getWebGLAssetType(filename) {
    const name = basename(filename).toLowerCase()
    if (name.includes('basis')) return 'Basis Universal'
    if (name.includes('draco')) return 'Draco Compression'
    if (extname(filename) === '.glb') return '3D Model'
    if (extname(filename) === '.wasm') return 'WebAssembly'
    return 'Other'
  }

  async generateServiceWorker() {
    console.log('💾 Generating service worker...')
    
    try {
      const swContent = `// Auto-generated Service Worker for KopiKala
// Generated at: ${new Date().toISOString()}

const CACHE_NAME = 'kopikala-v${Date.now()}'
const STATIC_CACHE = 'kopikala-static-v1'
const DYNAMIC_CACHE = 'kopikala-dynamic-v1'

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  // Add critical CSS and JS files
  ${Array.from(this.bundles.keys())
    .filter(file => {
      const bundle = this.bundles.get(file)
      return bundle.category === 'main' || bundle.category === 'css'
    })
    .map(file => `'${file.replace(this.buildDir, '')}'`)
    .join(',\n  ')}
]

// WebGL assets for 3D functionality
const WEBGL_ASSETS = [
  '/basis/basis_transcoder.js',
  '/basis/basis_transcoder.wasm',
  '/draco/draco_decoder.js',
  '/draco/draco_decoder.wasm'
]

// Install event - cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll([...CRITICAL_ASSETS, ...WEBGL_ASSETS]))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Handle 3D assets with special caching strategy
  if (url.pathname.includes('.glb') || url.pathname.includes('.wasm')) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) return response
        
        return fetch(request).then(response => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Default strategy: cache first, fallback to network
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(response => {
        if (response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
    })
  )
})

// Background sync for analytics
self.addEventListener('sync', event => {
  if (event.tag === 'performance-metrics') {
    event.waitUntil(syncPerformanceMetrics())
  }
})

async function syncPerformanceMetrics() {
  // Send cached performance metrics when online
  try {
    const cache = await caches.open(DYNAMIC_CACHE)
    const metricsRequests = await cache.keys()
    const metrics = metricsRequests.filter(req => req.url.includes('/analytics'))
    
    for (const metricRequest of metrics) {
      try {
        await fetch(metricRequest)
        await cache.delete(metricRequest)
      } catch (error) {
        console.log('Failed to sync metric:', error)
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error)
  }
}`

      await writeFile(join(this.buildDir, 'sw.js'), swContent)
      this.addOptimization('✅ Service worker generated with 3D asset caching')

    } catch (error) {
      this.addWarning(`⚠️  Failed to generate service worker: ${error.message}`)
    }
  }

  async createPerformanceReport() {
    console.log('📊 Creating performance report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      buildStats: {
        totalSize: this.stats.totalSize,
        gzippedSize: this.stats.gzippedSize,
        brotliSize: this.stats.brotliSize,
        compressionRatio: this.stats.compressionRatio,
        bundleCount: this.stats.bundleCount
      },
      budgetCompliance: {
        totalBudget: BUILD_BUDGETS.maxTotalBuild,
        totalActual: this.stats.totalSize,
        budgetUtilization: (this.stats.totalSize / BUILD_BUDGETS.maxTotalBuild) * 100,
        withinBudget: this.stats.totalSize <= BUILD_BUDGETS.maxTotalBuild
      },
      bundleAnalysis: {},
      optimizations: this.optimizations,
      warnings: this.warnings,
      errors: this.errors,
      recommendations: this.generateRecommendations()
    }

    // Add bundle breakdown
    const categories = ['main', 'vendor', 'css', 'assets']
    for (const category of categories) {
      const categoryBundles = Array.from(this.bundles.values()).filter(b => b.category === category)
      const totalSize = categoryBundles.reduce((sum, b) => sum + b.size, 0)
      
      report.bundleAnalysis[category] = {
        count: categoryBundles.length,
        totalSize: totalSize,
        files: categoryBundles.map(b => ({ name: b.filename, size: b.size }))
      }
    }

    await writeFile(
      join(this.buildDir, 'performance-report.json'), 
      JSON.stringify(report, null, 2)
    )

    this.addOptimization('✅ Performance report generated')
  }

  generateRecommendations() {
    const recommendations = []

    if (this.stats.compressionRatio > BUILD_BUDGETS.minBrotliRatio) {
      recommendations.push('Consider enabling more aggressive bundling to improve compression ratios')
    }

    if (this.stats.totalSize > BUILD_BUDGETS.maxTotalBuild * 0.8) {
      recommendations.push('Build size approaching budget limit - consider asset optimization')
    }

    const mainBundles = Array.from(this.bundles.values()).filter(b => b.category === 'main')
    const largeMainBundles = mainBundles.filter(b => b.size > BUILD_BUDGETS.maxMainBundle * 0.5)
    if (largeMainBundles.length > 0) {
      recommendations.push('Consider code splitting for large main bundles')
    }

    if (this.errors.length > 0) {
      recommendations.push('Fix budget violations before deploying to production')
    }

    return recommendations
  }

  async generateDeploymentManifest() {
    console.log('📋 Generating deployment manifest...')
    
    const manifest = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      buildHash: this.generateBuildHash(),
      files: Array.from(this.bundles.entries()).map(([path, info]) => ({
        path: path.replace(this.buildDir, ''),
        size: info.size,
        category: info.category
      })),
      performance: {
        totalSize: this.stats.totalSize,
        gzippedSize: this.stats.gzippedSize,
        budgetCompliant: this.errors.length === 0
      },
      webgl: {
        hasDecoders: true,
        has3DAssets: Array.from(this.bundles.keys()).some(file => extname(file) === '.glb')
      }
    }

    await writeFile(
      join(this.buildDir, 'deployment-manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    this.addOptimization('✅ Deployment manifest generated')
  }

  generateBuildHash() {
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256')
    
    // Hash all bundle sizes and names for a unique build identifier
    for (const [path, info] of this.bundles) {
      hash.update(`${basename(path)}:${info.size}`)
    }
    
    return hash.digest('hex').substring(0, 16)
  }

  async findFiles(dir, extensions) {
    const files = []
    
    async function traverse(currentDir) {
      try {
        const entries = await readdir(currentDir)
        
        for (const entry of entries) {
          const fullPath = join(currentDir, entry)
          const stats = await stat(fullPath)
          
          if (stats.isDirectory()) {
            await traverse(fullPath)
          } else if (stats.isFile()) {
            const ext = extname(entry).toLowerCase()
            if (extensions.includes(ext)) {
              files.push(fullPath)
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }
    
    await traverse(dir)
    return files
  }

  addOptimization(message) {
    this.optimizations.push(message)
    console.log(`   ${message}`)
  }

  addWarning(message) {
    this.warnings.push(message)
    console.log(`   ${message}`)
  }

  addError(message) {
    this.errors.push(message)
    console.log(`   ${message}`)
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  printResults() {
    console.log('')
    console.log('📋 Post-build Optimization Results')
    console.log('═'.repeat(60))
    
    console.log(`✅ Optimizations applied: ${this.optimizations.length}`)
    console.log(`⚠️  Warnings: ${this.warnings.length}`)
    console.log(`❌ Errors: ${this.errors.length}`)
    
    console.log('')
    console.log('📊 Build Statistics:')
    console.log(`   Total build size: ${this.formatBytes(this.stats.totalSize)}`)
    console.log(`   Brotli compressed: ${this.formatBytes(this.stats.brotliSize)} (${Math.round(this.stats.compressionRatio * 100)}%)`)
    console.log(`   Bundle count: ${this.stats.bundleCount}`)
    console.log(`   Budget utilization: ${Math.round((this.stats.totalSize / BUILD_BUDGETS.maxTotalBuild) * 100)}%`)
    
    if (this.warnings.length > 0) {
      console.log('')
      console.log('⚠️  Warnings:')
      this.warnings.forEach(warning => console.log(`   ${warning}`))
    }
    
    if (this.errors.length > 0) {
      console.log('')
      console.log('❌ Critical Issues:')
      this.errors.forEach(error => console.log(`   ${error}`))
      console.log('')
      console.log('🚫 Build is not ready for production deployment!')
    } else {
      console.log('')
      console.log('✨ Build optimization complete! Ready for deployment.')
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Post-build Optimization for KopiKala Platform

Usage: node postbuild-optimization.js [build-dir]

Options:
  build-dir   Build directory to optimize (default: dist)
  --help, -h  Show this help message

Optimizations:
  • Bundle size analysis and budget validation
  • Asset compression (Gzip, Brotli)
  • WebGL asset optimization
  • Service worker generation
  • Performance report creation
  • Deployment manifest generation

Performance Budgets:
  • Max main bundle: ${BUILD_BUDGETS.maxMainBundle / (1024 * 1024)}MB
  • Max vendor bundle: ${BUILD_BUDGETS.maxVendorBundle / 1024}KB
  • Max total build: ${BUILD_BUDGETS.maxTotalBuild / (1024 * 1024)}MB

Examples:
  node postbuild-optimization.js
  node postbuild-optimization.js ./dist
`)
    process.exit(0)
  }

  const buildDir = args[0] || 'dist'
  const optimizer = new PostBuildOptimizer(buildDir)
  await optimizer.optimize()
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason)
  process.exit(1)
})

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { PostBuildOptimizer, BUILD_BUDGETS }
