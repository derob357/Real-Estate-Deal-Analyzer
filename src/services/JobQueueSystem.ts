interface Job {
  id: string
  type: 'scraping' | 'data_processing' | 'market_analysis' | 'tax_lookup'
  priority: 1 | 2 | 3 | 4 | 5 // 1 = highest
  payload: any
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
  errorMessage?: string
  result?: any
}

interface JobProgress {
  jobId: string
  progress: number // 0-100
  message: string
  currentStep?: string
}

export class JobQueueSystem {
  private static instance: JobQueueSystem
  private jobs: Map<string, Job> = new Map()
  private queue: Job[] = []
  private runningJobs: Set<string> = new Set()
  private maxConcurrentJobs = 3
  private isProcessing = false
  private progressCallbacks: Map<string, (progress: JobProgress) => void> = new Map()

  static getInstance(): JobQueueSystem {
    if (!JobQueueSystem.instance) {
      JobQueueSystem.instance = new JobQueueSystem()
    }
    return JobQueueSystem.instance
  }

  generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  addJob(
    type: Job['type'],
    payload: any,
    priority: Job['priority'] = 3,
    maxAttempts: number = 3
  ): string {
    const job: Job = {
      id: this.generateJobId(),
      type,
      priority,
      payload,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts
    }

    this.jobs.set(job.id, job)
    this.queue.push(job)
    this.sortQueue()

    console.log(`📝 Job ${job.id} added to queue (${type}, priority ${priority})`)

    if (!this.isProcessing) {
      this.processQueue()
    }

    return job.id
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by priority first (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    console.log('🔄 Processing job queue...')

    while (this.queue.length > 0 && this.runningJobs.size < this.maxConcurrentJobs) {
      const job = this.queue.shift()
      if (!job || this.runningJobs.has(job.id)) continue

      this.runningJobs.add(job.id)
      this.executeJob(job).finally(() => {
        this.runningJobs.delete(job.id)
      })
    }

    // Schedule next queue processing
    setTimeout(() => {
      this.isProcessing = false
      if (this.queue.length > 0) {
        this.processQueue()
      }
    }, 1000)
  }

  private async executeJob(job: Job): Promise<void> {
    job.status = 'running'
    job.startedAt = new Date()
    job.attempts++

    console.log(`▶️ Executing job ${job.id} (${job.type})`)
    this.updateProgress(job.id, 0, 'Starting job...')

    try {
      let result: any

      switch (job.type) {
        case 'scraping':
          result = await this.executeScraping(job)
          break
        case 'data_processing':
          result = await this.executeDataProcessing(job)
          break
        case 'market_analysis':
          result = await this.executeMarketAnalysis(job)
          break
        case 'tax_lookup':
          result = await this.executeTaxLookup(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
      this.updateProgress(job.id, 100, 'Job completed successfully')

      console.log(`✅ Job ${job.id} completed successfully`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Job ${job.id} failed:`, errorMessage)

      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying'
        job.errorMessage = errorMessage

        // Re-add to queue for retry
        setTimeout(() => {
          this.queue.unshift(job)
          this.sortQueue()
        }, 5000 * job.attempts) // Exponential backoff

        console.log(`🔄 Job ${job.id} will retry (attempt ${job.attempts + 1}/${job.maxAttempts})`)
      } else {
        job.status = 'failed'
        job.completedAt = new Date()
        job.errorMessage = errorMessage
        this.updateProgress(job.id, 0, `Job failed: ${errorMessage}`)
      }
    }
  }

  private async executeScraping(job: Job): Promise<any> {
    const { platform, searchCriteria } = job.payload

    this.updateProgress(job.id, 10, 'Initializing scraper...')

    // Simulate scraping with progress updates
    await new Promise(resolve => setTimeout(resolve, 1000))
    this.updateProgress(job.id, 30, 'Connecting to platform...')

    await new Promise(resolve => setTimeout(resolve, 2000))
    this.updateProgress(job.id, 60, 'Scraping property data...')

    await new Promise(resolve => setTimeout(resolve, 1500))
    this.updateProgress(job.id, 90, 'Processing results...')

    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      platform,
      propertiesFound: Math.floor(Math.random() * 20) + 5,
      searchCriteria,
      scrapedAt: new Date()
    }
  }

  private async executeDataProcessing(job: Job): Promise<any> {
    const { data, operation } = job.payload

    this.updateProgress(job.id, 20, 'Loading data...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    this.updateProgress(job.id, 50, 'Normalizing data...')
    await new Promise(resolve => setTimeout(resolve, 1500))

    this.updateProgress(job.id, 80, 'Deduplicating records...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      operation,
      recordsProcessed: Array.isArray(data) ? data.length : 1,
      duplicatesRemoved: Math.floor(Math.random() * 5),
      processedAt: new Date()
    }
  }

  private async executeMarketAnalysis(job: Job): Promise<any> {
    const { zipCode, analysisType } = job.payload

    this.updateProgress(job.id, 25, 'Gathering market data...')
    await new Promise(resolve => setTimeout(resolve, 1200))

    this.updateProgress(job.id, 50, 'Calculating metrics...')
    await new Promise(resolve => setTimeout(resolve, 1800))

    this.updateProgress(job.id, 75, 'Generating insights...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      zipCode,
      analysisType,
      averageCapRate: 0.055 + Math.random() * 0.03,
      averagePricePerSqft: 150 + Math.random() * 100,
      totalProperties: Math.floor(Math.random() * 50) + 10,
      analyzedAt: new Date()
    }
  }

  private async executeTaxLookup(job: Job): Promise<any> {
    const { address, city, state } = job.payload

    this.updateProgress(job.id, 30, 'Connecting to tax assessor...')
    await new Promise(resolve => setTimeout(resolve, 1500))

    this.updateProgress(job.id, 70, 'Retrieving tax data...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
      address,
      assessedValue: 1000000 + Math.random() * 2000000,
      taxYear: 2024,
      annualTaxes: 15000 + Math.random() * 30000,
      retrievedAt: new Date()
    }
  }

  private updateProgress(jobId: string, progress: number, message: string): void {
    const callback = this.progressCallbacks.get(jobId)
    if (callback) {
      callback({ jobId, progress, message })
    }
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null
  }

  getJobStatus(jobId: string): Job['status'] | null {
    const job = this.jobs.get(jobId)
    return job ? job.status : null
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  getJobsByStatus(status: Job['status']): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status)
  }

  getQueueStats(): {
    totalJobs: number
    pending: number
    running: number
    completed: number
    failed: number
    queueLength: number
  } {
    const allJobs = this.getAllJobs()
    return {
      totalJobs: allJobs.length,
      pending: allJobs.filter(j => j.status === 'pending').length,
      running: allJobs.filter(j => j.status === 'running').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      queueLength: this.queue.length
    }
  }

  subscribeToProgress(jobId: string, callback: (progress: JobProgress) => void): void {
    this.progressCallbacks.set(jobId, callback)
  }

  unsubscribeFromProgress(jobId: string): void {
    this.progressCallbacks.delete(jobId)
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job || job.status === 'running' || job.status === 'completed') {
      return false
    }

    // Remove from queue
    const queueIndex = this.queue.findIndex(j => j.id === jobId)
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1)
    }

    job.status = 'failed'
    job.errorMessage = 'Job cancelled by user'
    job.completedAt = new Date()

    return true
  }

  // Schedule recurring jobs
  scheduleRecurringJob(
    type: Job['type'],
    payload: any,
    intervalMs: number,
    priority: Job['priority'] = 3
  ): string {
    const schedulerId = `scheduler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const schedule = () => {
      this.addJob(type, payload, priority)
      setTimeout(schedule, intervalMs)
    }

    // Start first job immediately
    schedule()

    console.log(`⏰ Scheduled recurring ${type} job every ${intervalMs}ms`)
    return schedulerId
  }

  // Utility methods for common job types
  scheduleScraping(platform: string, searchCriteria: any, priority: Job['priority'] = 2): string {
    return this.addJob('scraping', { platform, searchCriteria }, priority)
  }

  scheduleDataProcessing(data: any, operation: string, priority: Job['priority'] = 3): string {
    return this.addJob('data_processing', { data, operation }, priority)
  }

  scheduleMarketAnalysis(zipCode: string, analysisType: string, priority: Job['priority'] = 3): string {
    return this.addJob('market_analysis', { zipCode, analysisType }, priority)
  }

  scheduleTaxLookup(address: string, city: string, state: string, priority: Job['priority'] = 4): string {
    return this.addJob('tax_lookup', { address, city, state }, priority)
  }
}
