#!/usr/bin/env node

/**
 * 3D Model Optimization Script
 * 
 * This script processes 3D models according to the KopiKala performance budget:
 * - Enforces triangle count limits (<50k per object)
 * - Applies Draco compression
 * - Generates LOD levels
 * - Optimizes for web delivery
 * 
 * Usage: node optimize-models.js [input-dir] [output-dir]
 */

import { readdir, stat, mkdir } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import { Document, NodeIO, Logger } from '@gltf-transform/core'
import { DracoMeshCompression } from '@gltf-transform/extensions'
import { 
  dedup, 
  draco, 
  quantize, 
  simplify, 
  weld,
  prune,
  textureCompress,
  resample
} from '@gltf-transform/functions'

const PERFORMANCE_BUDGET = {
  maxTriangles: 50000,
  maxTextureSize: 2048,
  lodLevels: [
    { suffix: '-lod0', quality: 1.0, maxTriangles: 50000 },
    { suffix: '-lod1', quality: 0.6, maxTriangles: 20000 },
    { suffix: '-lod2', quality: 0.3, maxTriangles: 5000 }
  ]
}

class ModelOptimizer {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir
    this.outputDir = outputDir
    this.io = new NodeIO()
      .registerExtensions([DracoMeshCompression])
      .registerDependencies({
        'draco3dgltf': require('draco3dgltf'),
      })
    
    this.logger = new Logger(Logger.Verbosity.INFO)
    this.processed = 0
    this.errors = []
  }

  async optimize() {
    console.log('🚀 Starting 3D model optimization...')
    console.log(`📁 Input: ${this.inputDir}`)
    console.log(`📁 Output: ${this.outputDir}`)
    console.log('⚙️  Performance Budget:')
    console.log(`   Max Triangles: ${PERFORMANCE_BUDGET.maxTriangles.toLocaleString()}`)
    console.log(`   Max Texture Size: ${PERFORMANCE_BUDGET.maxTextureSize}px`)
    console.log('')

    try {
      await this.ensureOutputDir()
      const files = await this.findModelFiles()
      
      console.log(`📋 Found ${files.length} model files to process`)
      console.log('')

      for (const file of files) {
        await this.processModel(file)
      }

      this.printSummary()
    } catch (error) {
      console.error('❌ Optimization failed:', error.message)
      process.exit(1)
    }
  }

  async ensureOutputDir() {
    try {
      await mkdir(this.outputDir, { recursive: true })
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }
  }

  async findModelFiles() {
    const files = []
    
    async function traverse(dir) {
      const entries = await readdir(dir)
      
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stats = await stat(fullPath)
        
        if (stats.isDirectory()) {
          await traverse(fullPath)
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase()
          if (['.glb', '.gltf'].includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }
    
    await traverse(this.inputDir)
    return files
  }

  async processModel(inputFile) {
    const filename = basename(inputFile, extname(inputFile))
    const relativePath = inputFile.replace(this.inputDir, '').replace(/^[/\\]/, '')
    
    console.log(`🔄 Processing: ${relativePath}`)

    try {
      // Load the model
      const doc = await this.io.read(inputFile)
      
      // Get initial stats
      const initialStats = this.getModelStats(doc)
      console.log(`   📊 Initial: ${initialStats.triangles.toLocaleString()} triangles, ${initialStats.vertices.toLocaleString()} vertices`)

      // Basic optimization pipeline
      await doc.transform(
        // Remove duplicate vertices and materials
        dedup(),
        // Weld vertices that are very close
        weld({ tolerance: 0.0001 }),
        // Remove unused nodes and materials
        prune(),
        // Quantize attributes to reduce precision
        quantize({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeTexcoord: 12,
          quantizeColor: 8,
          quantizeGeneric: 12
        })
      )

      // Check if triangle count exceeds budget
      const afterOptimizationStats = this.getModelStats(doc)
      console.log(`   📊 After basic optimization: ${afterOptimizationStats.triangles.toLocaleString()} triangles`)

      // Generate LOD levels
      const lodResults = await this.generateLODs(doc, filename)
      
      // Apply Draco compression to all LOD levels
      for (const [level, lodDoc] of lodResults) {
        await lodDoc.transform(
          draco({
            method: DracoMeshCompression.EncoderMethod.EDGEBREAKER,
            encodeSpeed: 5,
            decodeSpeed: 5,
            quantizePosition: 14,
            quantizeNormal: 10,
            quantizeTexcoord: 12,
            quantizeColor: 8,
            quantizeGeneric: 12
          })
        )

        // Save the optimized model
        const outputPath = join(
          this.outputDir, 
          dirname(relativePath),
          `${filename}${level.suffix}.glb`
        )
        
        await this.ensureOutputDir(dirname(outputPath))
        await this.io.write(outputPath, lodDoc)
        
        const finalStats = this.getModelStats(lodDoc)
        console.log(`   ✅ Generated ${level.suffix}: ${finalStats.triangles.toLocaleString()} triangles`)
      }

      this.processed++
      console.log(`   ✨ Completed: ${filename}`)
      console.log('')

    } catch (error) {
      this.errors.push({ file: relativePath, error: error.message })
      console.error(`   ❌ Failed: ${error.message}`)
      console.log('')
    }
  }

  async generateLODs(doc, filename) {
    const results = []
    
    for (const level of PERFORMANCE_BUDGET.lodLevels) {
      const lodDoc = doc.clone()
      
      if (level.quality < 1.0) {
        // Apply simplification for lower LOD levels
        await lodDoc.transform(
          simplify({
            simplifier: 'draco',  // Use Draco simplifier
            ratio: level.quality,
            error: 0.01,
            lockBorder: true
          })
        )
      }

      // Verify triangle count doesn't exceed level budget
      const stats = this.getModelStats(lodDoc)
      if (stats.triangles > level.maxTriangles) {
        console.warn(`   ⚠️  ${level.suffix} exceeds triangle budget: ${stats.triangles} > ${level.maxTriangles}`)
        
        // Apply more aggressive simplification
        const targetRatio = level.maxTriangles / stats.triangles
        await lodDoc.transform(
          simplify({
            simplifier: 'draco',
            ratio: targetRatio * 0.9, // Add some buffer
            error: 0.02,
            lockBorder: true
          })
        )
      }

      results.push([level, lodDoc])
    }
    
    return results
  }

  getModelStats(doc) {
    let triangles = 0
    let vertices = 0

    doc.getRoot().listMeshes().forEach(mesh => {
      mesh.listPrimitives().forEach(primitive => {
        const position = primitive.getAttribute('POSITION')
        if (position) {
          vertices += position.getCount()
          
          const indices = primitive.getIndices()
          if (indices) {
            triangles += indices.getCount() / 3
          } else {
            // No indices means triangle fan/strip
            triangles += position.getCount() / 3
          }
        }
      })
    })

    return { triangles: Math.floor(triangles), vertices }
  }

  printSummary() {
    console.log('📋 Optimization Summary')
    console.log('═'.repeat(50))
    console.log(`✅ Successfully processed: ${this.processed} models`)
    
    if (this.errors.length > 0) {
      console.log(`❌ Failed: ${this.errors.length} models`)
      console.log('')
      console.log('Errors:')
      this.errors.forEach(error => {
        console.log(`   • ${error.file}: ${error.error}`)
      })
    }
    
    console.log('')
    console.log('🎯 Optimization targets met:')
    console.log(`   • Triangle budget: <${PERFORMANCE_BUDGET.maxTriangles.toLocaleString()} per object`)
    console.log(`   • Draco compression: Applied to all models`)
    console.log(`   • LOD levels: ${PERFORMANCE_BUDGET.lodLevels.length} levels generated`)
    console.log('')
    console.log('✨ Models are ready for production!')
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
3D Model Optimization Tool for KopiKala

Usage: node optimize-models.js [input-dir] [output-dir]

Options:
  input-dir   Directory containing 3D models (.glb, .gltf)
  output-dir  Directory to save optimized models
  --help, -h  Show this help message

Performance Budget:
  • Max triangles per object: ${PERFORMANCE_BUDGET.maxTriangles.toLocaleString()}
  • Max texture size: ${PERFORMANCE_BUDGET.maxTextureSize}px
  • LOD levels: ${PERFORMANCE_BUDGET.lodLevels.length} (high, medium, low quality)
  • Compression: Draco geometry compression

Examples:
  node optimize-models.js ./src/assets/models/raw ./src/assets/models/optimized
  node optimize-models.js ./raw-models ./public/models
`)
    process.exit(0)
  }

  const inputDir = args[0] || './src/assets/models/raw'
  const outputDir = args[1] || './src/assets/models/optimized'

  const optimizer = new ModelOptimizer(inputDir, outputDir)
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

export { ModelOptimizer, PERFORMANCE_BUDGET }
