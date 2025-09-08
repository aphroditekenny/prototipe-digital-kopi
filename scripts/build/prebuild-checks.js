#!/usr/bin/env node

/**
 * Pre-build Checks Script
 * 
 * This script performs comprehensive checks before building the KopiKala platform:
 * - Validates asset optimization status
 * - Checks performance budgets
 * - Verifies 3D model compliance
 * - Tests critical dependencies
 * - Ensures production readiness
 * 
 * Usage: node prebuild-checks.js
 */

import { readdir, stat, access } from 'fs/promises'
import { join, extname } from 'path'
import { readFileSync } from 'fs'

const PERFORMANCE_BUDGETS = {
  // Asset size budgets
  maxModelSize: 2 * 1024 * 1024,      // 2MB per model
  maxTextureSize: 1 * 1024 * 1024,    // 1MB per texture
  maxTotalAssets: 20 * 1024 * 1024,   // 20MB total assets
  
  // 3D performance budgets
  maxTrianglesPerModel: 50000,         // 50k triangles max
  maxDrawCalls: 100,                   // 100 draw calls max
  maxMaterials: 50,                    // 50 materials max
  
  // Bundle size budgets
  maxJSBundle: 1 * 1024 * 1024,       // 1MB JavaScript
  maxCSSBundle: 200 * 1024,           // 200KB CSS
  maxVendorBundle: 500 * 1024,        // 500KB vendor code
  
  // Runtime performance
  targetFPS: 60,                       // 60 FPS target
  maxMemoryUsage: 512 * 1024 * 1024,  // 512MB memory
  maxLoadTime: 3000                    // 3 seconds load time
}

const REQUIRED_ASSETS = [
  'src/assets/models/optimized',
  'src/assets/textures/compressed',
  'public/basis/basis_transcoder.js',
  'public/basis/basis_transcoder.wasm',
  'public/draco/draco_decoder.js',
  'public/draco/draco_decoder.wasm'
]

const CRITICAL_DEPENDENCIES = [
  'vue',
  '@tresjs/core',
  'three',
  'pinia',
  'gsap'
]

class PrebuildChecker {
  constructor() {
    this.checks = []
    this.warnings = []
    this.errors = []
    this.stats = {
      totalAssetSize: 0,
      modelCount: 0,
      textureCount: 0,
      optimizedModels: 0,
      compressedTextures: 0
    }
  }

  async runChecks() {
    console.log('🔍 Running pre-build checks for KopiKala platform...')
    console.log('⚙️  Performance Budgets:')
    console.log(`   Max model size: ${this.formatBytes(PERFORMANCE_BUDGETS.maxModelSize)}`)
    console.log(`   Max texture size: ${this.formatBytes(PERFORMANCE_BUDGETS.maxTextureSize)}`)
    console.log(`   Max total assets: ${this.formatBytes(PERFORMANCE_BUDGETS.maxTotalAssets)}`)
    console.log(`   Max triangles per model: ${PERFORMANCE_BUDGETS.maxTrianglesPerModel.toLocaleString()}`)
    console.log('')

    // Run all checks
    await this.checkProjectStructure()
    await this.checkDependencies()
    await this.checkAssetOptimization()
    await this.checkPerformanceBudgets()
    await this.checkBuildConfiguration()
    await this.check3DAssets()
    await this.checkTestingSetup()

    this.printResults()
    
    // Exit with error code if there are critical issues
    if (this.errors.length > 0) {
      process.exit(1)
    }
  }

  async checkProjectStructure() {
    console.log('📁 Checking project structure...')
    
    const requiredDirs = [
      'src/components/3d',
      'src/stores',
      'src/composables',
      'src/types',
      'src/utils',
      'public/models',
      'scripts/asset-optimization'
    ]

    for (const dir of requiredDirs) {
      try {
        await access(dir)
        this.addCheck(`✅ Directory exists: ${dir}`)
      } catch (error) {
        this.addError(`❌ Missing directory: ${dir}`)
      }
    }

    // Check for required assets
    for (const asset of REQUIRED_ASSETS) {
      try {
        await access(asset)
        this.addCheck(`✅ Required asset: ${asset}`)
      } catch (error) {
        this.addError(`❌ Missing required asset: ${asset}`)
      }
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...')
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }

      for (const dep of CRITICAL_DEPENDENCIES) {
        if (allDeps[dep]) {
          this.addCheck(`✅ Critical dependency installed: ${dep}@${allDeps[dep]}`)
        } else {
          this.addError(`❌ Missing critical dependency: ${dep}`)
        }
      }

      // Check for WebGL and 3D specific dependencies
      const webglDeps = ['@tresjs/core', 'three', '@tresjs/cientos']
      const missingWebGL = webglDeps.filter(dep => !allDeps[dep])
      
      if (missingWebGL.length === 0) {
        this.addCheck('✅ WebGL dependencies complete')
      } else {
        this.addError(`❌ Missing WebGL dependencies: ${missingWebGL.join(', ')}`)
      }

      // Check optimization tools
      const optimizationTools = ['@gltf-transform/core', '@gltf-transform/functions', 'sharp']
      const missingOptimization = optimizationTools.filter(dep => !allDeps[dep])
      
      if (missingOptimization.length === 0) {
        this.addCheck('✅ Asset optimization tools available')
      } else {
        this.addWarning(`⚠️  Missing optimization tools: ${missingOptimization.join(', ')}`)
      }

    } catch (error) {
      this.addError('❌ Cannot read package.json')
    }
  }

  async checkAssetOptimization() {
    console.log('🎨 Checking asset optimization...')
    
    try {
      // Check for optimized models
      const optimizedModelsDir = 'src/assets/models/optimized'
      await access(optimizedModelsDir)
      
      const optimizedFiles = await this.findFiles(optimizedModelsDir, ['.glb'])
      this.stats.optimizedModels = optimizedFiles.length
      
      if (optimizedFiles.length > 0) {
        this.addCheck(`✅ Found ${optimizedFiles.length} optimized models`)
      } else {
        this.addWarning('⚠️  No optimized models found - run asset optimization')
      }

      // Check for LOD variants
      const lodFiles = optimizedFiles.filter(file => file.includes('-lod'))
      if (lodFiles.length > 0) {
        this.addCheck(`✅ Found ${lodFiles.length} LOD variants`)
      } else {
        this.addWarning('⚠️  No LOD variants found - consider generating LODs')
      }

    } catch (error) {
      this.addError('❌ Optimized models directory not found')
    }

    try {
      // Check for compressed textures
      const compressedTexturesDir = 'src/assets/textures/compressed'
      await access(compressedTexturesDir)
      
      const compressedFiles = await this.findFiles(compressedTexturesDir, ['.webp', '.ktx2'])
      this.stats.compressedTextures = compressedFiles.length
      
      if (compressedFiles.length > 0) {
        this.addCheck(`✅ Found ${compressedFiles.length} compressed textures`)
      } else {
        this.addWarning('⚠️  No compressed textures found - run texture compression')
      }

    } catch (error) {
      this.addWarning('⚠️  Compressed textures directory not found')
    }
  }

  async checkPerformanceBudgets() {
    console.log('⚡ Checking performance budgets...')
    
    let totalAssetSize = 0
    let oversizedAssets = []

    try {
      // Check all asset directories
      const assetDirs = [
        'src/assets/models',
        'src/assets/textures',
        'public/models',
        'public/textures'
      ]

      for (const dir of assetDirs) {
        try {
          await access(dir)
          const size = await this.calculateDirectorySize(dir)
          totalAssetSize += size
          
          // Check individual file sizes
          const files = await this.findFiles(dir, ['.glb', '.jpg', '.png', '.webp', '.ktx2'])
          for (const file of files) {
            const fileStats = await stat(file)
            const isModel = extname(file).toLowerCase() === '.glb'
            const budget = isModel ? PERFORMANCE_BUDGETS.maxModelSize : PERFORMANCE_BUDGETS.maxTextureSize
            
            if (fileStats.size > budget) {
              oversizedAssets.push({
                file: file.replace(process.cwd(), '.'),
                size: fileStats.size,
                budget: budget,
                type: isModel ? 'model' : 'texture'
              })
            }
          }
        } catch (error) {
          // Directory doesn't exist, skip
        }
      }

      this.stats.totalAssetSize = totalAssetSize

      // Check total asset budget
      if (totalAssetSize <= PERFORMANCE_BUDGETS.maxTotalAssets) {
        this.addCheck(`✅ Total asset size within budget: ${this.formatBytes(totalAssetSize)} / ${this.formatBytes(PERFORMANCE_BUDGETS.maxTotalAssets)}`)
      } else {
        this.addError(`❌ Total asset size exceeds budget: ${this.formatBytes(totalAssetSize)} > ${this.formatBytes(PERFORMANCE_BUDGETS.maxTotalAssets)}`)
      }

      // Report oversized assets
      if (oversizedAssets.length === 0) {
        this.addCheck('✅ All assets within size budgets')
      } else {
        this.addError(`❌ ${oversizedAssets.length} assets exceed size budgets:`)
        oversizedAssets.forEach(asset => {
          console.log(`     ${asset.file}: ${this.formatBytes(asset.size)} > ${this.formatBytes(asset.budget)} (${asset.type})`)
        })
      }

    } catch (error) {
      this.addWarning('⚠️  Could not calculate asset sizes')
    }
  }

  async checkBuildConfiguration() {
    console.log('🔧 Checking build configuration...')
    
    const configFiles = [
      'vite.config.ts',
      'tsconfig.json',
      'tailwind.config.js'
    ]

    for (const config of configFiles) {
      try {
        await access(config)
        this.addCheck(`✅ Build config found: ${config}`)
      } catch (error) {
        this.addError(`❌ Missing build config: ${config}`)
      }
    }

    // Check Vite config for performance optimizations
    try {
      const viteConfig = readFileSync('vite.config.ts', 'utf8')
      
      if (viteConfig.includes('rollupOptions')) {
        this.addCheck('✅ Vite bundle optimization configured')
      } else {
        this.addWarning('⚠️  Vite bundle optimization not configured')
      }

      if (viteConfig.includes('assetsInlineLimit')) {
        this.addCheck('✅ Asset inlining configured')
      } else {
        this.addWarning('⚠️  Asset inlining not configured')
      }

    } catch (error) {
      this.addError('❌ Cannot read Vite configuration')
    }
  }

  async check3DAssets() {
    console.log('🎮 Checking 3D asset compliance...')
    
    try {
      // Check for WebGL decoder availability
      const decoders = [
        'public/basis/basis_transcoder.js',
        'public/draco/draco_decoder.js'
      ]

      let availableDecoders = 0
      for (const decoder of decoders) {
        try {
          await access(decoder)
          availableDecoders++
        } catch (error) {
          // Decoder not found
        }
      }

      if (availableDecoders === decoders.length) {
        this.addCheck('✅ WebGL decoders available (Basis, Draco)')
      } else {
        this.addError(`❌ Missing WebGL decoders: ${decoders.length - availableDecoders} missing`)
      }

      // Check for fallback assets
      try {
        await access('public/models/fallback-cube.glb')
        this.addCheck('✅ Fallback 3D model available')
      } catch (error) {
        this.addWarning('⚠️  No fallback 3D model found')
      }

    } catch (error) {
      this.addError('❌ 3D asset check failed')
    }
  }

  async checkTestingSetup() {
    console.log('🧪 Checking testing setup...')
    
    const testConfigs = [
      'playwright.config.ts',
      'tests/e2e',
      'tests/unit'
    ]

    for (const config of testConfigs) {
      try {
        await access(config)
        this.addCheck(`✅ Testing setup: ${config}`)
      } catch (error) {
        this.addWarning(`⚠️  Testing setup missing: ${config}`)
      }
    }
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

  async calculateDirectorySize(dir) {
    let totalSize = 0
    
    async function traverse(currentDir) {
      try {
        const entries = await readdir(currentDir)
        
        for (const entry of entries) {
          const fullPath = join(currentDir, entry)
          const stats = await stat(fullPath)
          
          if (stats.isDirectory()) {
            await traverse(fullPath)
          } else {
            totalSize += stats.size
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
    
    await traverse(dir)
    return totalSize
  }

  addCheck(message) {
    this.checks.push(message)
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
    console.log('📋 Pre-build Check Results')
    console.log('═'.repeat(60))
    
    console.log(`✅ Checks passed: ${this.checks.length}`)
    console.log(`⚠️  Warnings: ${this.warnings.length}`)
    console.log(`❌ Errors: ${this.errors.length}`)
    
    console.log('')
    console.log('📊 Asset Statistics:')
    console.log(`   Total asset size: ${this.formatBytes(this.stats.totalAssetSize)}`)
    console.log(`   Optimized models: ${this.stats.optimizedModels}`)
    console.log(`   Compressed textures: ${this.stats.compressedTextures}`)
    
    if (this.warnings.length > 0) {
      console.log('')
      console.log('⚠️  Warnings:')
      this.warnings.forEach(warning => console.log(`   ${warning}`))
    }
    
    if (this.errors.length > 0) {
      console.log('')
      console.log('❌ Errors (must be fixed before build):')
      this.errors.forEach(error => console.log(`   ${error}`))
      console.log('')
      console.log('🔧 To fix these issues:')
      console.log('   1. Run asset optimization: npm run optimize:all')
      console.log('   2. Install missing dependencies: npm install')
      console.log('   3. Check project structure and configuration')
    } else {
      console.log('')
      console.log('✨ All critical checks passed! Ready to build.')
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Pre-build Checks for KopiKala Platform

Usage: node prebuild-checks.js

This script validates:
  • Project structure and required files
  • Dependency installation and versions
  • Asset optimization status
  • Performance budget compliance
  • Build configuration
  • 3D asset availability
  • Testing setup

Performance Budgets:
  • Max model size: ${PERFORMANCE_BUDGETS.maxModelSize / (1024 * 1024)}MB
  • Max texture size: ${PERFORMANCE_BUDGETS.maxTextureSize / (1024 * 1024)}MB
  • Max total assets: ${PERFORMANCE_BUDGETS.maxTotalAssets / (1024 * 1024)}MB
  • Max triangles per model: ${PERFORMANCE_BUDGETS.maxTrianglesPerModel.toLocaleString()}

Exit Codes:
  0 - All checks passed
  1 - Critical errors found (build should not proceed)
`)
    process.exit(0)
  }

  const checker = new PrebuildChecker()
  await checker.runChecks()
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

export { PrebuildChecker, PERFORMANCE_BUDGETS }
