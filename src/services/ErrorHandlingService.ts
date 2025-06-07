interface ErrorLog {
  id: string
  timestamp: Date
  level: 'error' | 'warning' | 'info'
  service: string
  operation: string
  message: string
  stack?: string
  metadata?: any
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

interface PerformanceMetric {
  id: string
  timestamp: Date
  service: string
  operation: string
  duration: number
  success: boolean
  metadata?: any
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded'
      lastCheck: Date
      responseTime: number
      errorRate: number
    }
  }
  metrics: {
    totalRequests: number
    errorRate: number
    averageResponseTime: number
    uptime: number
  }
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService
  private errorLogs: ErrorLog[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private maxLogs = 1000
  private maxMetrics = 5000

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService()
    }
    return ErrorHandlingService.instance
  }

  logError(
    service: string,
    operation: string,
    error: Error | string,
    metadata?: any,
    level: 'error' | 'warning' | 'info' = 'error'
  ): string {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      service,
      operation,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      metadata,
      resolved: false
    }

    this.errorLogs.unshift(errorLog)

    // Keep only recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${service}] ${operation}:`, error, metadata)
    }

    // In production, this would send to external monitoring service
    this.sendToMonitoring(errorLog)

    return errorLog.id
  }

  logPerformance(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void {
    const metric: PerformanceMetric = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      service,
      operation,
      duration,
      success,
      metadata
    }

    this.performanceMetrics.unshift(metric)

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(0, this.maxMetrics)
    }

    // Log slow operations
    if (duration > 5000) { // 5 seconds
      this.logError(
        service,
        operation,
        `Slow operation detected: ${duration}ms`,
        { duration, metadata },
        'warning'
      )
    }
  }

  async withErrorHandling<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      this.logPerformance(service, operation, duration, true, metadata)
      return result

    } catch (error) {
      const duration = Date.now() - startTime

      this.logError(service, operation, error as Error, metadata)
      this.logPerformance(service, operation, duration, false, metadata)

      throw error
    }
  }

  withSyncErrorHandling<T>(
    service: string,
    operation: string,
    fn: () => T,
    metadata?: any
  ): T {
    const startTime = Date.now()

    try {
      const result = fn()
      const duration = Date.now() - startTime

      this.logPerformance(service, operation, duration, true, metadata)
      return result

    } catch (error) {
      const duration = Date.now() - startTime

      this.logError(service, operation, error as Error, metadata)
      this.logPerformance(service, operation, duration, false, metadata)

      throw error
    }
  }

  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errorLogs.slice(0, limit)
  }

  getErrorsByService(service: string, limit: number = 50): ErrorLog[] {
    return this.errorLogs
      .filter(log => log.service === service)
      .slice(0, limit)
  }

  getUnresolvedErrors(): ErrorLog[] {
    return this.errorLogs.filter(log => !log.resolved)
  }

  markErrorResolved(errorId: string, resolvedBy: string): boolean {
    const error = this.errorLogs.find(log => log.id === errorId)
    if (error) {
      error.resolved = true
      error.resolvedAt = new Date()
      error.resolvedBy = resolvedBy
      return true
    }
    return false
  }

  getSystemHealth(): SystemHealth {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get recent metrics
    const recentMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp >= oneHourAgo
    )

    const recentErrors = this.errorLogs.filter(
      log => log.timestamp >= oneHourAgo && log.level === 'error'
    )

    // Calculate service-level health
    const services: { [serviceName: string]: any } = {}
    const serviceNames = [...new Set(recentMetrics.map(m => m.service))]

    for (const serviceName of serviceNames) {
      const serviceMetrics = recentMetrics.filter(m => m.service === serviceName)
      const serviceErrors = recentErrors.filter(e => e.service === serviceName)

      const totalRequests = serviceMetrics.length
      const errorCount = serviceErrors.length
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
      const avgResponseTime = serviceMetrics.length > 0
        ? serviceMetrics.reduce((sum, m) => sum + m.duration, 0) / serviceMetrics.length
        : 0

      let status: 'up' | 'down' | 'degraded'
      if (errorRate > 50) status = 'down'
      else if (errorRate > 10 || avgResponseTime > 10000) status = 'degraded'
      else status = 'up'

      services[serviceName] = {
        status,
        lastCheck: now,
        responseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      }
    }

    // Calculate overall metrics
    const totalRequests = recentMetrics.length
    const totalErrors = recentErrors.length
    const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0

    // Determine overall system status
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy'
    const downServices = Object.values(services).filter((s: any) => s.status === 'down').length
    const degradedServices = Object.values(services).filter((s: any) => s.status === 'degraded').length

    if (downServices > 0 || overallErrorRate > 25) {
      systemStatus = 'unhealthy'
    } else if (degradedServices > 0 || overallErrorRate > 5) {
      systemStatus = 'degraded'
    } else {
      systemStatus = 'healthy'
    }

    return {
      status: systemStatus,
      services,
      metrics: {
        totalRequests,
        errorRate: Math.round(overallErrorRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        uptime: this.calculateUptime()
      }
    }
  }

  private calculateUptime(): number {
    // Simplified uptime calculation - in production would track actual service start time
    const now = Date.now()
    const serviceStartTime = now - (24 * 60 * 60 * 1000) // Assume 24h uptime for demo
    return Math.round(((now - serviceStartTime) / (24 * 60 * 60 * 1000)) * 100 * 100) / 100
  }

  getErrorStatistics(timeRange: 'hour' | 'day' | 'week' = 'day'): {
    totalErrors: number
    errorsByLevel: { [level: string]: number }
    errorsByService: { [service: string]: number }
    trendDirection: 'up' | 'down' | 'stable'
  } {
    const now = new Date()
    let startTime: Date

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const relevantErrors = this.errorLogs.filter(log => log.timestamp >= startTime)

    const errorsByLevel: { [level: string]: number } = {}
    const errorsByService: { [service: string]: number } = {}

    for (const error of relevantErrors) {
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1
      errorsByService[error.service] = (errorsByService[error.service] || 0) + 1
    }

    // Calculate trend (simplified)
    const midpoint = new Date(startTime.getTime() + (now.getTime() - startTime.getTime()) / 2)
    const firstHalfErrors = relevantErrors.filter(e => e.timestamp < midpoint).length
    const secondHalfErrors = relevantErrors.filter(e => e.timestamp >= midpoint).length

    let trendDirection: 'up' | 'down' | 'stable'
    const changePercent = firstHalfErrors > 0 ? ((secondHalfErrors - firstHalfErrors) / firstHalfErrors) * 100 : 0

    if (changePercent > 20) trendDirection = 'up'
    else if (changePercent < -20) trendDirection = 'down'
    else trendDirection = 'stable'

    return {
      totalErrors: relevantErrors.length,
      errorsByLevel,
      errorsByService,
      trendDirection
    }
  }

  private sendToMonitoring(errorLog: ErrorLog): void {
    // In production, this would send to services like:
    // - Sentry
    // - DataDog
    // - New Relic
    // - Custom monitoring endpoint

    if (process.env.NODE_ENV === 'production') {
      // Example: Send to webhook
      // fetch('/api/monitoring/error', {
      //   method: 'POST',
      //   body: JSON.stringify(errorLog)
      // }).catch(console.error)
    }
  }

  // Health check methods for different services
  async checkDatabaseHealth(): Promise<{ status: 'up' | 'down'; responseTime: number }> {
    const startTime = Date.now()

    try {
      // Simple database ping - replace with actual database check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

      return {
        status: 'up',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      this.logError('database', 'health_check', error as Error)
      return {
        status: 'down',
        responseTime: Date.now() - startTime
      }
    }
  }

  async checkExternalAPIHealth(apiName: string, url: string): Promise<{ status: 'up' | 'down'; responseTime: number }> {
    const startTime = Date.now()

    try {
      // In production, this would make actual API calls
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200))

      return {
        status: 'up',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      this.logError('external_api', `health_check_${apiName}`, error as Error)
      return {
        status: 'down',
        responseTime: Date.now() - startTime
      }
    }
  }

  // Alerting methods
  shouldAlert(errorLog: ErrorLog): boolean {
    // Alert conditions
    if (errorLog.level === 'error' && errorLog.service === 'database') return true
    if (errorLog.message.toLowerCase().includes('timeout')) return true
    if (errorLog.message.toLowerCase().includes('memory')) return true

    return false
  }

  async sendAlert(errorLog: ErrorLog): Promise<void> {
    // In production, this would send alerts via:
    // - Email
    // - Slack
    // - PagerDuty
    // - SMS

    console.log(`🚨 ALERT: ${errorLog.service} - ${errorLog.message}`)
  }
}
