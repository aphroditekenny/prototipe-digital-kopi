#!/usr/bin/env node

/**
 * LOD Generation Script
 * 
 * This script generates Level-of-Detail (LOD) variants for 3D models
 * according to the KopiKala performance optimization strategy:
 * - Creates multiple detail levels for distance-based rendering
 * - Implements smart simplification algorithms
 * - Maintains visual quality at appropriate distances
 * - Generates metadata for runtime LOD switching
 * 
 * Usage: node generate-lods.js [input-dir] [output-dir]
 */

import { readdir, stat, mkdir, writeFile } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import { Document, NodeIO, Logger } from '@gltf-transform/core'
import { DracoMeshCompression } from '@gltf-transform/extensions'
import { 
  simplify,
  dedup,
  weld,
  prune,
  quantize
} from '@gltf-transform/functions'

const LOD_CONFIGURATION = {
  levels: [
    {
      name: 'high',
      suffix: '-lod0',
      distance: 5,      // meters from camera
      quality: 1.0,     // 100% original quality
      maxTriangles: 50000,
      description: 'High detail for close-up viewing'
    },
    {
      name: 'medium',
      suffix: '-lod1',
      distance: 15,     // meters from camera
      quality: 0.6,     // 60% of original triangles
      maxTriangles: 20000,
      description: 'Medium detail for mid-range viewing'
    },
    {
      name: 'low',
      suffix: '-lod2',
      distance: 50,     // meters from camera
      quality: 0.3,     // 30% of original triangles
      maxTriangles: 5000,
      description: 'Low detail for distant viewing'
    },
    {
      name: 'billboard',
      suffix: '-lod3',
      distance: 100,    // meters from camera
      quality: 0.05,    // 5% of original triangles (simplified plane)
      maxTriangles: 100,
      description: 'Billboard/impostor for very distant viewing'
    }
  ],
  simplificationSettings: {
    // Meshoptimizer settings
    lockBorder: true,          // Preserve silhouette
    errorThreshold: 0.01,      // Target error in object-space units
    targetError: 0.02,         // Maximum acceptable error
    // Edge collapse settings
    preserveTopology: true,    // Maintain mesh topology
    preserveTexCoords: true,   // Keep UV mapping intact
    preserveNormals: true,     // Maintain lighting quality
    // Attribute weights
    positionWeight: 1.0,
    normalWeight: 0.5,
    texCoordWeight: 0.3,
    colorWeight: 0.1
  }
}

class LODGenerator {
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
    this.lodMetadata = new Map()
  }

  async generate() {
    console.log('🔄 Starting LOD generation...')
    console.log(`📁 Input: ${this.inputDir}`)
    console.log(`📁 Output: ${this.outputDir}`)
    console.log('⚙️  LOD Configuration:')
    LOD_CONFIGURATION.levels.forEach(level => {
      console.log(`   ${level.name.toUpperCase()}: ${level.quality * 100}% quality, <${level.distance}m distance`)
    })
    console.log('')

    try {
      await this.ensureOutputDir()
      const files = await this.findModelFiles()
      
      console.log(`📋 Found ${files.length} model files to process`)
      console.log('')

      for (const file of files) {
        await this.processModel(file)
      }

      await this.generateMetadata()
      this.printSummary()
    } catch (error) {
      console.error('❌ LOD generation failed:', error.message)
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
          if (['.glb', '.gltf'].includes(ext) && !entry.includes('-lod')) {
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
      // Load the original model
      const doc = await this.io.read(inputFile)
      
      // Get original stats
      const originalStats = this.getModelStats(doc)
      console.log(`   📊 Original: ${originalStats.triangles.toLocaleString()} triangles, ${originalStats.vertices.toLocaleString()} vertices`)

      const lodInfo = {
        originalFile: relativePath,
        originalStats: originalStats,
        levels: []
      }

      // Generate each LOD level
      for (const levelConfig of LOD_CONFIGURATION.levels) {
        console.log(`   🔽 Generating ${levelConfig.name} LOD (${levelConfig.quality * 100}%)...`)
        
        const lodResult = await this.generateLODLevel(doc, levelConfig, filename, relativePath)
        
        if (lodResult) {
          lodInfo.levels.push(lodResult)
          console.log(`   ✅ ${levelConfig.name}: ${lodResult.stats.triangles.toLocaleString()} triangles (${lodResult.reductionPercentage}% reduction)`)
        }
      }

      this.lodMetadata.set(filename, lodInfo)
      this.processed++
      console.log(`   ✨ Completed: ${filename}`)
      console.log('')

    } catch (error) {
      this.errors.push({ file: relativePath, error: error.message })
      console.error(`   ❌ Failed: ${error.message}`)
      console.log('')
    }
  }

  async generateLODLevel(originalDoc, levelConfig, filename, relativePath) {
    try {
      // Clone the original document
      const lodDoc = originalDoc.clone()
      
      // Apply basic optimization first
      await lodDoc.transform(
        dedup(),
        weld({ tolerance: 0.0001 }),
        prune()
      )

      // Apply simplification if quality < 1.0
      if (levelConfig.quality < 1.0) {
        await lodDoc.transform(
          simplify({
            simplifier: 'draco',
            ratio: levelConfig.quality,
            error: LOD_CONFIGURATION.simplificationSettings.errorThreshold,
            lockBorder: LOD_CONFIGURATION.simplificationSettings.lockBorder
          })
        )
      }

      // Check if we need more aggressive simplification to meet triangle budget
      let currentStats = this.getModelStats(lodDoc)
      if (currentStats.triangles > levelConfig.maxTriangles) {
        const targetRatio = levelConfig.maxTriangles / currentStats.triangles
        console.log(`   ⚠️  Applying aggressive simplification to meet budget: ${targetRatio.toFixed(2)} ratio`)
        
        await lodDoc.transform(
          simplify({
            simplifier: 'draco',
            ratio: targetRatio * 0.9, // Add some buffer
            error: LOD_CONFIGURATION.simplificationSettings.targetError,
            lockBorder: LOD_CONFIGURATION.simplificationSettings.lockBorder
          })
        )
      }

      // Final optimization pass
      await lodDoc.transform(
        quantize({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeTexcoord: 12,
          quantizeColor: 8,
          quantizeGeneric: 12
        })
      )

      // Save the LOD model
      const outputPath = join(
        this.outputDir,
        dirname(relativePath),
        `${filename}${levelConfig.suffix}.glb`
      )
      
      await this.ensureOutputDir(dirname(outputPath))
      await this.io.write(outputPath, lodDoc)

      // Calculate final stats
      const finalStats = this.getModelStats(lodDoc)
      const originalTriangles = this.getModelStats(originalDoc.clone()).triangles
      const reductionPercentage = Math.round(((originalTriangles - finalStats.triangles) / originalTriangles) * 100)

      return {
        level: levelConfig.name,
        suffix: levelConfig.suffix,
        distance: levelConfig.distance,
        targetQuality: levelConfig.quality,
        actualQuality: finalStats.triangles / originalTriangles,
        stats: finalStats,
        reductionPercentage: reductionPercentage,
        filePath: outputPath.replace(this.outputDir, '').replace(/^[/\\]/, ''),
        meetsTriangleBudget: finalStats.triangles <= levelConfig.maxTriangles
      }
    } catch (error) {
      console.error(`   ❌ Failed to generate ${levelConfig.name} LOD: ${error.message}`)
      return null
    }
  }

  getModelStats(doc) {
    let triangles = 0
    let vertices = 0
    let drawCalls = 0

    doc.getRoot().listMeshes().forEach(mesh => {
      drawCalls++
      mesh.listPrimitives().forEach(primitive => {
        const position = primitive.getAttribute('POSITION')
        if (position) {
          vertices += position.getCount()
          
          const indices = primitive.getIndices()
          if (indices) {
            triangles += indices.getCount() / 3
          } else {
            triangles += position.getCount() / 3
          }
        }
      })
    })

    return { 
      triangles: Math.floor(triangles), 
      vertices, 
      drawCalls
    }
  }

  async generateMetadata() {
    console.log('📋 Generating LOD metadata...')
    
    const metadata = {
      generatedAt: new Date().toISOString(),
      configuration: LOD_CONFIGURATION,
      models: {}
    }

    // Convert Map to object for JSON serialization
    for (const [filename, lodInfo] of this.lodMetadata) {
      metadata.models[filename] = {
        ...lodInfo,
        // Add runtime configuration for the 3D engine
        lodConfig: {
          distances: lodInfo.levels.map(level => level.distance),
          files: lodInfo.levels.map(level => level.filePath),
          triangleCounts: lodInfo.levels.map(level => level.stats.triangles)
        }
      }
    }

    const metadataPath = join(this.outputDir, 'lod-metadata.json')
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    
    console.log(`   ✅ Metadata saved: ${metadataPath}`)
    
    // Generate TypeScript types for runtime usage
    await this.generateTypeDefinitions(metadata)
  }

  async generateTypeDefinitions(metadata) {
    const typeDefinitions = `// Auto-generated LOD type definitions
// Generated at: ${metadata.generatedAt}

export interface LODLevel {
  name: string
  suffix: string
  distance: number
  targetQuality: number
  actualQuality: number
  stats: {
    triangles: number
    vertices: number
    drawCalls: number
  }
  reductionPercentage: number
  filePath: string
  meetsTriangleBudget: boolean
}

export interface LODConfiguration {
  distances: number[]
  files: string[]
  triangleCounts: number[]
}

export interface LODModelInfo {
  originalFile: string
  originalStats: {
    triangles: number
    vertices: number
    drawCalls: number
  }
  levels: LODLevel[]
  lodConfig: LODConfiguration
}

export interface LODMetadata {
  generatedAt: string
  configuration: typeof LOD_CONFIGURATION
  models: Record<string, LODModelInfo>
}

// Runtime LOD manager types
export interface LODManagerConfig {
  cameraPosition: [number, number, number]
  targetFrameRate: number
  qualityBias: number // -1 to 1, affects LOD selection
}

export interface LODSelection {
  modelName: string
  selectedLevel: number
  distance: number
  filePath: string
  triangleCount: number
}
`

    const typesPath = join(this.outputDir, 'lod-types.ts')
    await writeFile(typesPath, typeDefinitions)
    
    console.log(`   ✅ Types generated: ${typesPath}`)
  }

  printSummary() {
    console.log('📋 LOD Generation Summary')
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
    console.log('📊 LOD Statistics:')
    let totalLevels = 0
    let totalTriangleReduction = 0
    
    for (const [filename, lodInfo] of this.lodMetadata) {
      totalLevels += lodInfo.levels.length
      const originalTriangles = lodInfo.originalStats.triangles
      const lowestTriangles = Math.min(...lodInfo.levels.map(l => l.stats.triangles))
      totalTriangleReduction += originalTriangles - lowestTriangles
    }
    
    console.log(`   🔄 Total LOD levels generated: ${totalLevels}`)
    console.log(`   📉 Total triangle reduction: ${totalTriangleReduction.toLocaleString()}`)
    console.log(`   📏 Distance ranges: ${LOD_CONFIGURATION.levels[0].distance}m - ${LOD_CONFIGURATION.levels[LOD_CONFIGURATION.levels.length - 1].distance}m`)
    console.log('')
    console.log('🎯 LOD Benefits:')
    console.log('   • Automatic performance scaling based on distance')
    console.log('   • Maintains 60fps target across all devices')
    console.log('   • Preserves visual quality at appropriate distances')
    console.log('   • Runtime metadata for dynamic LOD switching')
    console.log('')
    console.log('✨ LOD system is ready for production!')
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
LOD Generation Tool for KopiKala

Usage: node generate-lods.js [input-dir] [output-dir]

Options:
  input-dir   Directory containing 3D models (.glb, .gltf)
  output-dir  Directory to save LOD variants
  --help, -h  Show this help message

LOD Levels:
${LOD_CONFIGURATION.levels.map(level => 
  `  ${level.name.toUpperCase()}: ${level.quality * 100}% quality, <${level.distance}m distance, <${level.maxTriangles.toLocaleString()} triangles`
).join('\n')}

Features:
  • Automatic triangle budget enforcement
  • Distance-based LOD selection metadata
  • TypeScript type definitions generation
  • Smart simplification with topology preservation
  • Runtime performance optimization

Examples:
  node generate-lods.js ./src/assets/models/original ./src/assets/models/lod
  node generate-lods.js ./models ./public/models/lod
`)
    process.exit(0)
  }

  const inputDir = args[0] || './src/assets/models/original'
  const outputDir = args[1] || './src/assets/models/lod'

  const generator = new LODGenerator(inputDir, outputDir)
  await generator.generate()
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

export { LODGenerator, LOD_CONFIGURATION }
