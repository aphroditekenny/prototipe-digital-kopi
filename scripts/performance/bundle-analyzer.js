#!/usr/bin/env node

/**
 * Bundle Analyzer Script
 * 
 * This script provides detailed analysis of bundle composition and size
 * for the KopiKala platform, with specific focus on WebGL and 3D assets:
 * - Generates visual bundle analysis reports
 * - Identifies optimization opportunities
 * - Tracks bundle size trends
 * - Analyzes WebGL asset distribution
 * 
 * Usage: node bundle-analyzer.js [build-dir]
 */

import { readdir, stat, writeFile, readFile } from 'fs/promises'
import { join, extname, basename, relative } from 'path'
import { createHash } from 'crypto'

const BUNDLE_CATEGORIES = {
  'main': {
    patterns: ['main', 'app', 'index'],
    color: '#4CAF50',
    description: 'Main application code'
  },
  'vendor': {
    patterns: ['vendor', 'chunk', 'node_modules'],
    color: '#2196F3',
    description: 'Third-party dependencies'
  },
  'webgl': {
    patterns: ['three', 'tres', 'draco', 'basis', 'webgl'],
    color: '#FF9800',
    description: 'WebGL and 3D libraries'
  },
  'assets': {
    patterns: ['.glb', '.wasm', '.ktx2'],
    color: '#9C27B0',
    description: '3D models and WebGL assets'
  },
  'styles': {
    patterns: ['.css'],
    color: '#F44336',
    description: 'CSS and styling'
  },
  'runtime': {
    patterns: ['runtime', 'polyfill'],
    color: '#795548',
    description: 'Runtime and polyfills'
  }
}

const SIZE_THRESHOLDS = {
  large: 500 * 1024,    // 500KB
  medium: 100 * 1024,   // 100KB
  small: 10 * 1024      // 10KB
}

class BundleAnalyzer {
  constructor(buildDir = 'dist') {
    this.buildDir = buildDir
    this.bundles = new Map()
    this.analysis = {
      totalSize: 0,
      totalFiles: 0,
      categories: {},
      duplicates: [],
      recommendations: [],
      trends: []
    }
  }

  async analyze() {
    console.log('📊 Starting bundle analysis...')
    console.log(`📁 Build directory: ${this.buildDir}`)
    console.log('')

    try {
      await this.scanBundles()
      await this.categorizeAssets()
      await this.analyzeDependencies()
      await this.detectDuplicates()
      await this.generateRecommendations()
      await this.createVisualization()
      await this.generateReport()

      this.printSummary()
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
      process.exit(1)
    }
  }

  async scanBundles() {
    console.log('🔍 Scanning build files...')
    
    const files = await this.findAllFiles(this.buildDir)
    
    for (const file of files) {
      const stats = await stat(file)
      const relativePath = relative(this.buildDir, file)
      const filename = basename(file)
      const ext = extname(file)
      
      // Skip non-bundle files
      if (stats.isDirectory() || this.shouldSkipFile(filename)) {
        continue
      }

      const bundleInfo = {
        path: file,
        relativePath: relativePath,
        filename: filename,
        extension: ext,
        size: stats.size,
        hash: await this.getFileHash(file),
        category: 'other',
        isAsset: this.isAssetFile(ext),
        isCode: this.isCodeFile(ext),
        isWebGL: this.isWebGLFile(filename)
      }

      this.bundles.set(relativePath, bundleInfo)
      this.analysis.totalSize += stats.size
      this.analysis.totalFiles++
    }

    console.log(`   📦 Found ${this.analysis.totalFiles} files`)
    console.log(`   📏 Total size: ${this.formatBytes(this.analysis.totalSize)}`)
  }

  async categorizeAssets() {
    console.log('🏷️  Categorizing assets...')
    
    // Initialize categories
    for (const [categoryName, config] of Object.entries(BUNDLE_CATEGORIES)) {
      this.analysis.categories[categoryName] = {
        ...config,
        files: [],
        totalSize: 0,
        count: 0
      }
    }

    // Categorize each bundle
    for (const [path, bundle] of this.bundles) {
      let assigned = false

      // Check against category patterns
      for (const [categoryName, config] of Object.entries(BUNDLE_CATEGORIES)) {
        if (this.matchesCategory(bundle, config.patterns)) {
          bundle.category = categoryName
          this.analysis.categories[categoryName].files.push(bundle)
          this.analysis.categories[categoryName].totalSize += bundle.size
          this.analysis.categories[categoryName].count++
          assigned = true
          break
        }
      }

      if (!assigned) {
        bundle.category = 'other'
        if (!this.analysis.categories.other) {
          this.analysis.categories.other = {
            patterns: [],
            color: '#607D8B',
            description: 'Other files',
            files: [],
            totalSize: 0,
            count: 0
          }
        }
        this.analysis.categories.other.files.push(bundle)
        this.analysis.categories.other.totalSize += bundle.size
        this.analysis.categories.other.count++
      }
    }

    // Print category summary
    for (const [categoryName, category] of Object.entries(this.analysis.categories)) {
      if (category.count > 0) {
        const percentage = (category.totalSize / this.analysis.totalSize * 100).toFixed(1)
        console.log(`   ${categoryName}: ${category.count} files, ${this.formatBytes(category.totalSize)} (${percentage}%)`)
      }
    }
  }

  async analyzeDependencies() {
    console.log('🔗 Analyzing dependencies...')
    
    const packageJson = await this.loadPackageJson()
    if (!packageJson) return

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    // Identify heavy dependencies
    const heavyDeps = []
    const webglDeps = []
    const unusedDeps = []

    for (const [depName, version] of Object.entries(deps)) {
      const isUsed = this.isDependencyUsed(depName)
      const isWebGL = this.isWebGLDependency(depName)
      
      if (!isUsed) {
        unusedDeps.push(depName)
      } else if (isWebGL) {
        webglDeps.push({ name: depName, version })
      }
      
      // Estimate size impact (simplified)
      const estimatedSize = this.estimateDependencySize(depName)
      if (estimatedSize > SIZE_THRESHOLDS.large) {
        heavyDeps.push({ name: depName, estimatedSize })
      }
    }

    this.analysis.dependencies = {
      total: Object.keys(deps).length,
      heavy: heavyDeps,
      webgl: webglDeps,
      unused: unusedDeps
    }

    console.log(`   📚 Total dependencies: ${this.analysis.dependencies.total}`)
    console.log(`   🎮 WebGL dependencies: ${webglDeps.length}`)
    console.log(`   ⚠️  Heavy dependencies: ${heavyDeps.length}`)
    console.log(`   🗑️  Potentially unused: ${unusedDeps.length}`)
  }

  async detectDuplicates() {
    console.log('🔍 Detecting duplicate code...')
    
    const hashes = new Map()
    const duplicates = []

    for (const [path, bundle] of this.bundles) {
      if (!bundle.isCode) continue

      if (hashes.has(bundle.hash)) {
        const existing = hashes.get(bundle.hash)
        duplicates.push({
          files: [existing.path, path],
          size: bundle.size,
          hash: bundle.hash
        })
      } else {
        hashes.set(bundle.hash, { path, size: bundle.size })
      }
    }

    this.analysis.duplicates = duplicates
    const duplicateSize = duplicates.reduce((sum, dup) => sum + dup.size, 0)

    if (duplicates.length > 0) {
      console.log(`   🔄 Found ${duplicates.length} potential duplicates`)
      console.log(`   💾 Duplicate size: ${this.formatBytes(duplicateSize)}`)
    } else {
      console.log(`   ✅ No significant duplicates detected`)
    }
  }

  generateRecommendations() {
    console.log('💡 Generating optimization recommendations...')
    
    const recommendations = []

    // Bundle size recommendations
    const largeCategories = Object.entries(this.analysis.categories)
      .filter(([name, cat]) => cat.totalSize > SIZE_THRESHOLDS.large)
      .sort((a, b) => b[1].totalSize - a[1].totalSize)

    if (largeCategories.length > 0) {
      recommendations.push({
        type: 'size',
        priority: 'high',
        title: 'Large bundle categories detected',
        description: `Categories ${largeCategories.map(([name]) => name).join(', ')} are consuming significant space`,
        suggestion: 'Consider code splitting, tree shaking, or lazy loading for these categories'
      })
    }

    // WebGL specific recommendations
    const webglCategory = this.analysis.categories.webgl
    if (webglCategory && webglCategory.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push({
        type: 'webgl',
        priority: 'medium',
        title: 'Large WebGL bundle size',
        description: `WebGL assets are ${this.formatBytes(webglCategory.totalSize)}`,
        suggestion: 'Consider lazy loading WebGL libraries and using smaller decoder variants'
      })
    }

    // Duplicate recommendations
    if (this.analysis.duplicates.length > 0) {
      recommendations.push({
        type: 'duplication',
        priority: 'medium',
        title: 'Duplicate code detected',
        description: `${this.analysis.duplicates.length} potential duplicates found`,
        suggestion: 'Review build configuration for proper chunk splitting and deduplication'
      })
    }

    // Unused dependencies
    if (this.analysis.dependencies?.unused.length > 0) {
      recommendations.push({
        type: 'dependencies',
        priority: 'low',
        title: 'Unused dependencies detected',
        description: `${this.analysis.dependencies.unused.length} dependencies may be unused`,
        suggestion: 'Review and remove unused dependencies to reduce bundle size'
      })
    }

    // Asset optimization
    const assetCategory = this.analysis.categories.assets
    if (assetCategory && assetCategory.totalSize > 5 * 1024 * 1024) { // > 5MB
      recommendations.push({
        type: 'assets',
        priority: 'high',
        title: 'Large asset bundle',
        description: `Asset bundle is ${this.formatBytes(assetCategory.totalSize)}`,
        suggestion: 'Implement progressive asset loading and LOD optimization'
      })
    }

    this.analysis.recommendations = recommendations

    console.log(`   💡 Generated ${recommendations.length} recommendations`)
    recommendations.forEach(rec => {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🔵'
      console.log(`      ${icon} ${rec.title}`)
    })
  }

  async createVisualization() {
    console.log('📊 Creating bundle visualization...')
    
    // Generate HTML visualization
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KopiKala Bundle Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .chart-container {
            margin: 40px 0;
            height: 400px;
        }
        .file-list {
            margin-top: 20px;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .file-name {
            font-family: monospace;
            flex-grow: 1;
        }
        .file-size {
            color: #666;
            font-weight: bold;
        }
        .large-file {
            background: #fff3cd;
        }
        .recommendations {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .recommendation {
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid #2196F3;
            background: white;
        }
        .recommendation.high {
            border-left-color: #f44336;
        }
        .recommendation.medium {
            border-left-color: #ff9800;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 KopiKala Bundle Analysis</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${this.analysis.totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.formatBytes(this.analysis.totalSize)}</div>
                <div class="stat-label">Total Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(this.analysis.categories).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.analysis.recommendations.length}</div>
                <div class="stat-label">Recommendations</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="bundleChart"></canvas>
        </div>

        <div class="recommendations">
            <h2>💡 Optimization Recommendations</h2>
            ${this.analysis.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <h3>${rec.title}</h3>
                    <p>${rec.description}</p>
                    <strong>Suggestion:</strong> ${rec.suggestion}
                </div>
            `).join('')}
        </div>

        <h2>📁 Bundle Breakdown</h2>
        ${Object.entries(this.analysis.categories).map(([categoryName, category]) => `
            <div style="margin-bottom: 30px;">
                <h3 style="color: ${category.color};">
                    ${categoryName.toUpperCase()} 
                    (${category.count} files, ${this.formatBytes(category.totalSize)})
                </h3>
                <div class="file-list">
                    ${category.files.slice(0, 10).map(file => `
                        <div class="file-item ${file.size > SIZE_THRESHOLDS.large ? 'large-file' : ''}">
                            <span class="file-name">${file.relativePath}</span>
                            <span class="file-size">${this.formatBytes(file.size)}</span>
                        </div>
                    `).join('')}
                    ${category.files.length > 10 ? `<div class="file-item"><em>... and ${category.files.length - 10} more files</em></div>` : ''}
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        const ctx = document.getElementById('bundleChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(this.analysis.categories))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(this.analysis.categories).map(cat => cat.totalSize))},
                    backgroundColor: ${JSON.stringify(Object.values(this.analysis.categories).map(cat => cat.color))},
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const category = context.label;
                                const size = context.raw;
                                const percentage = ((size / ${this.analysis.totalSize}) * 100).toFixed(1);
                                return category + ': ' + formatBytes(size) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });

        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>`

    await writeFile(join(this.buildDir, 'bundle-analysis.html'), html)
    console.log(`   📊 Visualization saved: bundle-analysis.html`)
  }

  async generateReport() {
    console.log('📋 Generating detailed report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.analysis.totalFiles,
        totalSize: this.analysis.totalSize,
        categories: Object.keys(this.analysis.categories).length,
        recommendations: this.analysis.recommendations.length
      },
      categories: this.analysis.categories,
      recommendations: this.analysis.recommendations,
      duplicates: this.analysis.duplicates,
      dependencies: this.analysis.dependencies,
      largestFiles: Array.from(this.bundles.values())
        .sort((a, b) => b.size - a.size)
        .slice(0, 20)
        .map(bundle => ({
          path: bundle.relativePath,
          size: bundle.size,
          category: bundle.category
        })),
      metadata: {
        buildDir: this.buildDir,
        analyzer: 'KopiKala Bundle Analyzer v1.0.0'
      }
    }

    await writeFile(
      join(this.buildDir, 'bundle-analysis.json'),
      JSON.stringify(report, null, 2)
    )

    console.log(`   📋 Report saved: bundle-analysis.json`)
  }

  // Helper methods
  async findAllFiles(dir) {
    const files = []
    
    async function traverse(currentDir) {
      try {
        const entries = await readdir(currentDir)
        
        for (const entry of entries) {
          const fullPath = join(currentDir, entry)
          const stats = await stat(fullPath)
          
          if (stats.isDirectory()) {
            await traverse(fullPath)
          } else {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }
    
    await traverse(dir)
    return files
  }

  shouldSkipFile(filename) {
    const skipPatterns = [
      '.map',
      '.txt',
      '.md',
      '.LICENSE',
      'CHANGELOG',
      'README'
    ]
    
    return skipPatterns.some(pattern => 
      filename.includes(pattern) || filename.startsWith('.')
    )
  }

  isAssetFile(ext) {
    return ['.glb', '.gltf', '.wasm', '.png', '.jpg', '.jpeg', '.webp', '.ktx2', '.hdr'].includes(ext.toLowerCase())
  }

  isCodeFile(ext) {
    return ['.js', '.ts', '.css'].includes(ext.toLowerCase())
  }

  isWebGLFile(filename) {
    const webglPatterns = ['three', 'tres', 'draco', 'basis', 'webgl', 'gltf']
    return webglPatterns.some(pattern => filename.toLowerCase().includes(pattern))
  }

  matchesCategory(bundle, patterns) {
    const searchText = (bundle.filename + bundle.extension).toLowerCase()
    return patterns.some(pattern => searchText.includes(pattern.toLowerCase()))
  }

  async getFileHash(filePath) {
    try {
      const content = await readFile(filePath)
      return createHash('md5').update(content).digest('hex').substring(0, 8)
    } catch (error) {
      return 'unknown'
    }
  }

  async loadPackageJson() {
    try {
      const content = await readFile('package.json', 'utf8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }

  isDependencyUsed(depName) {
    // Simple heuristic: check if dependency name appears in any bundle
    for (const [path, bundle] of this.bundles) {
      if (bundle.filename.toLowerCase().includes(depName.toLowerCase())) {
        return true
      }
    }
    return false
  }

  isWebGLDependency(depName) {
    const webglDeps = ['three', '@tresjs', 'gltf', 'draco', 'basis', 'webgl']
    return webglDeps.some(pattern => depName.toLowerCase().includes(pattern))
  }

  estimateDependencySize(depName) {
    // Rough estimates for common dependencies
    const estimates = {
      'three': 1200 * 1024,
      '@tresjs/core': 300 * 1024,
      'vue': 400 * 1024,
      'gsap': 200 * 1024,
      'pinia': 100 * 1024
    }
    
    return estimates[depName] || 50 * 1024 // Default 50KB
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  printSummary() {
    console.log('')
    console.log('📋 Bundle Analysis Summary')
    console.log('═'.repeat(50))
    
    console.log(`📦 Total files: ${this.analysis.totalFiles}`)
    console.log(`📏 Total size: ${this.formatBytes(this.analysis.totalSize)}`)
    console.log('')
    
    console.log('📊 Category breakdown:')
    for (const [categoryName, category] of Object.entries(this.analysis.categories)) {
      if (category.count > 0) {
        const percentage = (category.totalSize / this.analysis.totalSize * 100).toFixed(1)
        console.log(`   ${categoryName}: ${this.formatBytes(category.totalSize)} (${percentage}%)`)
      }
    }
    
    if (this.analysis.recommendations.length > 0) {
      console.log('')
      console.log('💡 Key recommendations:')
      this.analysis.recommendations.slice(0, 3).forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🔵'
        console.log(`   ${icon} ${rec.title}`)
      })
    }
    
    console.log('')
    console.log(`📊 View detailed analysis: ${this.buildDir}/bundle-analysis.html`)
    console.log('✨ Bundle analysis complete!')
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Bundle Analyzer for KopiKala Platform

Usage: node bundle-analyzer.js [build-dir]

Options:
  build-dir   Build directory to analyze (default: dist)
  --help, -h  Show this help message

Features:
  • Bundle size analysis and categorization
  • WebGL asset identification
  • Duplicate code detection
  • Dependency analysis
  • Interactive HTML visualization
  • Optimization recommendations

Categories:
  • Main: Application code
  • Vendor: Third-party dependencies  
  • WebGL: 3D and WebGL libraries
  • Assets: 3D models and WebGL assets
  • Styles: CSS and styling
  • Runtime: Runtime and polyfills

Examples:
  node bundle-analyzer.js
  node bundle-analyzer.js ./dist
`)
    process.exit(0)
  }

  const buildDir = args[0] || 'dist'
  const analyzer = new BundleAnalyzer(buildDir)
  await analyzer.analyze()
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

export { BundleAnalyzer, BUNDLE_CATEGORIES, SIZE_THRESHOLDS }
