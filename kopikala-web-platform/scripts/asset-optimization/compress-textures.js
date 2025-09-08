#!/usr/bin/env node

/**
 * Texture Compression Script
 * 
 * This script compresses textures according to the KopiKala performance budget:
 * - Converts textures to optimal formats (WebP, AVIF, KTX2)
 * - Generates multiple quality levels
 * - Creates responsive variants
 * - Applies BASIS Universal compression for GPU efficiency
 * 
 * Usage: node compress-textures.js [input-dir] [output-dir]
 */

import { readdir, stat, mkdir, copyFile } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import { spawn } from 'child_process'
import { promisify } from 'util'
import sharp from 'sharp'

const execAsync = promisify(spawn)

const PERFORMANCE_BUDGET = {
  maxTextureSize: 2048,
  qualityLevels: [
    { suffix: '-high', quality: 90, maxSize: 2048 },
    { suffix: '-medium', quality: 75, maxSize: 1024 },
    { suffix: '-low', quality: 60, maxSize: 512 }
  ],
  formats: {
    diffuse: ['webp', 'ktx2', 'jpg'],
    normal: ['ktx2', 'png'],
    roughness: ['webp', 'ktx2'],
    metallic: ['webp', 'ktx2'],
    ao: ['webp', 'ktx2'],
    emission: ['webp', 'ktx2']
  },
  ktxOptions: {
    format: 'etc1s',  // ETC1S for smaller file sizes
    quality: 128,     // 0-255, higher = better quality
    compressionLevel: 2  // 0-6, higher = smaller files
  }
}

class TextureCompressor {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir
    this.outputDir = outputDir
    this.processed = 0
    this.errors = []
    this.totalSavings = 0
  }

  async compress() {
    console.log('🎨 Starting texture compression...')
    console.log(`📁 Input: ${this.inputDir}`)
    console.log(`📁 Output: ${this.outputDir}`)
    console.log('⚙️  Performance Budget:')
    console.log(`   Max Texture Size: ${PERFORMANCE_BUDGET.maxTextureSize}px`)
    console.log(`   Quality Levels: ${PERFORMANCE_BUDGET.qualityLevels.length}`)
    console.log(`   Formats: WebP, KTX2, PNG, JPG`)
    console.log('')

    try {
      await this.ensureOutputDir()
      const files = await this.findTextureFiles()
      
      console.log(`📋 Found ${files.length} texture files to process`)
      console.log('')

      for (const file of files) {
        await this.processTexture(file)
      }

      this.printSummary()
    } catch (error) {
      console.error('❌ Compression failed:', error.message)
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

  async findTextureFiles() {
    const files = []
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.tga', '.exr', '.hdr', '.tiff']
    
    async function traverse(dir) {
      const entries = await readdir(dir)
      
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stats = await stat(fullPath)
        
        if (stats.isDirectory()) {
          await traverse(fullPath)
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase()
          if (supportedFormats.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }
    
    await traverse(this.inputDir)
    return files
  }

  async processTexture(inputFile) {
    const filename = basename(inputFile, extname(inputFile))
    const relativePath = inputFile.replace(this.inputDir, '').replace(/^[/\\]/, '')
    const textureType = this.detectTextureType(filename)
    
    console.log(`🔄 Processing: ${relativePath}`)
    console.log(`   🏷️  Type: ${textureType}`)

    try {
      // Get original file stats
      const originalStats = await stat(inputFile)
      const originalSize = originalStats.size
      
      // Load image with Sharp for processing
      const image = sharp(inputFile)
      const metadata = await image.metadata()
      
      console.log(`   📊 Original: ${metadata.width}x${metadata.height}, ${this.formatBytes(originalSize)}`)

      // Determine output formats for this texture type
      const outputFormats = PERFORMANCE_BUDGET.formats[textureType] || PERFORMANCE_BUDGET.formats.diffuse

      let totalCompressedSize = 0
      
      // Generate quality variants for each format
      for (const format of outputFormats) {
        for (const quality of PERFORMANCE_BUDGET.qualityLevels) {
          const outputPath = await this.compressToFormat(
            inputFile, 
            filename, 
            relativePath, 
            format, 
            quality,
            textureType
          )
          
          if (outputPath) {
            const compressedStats = await stat(outputPath)
            totalCompressedSize += compressedStats.size
          }
        }
      }

      // Generate KTX2 variants using basisu (if available)
      if (outputFormats.includes('ktx2')) {
        await this.generateKTX2Variants(inputFile, filename, relativePath, textureType)
      }

      // Calculate savings
      const savings = originalSize - (totalCompressedSize / outputFormats.length)
      this.totalSavings += Math.max(0, savings)

      console.log(`   💾 Compressed variants generated`)
      console.log(`   💰 Size reduction: ${this.formatBytes(Math.max(0, savings))} (${Math.round((savings / originalSize) * 100)}%)`)
      
      this.processed++
      console.log('')

    } catch (error) {
      this.errors.push({ file: relativePath, error: error.message })
      console.error(`   ❌ Failed: ${error.message}`)
      console.log('')
    }
  }

  async compressToFormat(inputFile, filename, relativePath, format, quality, textureType) {
    const outputDir = join(this.outputDir, dirname(relativePath))
    await this.ensureOutputDir(outputDir)
    
    const outputPath = join(outputDir, `${filename}${quality.suffix}.${format}`)
    
    try {
      let image = sharp(inputFile)

      // Resize if needed
      const metadata = await image.metadata()
      if (metadata.width > quality.maxSize || metadata.height > quality.maxSize) {
        image = image.resize(quality.maxSize, quality.maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Apply format-specific compression
      switch (format) {
        case 'webp':
          await image
            .webp({ 
              quality: quality.quality,
              effort: 6,
              lossless: textureType === 'normal' || textureType === 'ao'
            })
            .toFile(outputPath)
          break

        case 'jpg':
        case 'jpeg':
          await image
            .jpeg({ 
              quality: quality.quality,
              progressive: true,
              mozjpeg: true
            })
            .toFile(outputPath)
          break

        case 'png':
          await image
            .png({ 
              quality: quality.quality,
              compressionLevel: 9,
              progressive: true
            })
            .toFile(outputPath)
          break

        default:
          // For other formats, just copy
          await copyFile(inputFile, outputPath)
      }

      return outputPath
    } catch (error) {
      console.warn(`   ⚠️  Failed to generate ${format} variant: ${error.message}`)
      return null
    }
  }

  async generateKTX2Variants(inputFile, filename, relativePath, textureType) {
    const outputDir = join(this.outputDir, dirname(relativePath), 'ktx2')
    await this.ensureOutputDir(outputDir)

    try {
      // Check if basisu tool is available
      if (!await this.isBasisuAvailable()) {
        console.warn('   ⚠️  basisu not found, skipping KTX2 generation')
        return
      }

      for (const quality of PERFORMANCE_BUDGET.qualityLevels) {
        const outputPath = join(outputDir, `${filename}${quality.suffix}.ktx2`)
        
        // Create temporary resized image if needed
        const tempPath = join(outputDir, `temp_${filename}.png`)
        let image = sharp(inputFile)
        
        const metadata = await image.metadata()
        if (metadata.width > quality.maxSize || metadata.height > quality.maxSize) {
          image = image.resize(quality.maxSize, quality.maxSize, {
            fit: 'inside',
            withoutEnlargement: true
          })
        }
        
        await image.png().toFile(tempPath)

        // Generate KTX2 using basisu
        const basisOptions = [
          '-ktx2',
          '-mipmap',
          '-quality', PERFORMANCE_BUDGET.ktxOptions.quality.toString(),
          '-comp_level', PERFORMANCE_BUDGET.ktxOptions.compressionLevel.toString(),
        ]

        // Add format-specific options
        if (textureType === 'normal') {
          basisOptions.push('-normal_map')
        } else if (textureType === 'diffuse') {
          basisOptions.push('-linear')
        }

        basisOptions.push('-output_path', outputDir)
        basisOptions.push('-output_file', basename(outputPath, '.ktx2'))
        basisOptions.push(tempPath)

        await this.runBasisu(basisOptions)
        
        // Clean up temp file
        try {
          await fs.unlink(tempPath)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  KTX2 generation failed: ${error.message}`)
    }
  }

  async isBasisuAvailable() {
    try {
      await this.runCommand('basisu', ['--version'])
      return true
    } catch (error) {
      return false
    }
  }

  async runBasisu(options) {
    return new Promise((resolve, reject) => {
      const process = spawn('basisu', options)
      
      let stdout = ''
      let stderr = ''
      
      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`basisu failed: ${stderr}`))
        }
      })
      
      process.on('error', reject)
    })
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args)
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with code ${code}`))
        }
      })
      
      process.on('error', reject)
    })
  }

  detectTextureType(filename) {
    const lower = filename.toLowerCase()
    
    if (lower.includes('normal') || lower.includes('norm') || lower.includes('_n.')) {
      return 'normal'
    }
    if (lower.includes('roughness') || lower.includes('rough') || lower.includes('_r.')) {
      return 'roughness'
    }
    if (lower.includes('metallic') || lower.includes('metal') || lower.includes('_m.')) {
      return 'metallic'
    }
    if (lower.includes('ambient') || lower.includes('occlusion') || lower.includes('ao') || lower.includes('_ao.')) {
      return 'ao'
    }
    if (lower.includes('emission') || lower.includes('emissive') || lower.includes('_e.')) {
      return 'emission'
    }
    
    return 'diffuse'
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  printSummary() {
    console.log('📋 Compression Summary')
    console.log('═'.repeat(50))
    console.log(`✅ Successfully processed: ${this.processed} textures`)
    
    if (this.errors.length > 0) {
      console.log(`❌ Failed: ${this.errors.length} textures`)
      console.log('')
      console.log('Errors:')
      this.errors.forEach(error => {
        console.log(`   • ${error.file}: ${error.error}`)
      })
    }
    
    console.log('')
    console.log('📊 Compression Results:')
    console.log(`   💾 Total size saved: ${this.formatBytes(this.totalSavings)}`)
    console.log(`   🎯 Max texture size: ${PERFORMANCE_BUDGET.maxTextureSize}px`)
    console.log(`   📦 Formats generated: WebP, KTX2, PNG, JPG`)
    console.log(`   🔄 Quality levels: ${PERFORMANCE_BUDGET.qualityLevels.length}`)
    console.log('')
    console.log('✨ Textures are ready for production!')
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Texture Compression Tool for KopiKala

Usage: node compress-textures.js [input-dir] [output-dir]

Options:
  input-dir   Directory containing texture files
  output-dir  Directory to save compressed textures
  --help, -h  Show this help message

Supported Formats:
  Input:  JPG, PNG, TGA, EXR, HDR, TIFF
  Output: WebP, KTX2, PNG, JPG

Performance Budget:
  • Max texture size: ${PERFORMANCE_BUDGET.maxTextureSize}px
  • Quality levels: ${PERFORMANCE_BUDGET.qualityLevels.length} (high, medium, low)
  • Compression: WebP, KTX2/BASIS Universal
  • Auto-detection: Diffuse, Normal, Roughness, Metallic, AO, Emission

Examples:
  node compress-textures.js ./src/assets/textures/raw ./src/assets/textures/compressed
  node compress-textures.js ./raw-textures ./public/textures
`)
    process.exit(0)
  }

  const inputDir = args[0] || './src/assets/textures/raw'
  const outputDir = args[1] || './src/assets/textures/compressed'

  const compressor = new TextureCompressor(inputDir, outputDir)
  await compressor.compress()
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

export { TextureCompressor, PERFORMANCE_BUDGET }
