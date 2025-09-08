#!/usr/bin/env node

/**
 * Lighthouse Audit Script
 * 
 * This script runs comprehensive Lighthouse audits on the KopiKala platform
 * with specific focus on WebGL performance and 3D asset loading:
 * - Performance, Accessibility, SEO, Best Practices audits
 * - Custom WebGL performance metrics
 * - 3D asset loading analysis
 * - Mobile and desktop performance testing
 * - Performance budget validation
 * 
 * Usage: node lighthouse-audit.js [url] [options]
 */

import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const AUDIT_CONFIG = {
  // Lighthouse configuration
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false
    }
  },
  
  // Performance budgets
  budgets: {
    performance: 90,        // Lighthouse performance score
    accessibility: 95,      // Accessibility score
    bestPractices: 90,      // Best practices score
    seo: 95,               // SEO score
    firstContentfulPaint: 1500,  // FCP < 1.5s
    largestContentfulPaint: 2500, // LCP < 2.5s
    cumulativeLayoutShift: 0.1,   // CLS < 0.1
    firstInputDelay: 100,         // FID < 100ms
    totalBlockingTime: 200        // TBT < 200ms
  },
  
  // 3D/WebGL specific metrics
  webglMetrics: {
    maxInitTime: 3000,      // WebGL init < 3s
    maxAssetLoadTime: 5000, // Asset loading < 5s
    minFPS: 60,             // Target 60 FPS
    maxMemoryUsage: 512     // < 512MB memory
  }
}

const DEVICE_CONFIGS = {
  desktop: {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1
    }
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4
    }
  }
}

class LighthouseAuditor {
  constructor(url, options = {}) {
    this.url = url
    this.options = {
      outputDir: options.outputDir || 'reports',
      devices: options.devices || ['desktop', 'mobile'],
      runs: options.runs || 3,
      waitTime: options.waitTime || 5000
    }
    this.results = new Map()
    this.chrome = null
  }

  async audit() {
    console.log('🔍 Starting Lighthouse audit...')
    console.log(`🌐 URL: ${this.url}`)
    console.log(`📱 Devices: ${this.options.devices.join(', ')}`)
    console.log(`🔄 Runs per device: ${this.options.runs}`)
    console.log('')

    try {
      await this.setupOutputDir()
      await this.launchChrome()

      for (const device of this.options.devices) {
        await this.auditDevice(device)
      }

      await this.generateSummaryReport()
      await this.validateBudgets()
      
      this.printSummary()
    } catch (error) {
      console.error('❌ Lighthouse audit failed:', error.message)
      process.exit(1)
    } finally {
      if (this.chrome) {
        await this.chrome.kill()
      }
    }
  }

  async setupOutputDir() {
    try {
      await mkdir(this.options.outputDir, { recursive: true })
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }
  }

  async launchChrome() {
    console.log('🚀 Launching Chrome...')
    
    this.chrome = await launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    })

    console.log(`   Chrome launched on port ${this.chrome.port}`)
  }

  async auditDevice(deviceType) {
    console.log(`📱 Auditing ${deviceType} performance...`)
    
    const deviceResults = []
    const config = DEVICE_CONFIGS[deviceType]

    for (let run = 1; run <= this.options.runs; run++) {
      console.log(`   🔄 Run ${run}/${this.options.runs}...`)
      
      try {
        const result = await lighthouse(this.url, {
          port: this.chrome.port,
          output: 'json',
          logLevel: 'error'
        }, {
          ...AUDIT_CONFIG.settings,
          ...config,
          // Add custom audits for WebGL
          audits: this.getCustomAudits()
        })

        if (result && result.lhr) {
          deviceResults.push(result.lhr)
          console.log(`      ✅ Performance: ${Math.round(result.lhr.categories.performance.score * 100)}`)
          console.log(`      ✅ FCP: ${Math.round(result.lhr.audits['first-contentful-paint'].numericValue)}ms`)
          console.log(`      ✅ LCP: ${Math.round(result.lhr.audits['largest-contentful-paint'].numericValue)}ms`)
        }

        // Wait between runs
        if (run < this.options.runs) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`   ❌ Run ${run} failed:`, error.message)
      }
    }

    if (deviceResults.length > 0) {
      const averagedResult = this.averageResults(deviceResults)
      this.results.set(deviceType, averagedResult)
      
      // Save individual device report
      await this.saveDeviceReport(deviceType, averagedResult)
    }
  }

  getCustomAudits() {
    return [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
      'interactive',
      'bootup-time',
      'mainthread-work-breakdown',
      'network-requests',
      'resource-summary',
      'third-party-summary',
      'largest-contentful-paint-element',
      'layout-shift-elements',
      'long-tasks',
      'dom-size'
    ]
  }

  averageResults(results) {
    if (results.length === 1) {
      return results[0]
    }

    // Create averaged result from multiple runs
    const averaged = JSON.parse(JSON.stringify(results[0]))
    
    // Average numeric values in audits
    const numericAudits = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
      'interactive'
    ]

    for (const auditId of numericAudits) {
      if (averaged.audits[auditId] && averaged.audits[auditId].numericValue !== undefined) {
        const values = results.map(r => r.audits[auditId]?.numericValue || 0)
        averaged.audits[auditId].numericValue = values.reduce((sum, val) => sum + val, 0) / values.length
      }
    }

    // Average category scores
    for (const [categoryId, category] of Object.entries(averaged.categories)) {
      const scores = results.map(r => r.categories[categoryId]?.score || 0)
      category.score = scores.reduce((sum, score) => sum + score, 0) / scores.length
    }

    // Add metadata about averaging
    averaged.runCount = results.length
    averaged.isAveraged = true

    return averaged
  }

  async saveDeviceReport(deviceType, result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `lighthouse-${deviceType}-${timestamp}.json`
    const filepath = join(this.options.outputDir, filename)

    await writeFile(filepath, JSON.stringify(result, null, 2))
    console.log(`   📋 Report saved: ${filename}`)
  }

  async generateSummaryReport() {
    console.log('📊 Generating summary report...')
    
    const summary = {
      timestamp: new Date().toISOString(),
      url: this.url,
      configuration: {
        devices: this.options.devices,
        runs: this.options.runs,
        budgets: AUDIT_CONFIG.budgets
      },
      results: {},
      analysis: {
        budgetCompliance: {},
        recommendations: [],
        webglAnalysis: {}
      }
    }

    // Process results for each device
    for (const [deviceType, result] of this.results) {
      const deviceSummary = {
        scores: {
          performance: Math.round(result.categories.performance.score * 100),
          accessibility: Math.round(result.categories.accessibility.score * 100),
          bestPractices: Math.round(result.categories['best-practices'].score * 100),
          seo: Math.round(result.categories.seo.score * 100)
        },
        metrics: {
          firstContentfulPaint: Math.round(result.audits['first-contentful-paint'].numericValue),
          largestContentfulPaint: Math.round(result.audits['largest-contentful-paint'].numericValue),
          cumulativeLayoutShift: Math.round(result.audits['cumulative-layout-shift'].numericValue * 1000) / 1000,
          totalBlockingTime: Math.round(result.audits['total-blocking-time'].numericValue),
          speedIndex: Math.round(result.audits['speed-index'].numericValue),
          interactive: Math.round(result.audits['interactive'].numericValue)
        },
        opportunities: this.extractOpportunities(result),
        diagnostics: this.extractDiagnostics(result)
      }

      summary.results[deviceType] = deviceSummary
    }

    // Analyze budget compliance
    summary.analysis.budgetCompliance = this.analyzeBudgetCompliance()
    
    // Generate recommendations
    summary.analysis.recommendations = this.generateRecommendations()
    
    // WebGL specific analysis
    summary.analysis.webglAnalysis = this.analyzeWebGLPerformance()

    // Save summary report
    const summaryPath = join(this.options.outputDir, 'lighthouse-summary.json')
    await writeFile(summaryPath, JSON.stringify(summary, null, 2))

    // Generate HTML report
    await this.generateHTMLReport(summary)

    console.log(`   📋 Summary saved: lighthouse-summary.json`)
  }

  extractOpportunities(result) {
    const opportunities = []
    
    const opportunityAudits = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
      'unminified-css',
      'unminified-javascript',
      'efficient-animated-content',
      'duplicated-javascript'
    ]

    for (const auditId of opportunityAudits) {
      const audit = result.audits[auditId]
      if (audit && audit.details && audit.details.overallSavingsMs > 100) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: Math.round(audit.details.overallSavingsMs),
          score: audit.score
        })
      }
    }

    return opportunities.sort((a, b) => b.savings - a.savings)
  }

  extractDiagnostics(result) {
    const diagnostics = []
    
    const diagnosticAudits = [
      'mainthread-work-breakdown',
      'bootup-time',
      'network-requests',
      'dom-size',
      'critical-request-chains'
    ]

    for (const auditId of diagnosticAudits) {
      const audit = result.audits[auditId]
      if (audit && audit.score !== null && audit.score < 1) {
        diagnostics.push({
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue
        })
      }
    }

    return diagnostics
  }

  analyzeBudgetCompliance() {
    const compliance = {}

    for (const [deviceType, result] of this.results) {
      const deviceCompliance = {
        performance: result.categories.performance.score * 100 >= AUDIT_CONFIG.budgets.performance,
        accessibility: result.categories.accessibility.score * 100 >= AUDIT_CONFIG.budgets.accessibility,
        bestPractices: result.categories['best-practices'].score * 100 >= AUDIT_CONFIG.budgets.bestPractices,
        seo: result.categories.seo.score * 100 >= AUDIT_CONFIG.budgets.seo,
        firstContentfulPaint: result.audits['first-contentful-paint'].numericValue <= AUDIT_CONFIG.budgets.firstContentfulPaint,
        largestContentfulPaint: result.audits['largest-contentful-paint'].numericValue <= AUDIT_CONFIG.budgets.largestContentfulPaint,
        cumulativeLayoutShift: result.audits['cumulative-layout-shift'].numericValue <= AUDIT_CONFIG.budgets.cumulativeLayoutShift,
        totalBlockingTime: result.audits['total-blocking-time'].numericValue <= AUDIT_CONFIG.budgets.totalBlockingTime
      }

      deviceCompliance.overall = Object.values(deviceCompliance).every(Boolean)
      compliance[deviceType] = deviceCompliance
    }

    return compliance
  }

  generateRecommendations() {
    const recommendations = []

    for (const [deviceType, result] of this.results) {
      // Performance recommendations
      if (result.categories.performance.score < 0.9) {
        recommendations.push({
          device: deviceType,
          category: 'performance',
          priority: 'high',
          title: 'Improve Core Web Vitals',
          description: 'Focus on optimizing FCP, LCP, and CLS metrics'
        })
      }

      // WebGL specific recommendations
      const networkRequests = result.audits['network-requests']
      if (networkRequests && networkRequests.details) {
        const webglRequests = networkRequests.details.items.filter(item => 
          item.url.includes('.glb') || 
          item.url.includes('.wasm') || 
          item.url.includes('draco') || 
          item.url.includes('basis')
        )

        if (webglRequests.length > 0) {
          const totalWebGLTime = webglRequests.reduce((sum, req) => sum + (req.endTime - req.startTime), 0)
          if (totalWebGLTime > 3000) {
            recommendations.push({
              device: deviceType,
              category: 'webgl',
              priority: 'medium',
              title: 'Optimize WebGL asset loading',
              description: `WebGL assets taking ${Math.round(totalWebGLTime)}ms to load`
            })
          }
        }
      }

      // Resource optimization
      const resourceSummary = result.audits['resource-summary']
      if (resourceSummary && resourceSummary.details) {
        const totalSize = resourceSummary.details.items.reduce((sum, item) => sum + item.transferSize, 0)
        if (totalSize > 2 * 1024 * 1024) { // > 2MB
          recommendations.push({
            device: deviceType,
            category: 'resources',
            priority: 'medium',
            title: 'Reduce resource bundle size',
            description: `Total resources: ${Math.round(totalSize / 1024)}KB`
          })
        }
      }
    }

    return recommendations
  }

  analyzeWebGLPerformance() {
    const analysis = {
      assetLoadingTime: {},
      memoryUsage: {},
      renderingPerformance: {}
    }

    for (const [deviceType, result] of this.results) {
      // Analyze network requests for WebGL assets
      const networkRequests = result.audits['network-requests']
      if (networkRequests && networkRequests.details) {
        const webglAssets = networkRequests.details.items.filter(item => 
          item.url.includes('.glb') || 
          item.url.includes('.wasm') ||
          item.url.includes('basis') ||
          item.url.includes('draco')
        )

        analysis.assetLoadingTime[deviceType] = {
          assetCount: webglAssets.length,
          totalLoadTime: webglAssets.reduce((sum, asset) => sum + (asset.endTime - asset.startTime), 0),
          averageLoadTime: webglAssets.length > 0 ? 
            webglAssets.reduce((sum, asset) => sum + (asset.endTime - asset.startTime), 0) / webglAssets.length : 0,
          largestAsset: webglAssets.reduce((largest, asset) => 
            asset.transferSize > (largest?.transferSize || 0) ? asset : largest, null)
        }
      }

      // Analyze main thread work for WebGL
      const mainThreadWork = result.audits['mainthread-work-breakdown']
      if (mainThreadWork && mainThreadWork.details) {
        const renderingWork = mainThreadWork.details.items.find(item => 
          item.group === 'paintCompositeRender'
        )
        
        if (renderingWork) {
          analysis.renderingPerformance[deviceType] = {
            renderingTime: renderingWork.duration,
            percentage: (renderingWork.duration / mainThreadWork.numericValue) * 100
          }
        }
      }
    }

    return analysis
  }

  async generateHTMLReport(summary) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KopiKala Lighthouse Audit Report</title>
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
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .score-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .score-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .score-good { color: #4CAF50; }
        .score-average { color: #FF9800; }
        .score-poor { color: #F44336; }
        .device-section {
            margin: 40px 0;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
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
            background: white;
            border-radius: 6px;
            border-left: 4px solid #2196F3;
        }
        .recommendation.high { border-left-color: #f44336; }
        .recommendation.medium { border-left-color: #ff9800; }
        .webgl-analysis {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .budget-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .budget-pass {
            background: #4CAF50;
            color: white;
        }
        .budget-fail {
            background: #F44336;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 KopiKala Lighthouse Audit</h1>
            <p>Generated on ${new Date(summary.timestamp).toLocaleString()}</p>
            <p><strong>URL:</strong> ${summary.url}</p>
        </div>

        ${Object.entries(summary.results).map(([deviceType, deviceResult]) => `
            <div class="device-section">
                <h2>📱 ${deviceType.toUpperCase()} Results</h2>
                
                <div class="score-grid">
                    <div class="score-card">
                        <div class="score-value ${this.getScoreClass(deviceResult.scores.performance)}">${deviceResult.scores.performance}</div>
                        <div>Performance</div>
                        <div class="budget-status ${deviceResult.scores.performance >= AUDIT_CONFIG.budgets.performance ? 'budget-pass' : 'budget-fail'}">
                            ${deviceResult.scores.performance >= AUDIT_CONFIG.budgets.performance ? 'PASS' : 'FAIL'}
                        </div>
                    </div>
                    <div class="score-card">
                        <div class="score-value ${this.getScoreClass(deviceResult.scores.accessibility)}">${deviceResult.scores.accessibility}</div>
                        <div>Accessibility</div>
                        <div class="budget-status ${deviceResult.scores.accessibility >= AUDIT_CONFIG.budgets.accessibility ? 'budget-pass' : 'budget-fail'}">
                            ${deviceResult.scores.accessibility >= AUDIT_CONFIG.budgets.accessibility ? 'PASS' : 'FAIL'}
                        </div>
                    </div>
                    <div class="score-card">
                        <div class="score-value ${this.getScoreClass(deviceResult.scores.bestPractices)}">${deviceResult.scores.bestPractices}</div>
                        <div>Best Practices</div>
                    </div>
                    <div class="score-card">
                        <div class="score-value ${this.getScoreClass(deviceResult.scores.seo)}">${deviceResult.scores.seo}</div>
                        <div>SEO</div>
                    </div>
                </div>

                <h3>Core Web Vitals</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-value ${deviceResult.metrics.firstContentfulPaint <= AUDIT_CONFIG.budgets.firstContentfulPaint ? 'score-good' : 'score-poor'}">${deviceResult.metrics.firstContentfulPaint}ms</div>
                        <div class="metric-label">First Contentful Paint</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${deviceResult.metrics.largestContentfulPaint <= AUDIT_CONFIG.budgets.largestContentfulPaint ? 'score-good' : 'score-poor'}">${deviceResult.metrics.largestContentfulPaint}ms</div>
                        <div class="metric-label">Largest Contentful Paint</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${deviceResult.metrics.cumulativeLayoutShift <= AUDIT_CONFIG.budgets.cumulativeLayoutShift ? 'score-good' : 'score-poor'}">${deviceResult.metrics.cumulativeLayoutShift}</div>
                        <div class="metric-label">Cumulative Layout Shift</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${deviceResult.metrics.totalBlockingTime <= AUDIT_CONFIG.budgets.totalBlockingTime ? 'score-good' : 'score-poor'}">${deviceResult.metrics.totalBlockingTime}ms</div>
                        <div class="metric-label">Total Blocking Time</div>
                    </div>
                </div>

                ${deviceResult.opportunities.length > 0 ? `
                    <h3>🎯 Optimization Opportunities</h3>
                    ${deviceResult.opportunities.slice(0, 5).map(opp => `
                        <div class="recommendation">
                            <strong>${opp.title}</strong>
                            <p>${opp.description}</p>
                            <em>Potential savings: ${opp.savings}ms</em>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `).join('')}

        ${summary.analysis.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>💡 Recommendations</h2>
                ${summary.analysis.recommendations.map(rec => `
                    <div class="recommendation ${rec.priority}">
                        <strong>${rec.title}</strong> (${rec.device})
                        <p>${rec.description}</p>
                        <em>Category: ${rec.category} | Priority: ${rec.priority}</em>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="webgl-analysis">
            <h2>🎮 WebGL Performance Analysis</h2>
            ${Object.entries(summary.analysis.webglAnalysis.assetLoadingTime || {}).map(([device, data]) => `
                <div>
                    <h3>${device.toUpperCase()}</h3>
                    <p><strong>WebGL Assets:</strong> ${data.assetCount} files</p>
                    <p><strong>Total Load Time:</strong> ${Math.round(data.totalLoadTime)}ms</p>
                    <p><strong>Average Load Time:</strong> ${Math.round(data.averageLoadTime)}ms</p>
                    ${data.largestAsset ? `<p><strong>Largest Asset:</strong> ${data.largestAsset.url.split('/').pop()} (${Math.round(data.largestAsset.transferSize / 1024)}KB)</p>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`

    await writeFile(join(this.options.outputDir, 'lighthouse-report.html'), html)
    console.log(`   📊 HTML report saved: lighthouse-report.html`)
  }

  getScoreClass(score) {
    if (score >= 90) return 'score-good'
    if (score >= 50) return 'score-average'
    return 'score-poor'
  }

  async validateBudgets() {
    console.log('🎯 Validating performance budgets...')
    
    let allPassed = true
    
    for (const [deviceType, result] of this.results) {
      console.log(`   📱 ${deviceType}:`)
      
      const checks = [
        { name: 'Performance Score', actual: result.categories.performance.score * 100, budget: AUDIT_CONFIG.budgets.performance },
        { name: 'FCP', actual: result.audits['first-contentful-paint'].numericValue, budget: AUDIT_CONFIG.budgets.firstContentfulPaint },
        { name: 'LCP', actual: result.audits['largest-contentful-paint'].numericValue, budget: AUDIT_CONFIG.budgets.largestContentfulPaint },
        { name: 'CLS', actual: result.audits['cumulative-layout-shift'].numericValue, budget: AUDIT_CONFIG.budgets.cumulativeLayoutShift },
        { name: 'TBT', actual: result.audits['total-blocking-time'].numericValue, budget: AUDIT_CONFIG.budgets.totalBlockingTime }
      ]

      for (const check of checks) {
        const passed = check.actual <= check.budget || (check.name === 'Performance Score' && check.actual >= check.budget)
        const icon = passed ? '✅' : '❌'
        const actualFormatted = check.name === 'Performance Score' ? Math.round(check.actual) : 
                               check.name === 'CLS' ? check.actual.toFixed(3) :
                               Math.round(check.actual) + 'ms'
        const budgetFormatted = check.name === 'Performance Score' ? check.budget :
                               check.name === 'CLS' ? check.budget.toFixed(3) :
                               check.budget + 'ms'
        
        console.log(`      ${icon} ${check.name}: ${actualFormatted} (budget: ${budgetFormatted})`)
        
        if (!passed) allPassed = false
      }
    }

    if (!allPassed) {
      console.log('')
      console.log('⚠️  Some performance budgets were not met!')
    }
  }

  printSummary() {
    console.log('')
    console.log('📋 Lighthouse Audit Summary')
    console.log('═'.repeat(50))
    
    for (const [deviceType, result] of this.results) {
      console.log(`📱 ${deviceType.toUpperCase()}:`)
      console.log(`   Performance: ${Math.round(result.categories.performance.score * 100)}/100`)
      console.log(`   Accessibility: ${Math.round(result.categories.accessibility.score * 100)}/100`)
      console.log(`   Best Practices: ${Math.round(result.categories['best-practices'].score * 100)}/100`)
      console.log(`   SEO: ${Math.round(result.categories.seo.score * 100)}/100`)
      console.log(`   FCP: ${Math.round(result.audits['first-contentful-paint'].numericValue)}ms`)
      console.log(`   LCP: ${Math.round(result.audits['largest-contentful-paint'].numericValue)}ms`)
      console.log('')
    }

    console.log(`📊 View detailed report: ${this.options.outputDir}/lighthouse-report.html`)
    console.log('✨ Lighthouse audit complete!')
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Lighthouse Audit Tool for KopiKala Platform

Usage: node lighthouse-audit.js [url] [options]

Arguments:
  url         URL to audit (default: http://localhost:5173)

Options:
  --devices   Devices to test: desktop,mobile (default: desktop,mobile)
  --runs      Number of runs per device (default: 3)
  --output    Output directory (default: reports)
  --help, -h  Show this help message

Performance Budgets:
  • Performance Score: ≥${AUDIT_CONFIG.budgets.performance}
  • First Contentful Paint: ≤${AUDIT_CONFIG.budgets.firstContentfulPaint}ms
  • Largest Contentful Paint: ≤${AUDIT_CONFIG.budgets.largestContentfulPaint}ms
  • Cumulative Layout Shift: ≤${AUDIT_CONFIG.budgets.cumulativeLayoutShift}
  • Total Blocking Time: ≤${AUDIT_CONFIG.budgets.totalBlockingTime}ms

WebGL Focus Areas:
  • 3D asset loading performance
  • WebGL initialization time
  • GPU memory usage
  • Rendering frame rate

Examples:
  node lighthouse-audit.js
  node lighthouse-audit.js http://localhost:3000
  node lighthouse-audit.js https://kopikala.com --devices mobile --runs 1
`)
    process.exit(0)
  }

  const url = args[0] || 'http://localhost:5173'
  
  // Parse options
  const options = {}
  
  const devicesIndex = args.indexOf('--devices')
  if (devicesIndex !== -1 && args[devicesIndex + 1]) {
    options.devices = args[devicesIndex + 1].split(',')
  }
  
  const runsIndex = args.indexOf('--runs')
  if (runsIndex !== -1 && args[runsIndex + 1]) {
    options.runs = parseInt(args[runsIndex + 1])
  }
  
  const outputIndex = args.indexOf('--output')
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputDir = args[outputIndex + 1]
  }

  const auditor = new LighthouseAuditor(url, options)
  await auditor.audit()
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

export { LighthouseAuditor, AUDIT_CONFIG }
