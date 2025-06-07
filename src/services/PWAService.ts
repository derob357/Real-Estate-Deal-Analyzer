interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallationState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
}

interface OfflineData {
  properties: any[]
  marketData: { [zipCode: string]: any }
  portfolioData: any[]
  alerts: any[]
  lastSync: Date
}

export class PWAService {
  private static instance: PWAService
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private installationState: PWAInstallationState
  private offlineData: OfflineData
  private onlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  private constructor() {
    this.installationState = this.detectInstallationState()
    this.offlineData = this.loadOfflineData()
    if (typeof window !== 'undefined') {
      this.initializeEventListeners()
    }
  }

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService()
    }
    return PWAService.instance
  }

  async initialize(): Promise<void> {
    console.log('📱 Initializing PWA Service...')

    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker()
      }

      // Initialize push notifications
      if ('Notification' in window) {
        await this.initializePushNotifications()
      }

      // Set up periodic background sync
      this.setupBackgroundSync()

      console.log('✅ PWA Service initialized successfully')
    } catch (error) {
      console.error('❌ PWA Service initialization failed:', error)
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      this.serviceWorkerRegistration = registration

      console.log('✅ Service Worker registered successfully')

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.notifyAppUpdate()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data)
      })

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
    }
  }

  private initializeEventListeners(): void {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent
      this.installationState.isInstallable = true
      this.notifyInstallAvailable()
    })

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA installed successfully')
      this.installationState.isInstalled = true
      this.deferredPrompt = null
      this.notifyAppInstalled()
    })

    // Listen for online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored')
      this.onlineStatus = true
      this.handleOnlineStatusChange(true)
    })

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost')
      this.onlineStatus = false
      this.handleOnlineStatusChange(false)
    })

    // Listen for visibility changes (app focus/blur)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleAppFocus()
      }
    })
  }

  private detectInstallationState(): PWAInstallationState {
    if (typeof window === 'undefined') {
      return {
        isInstallable: false,
        isInstalled: false,
        isStandalone: false,
        platform: 'unknown'
      }
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true

    const platform = this.detectPlatform()

    return {
      isInstallable: false,
      isInstalled: isStandalone,
      isStandalone,
      platform
    }
  }

  private detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    if (typeof navigator === 'undefined') {
      return 'unknown'
    }

    const userAgent = navigator.userAgent.toLowerCase()

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios'
    } else if (/android/.test(userAgent)) {
      return 'android'
    } else if (/windows|macintosh|linux/.test(userAgent)) {
      return 'desktop'
    }

    return 'unknown'
  }

  // Installation Methods
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('No install prompt available')
      return false
    }

    try {
      await this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice

      console.log('PWA install prompt result:', outcome)

      if (outcome === 'accepted') {
        this.deferredPrompt = null
        return true
      }

      return false
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  canInstall(): boolean {
    return this.installationState.isInstallable && !this.installationState.isInstalled
  }

  isInstalled(): boolean {
    return this.installationState.isInstalled
  }

  isStandalone(): boolean {
    return this.installationState.isStandalone
  }

  getPlatform(): string {
    return this.installationState.platform
  }

  // Offline Data Management
  private loadOfflineData(): OfflineData {
    if (typeof localStorage === 'undefined') {
      return {
        properties: [],
        marketData: {},
        portfolioData: [],
        alerts: [],
        lastSync: new Date()
      }
    }

    try {
      const stored = localStorage.getItem('pwa-offline-data')
      if (stored) {
        const data = JSON.parse(stored)
        return {
          ...data,
          lastSync: new Date(data.lastSync)
        }
      }
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }

    return {
      properties: [],
      marketData: {},
      portfolioData: [],
      alerts: [],
      lastSync: new Date()
    }
  }

  saveOfflineData(data: Partial<OfflineData>): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      this.offlineData = {
        ...this.offlineData,
        ...data,
        lastSync: new Date()
      }

      localStorage.setItem('pwa-offline-data', JSON.stringify(this.offlineData))
      console.log('💾 Offline data saved')
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }

  getOfflineData(): OfflineData {
    return this.offlineData
  }

  isOnline(): boolean {
    return this.onlineStatus
  }

  // Push Notifications
  private async initializePushNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.warn('Service Worker not available for push notifications')
      return
    }

    try {
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        console.log('✅ Push notifications enabled')

        // Subscribe to push notifications
        const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
          )
        })

        // Send subscription to server
        await this.sendSubscriptionToServer(subscription)
      } else {
        console.log('❌ Push notifications denied')
      }
    } catch (error) {
      console.error('Push notification setup failed:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      })
      console.log('✅ Push subscription sent to server')
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  // Background Sync
  private setupBackgroundSync(): void {
    if (!this.serviceWorkerRegistration) return

    // Register for background sync
    if ('sync' in this.serviceWorkerRegistration && (this.serviceWorkerRegistration as any).sync) {
      // Property alerts sync
      (this.serviceWorkerRegistration as any).sync.register('property-alerts-sync')
        .then(() => console.log('📬 Background sync registered for property alerts'))
        .catch((err: any) => console.error('Background sync registration failed:', err))

      // Portfolio sync
      (this.serviceWorkerRegistration as any).sync.register('portfolio-sync')
        .then(() => console.log('📊 Background sync registered for portfolio'))
        .catch((err: any) => console.error('Portfolio sync registration failed:', err))
    }
  }

  async requestBackgroundSync(tag: string): Promise<void> {
    if (!this.serviceWorkerRegistration || !(this.serviceWorkerRegistration as any).sync) {
      console.warn('Background sync not supported')
      return
    }

    try {
      await (this.serviceWorkerRegistration as any).sync.register(tag)
      console.log(`🔄 Background sync requested: ${tag}`)
    } catch (error) {
      console.error(`Background sync request failed for ${tag}:`, error)
    }
  }

  // Event Handlers
  private handleServiceWorkerMessage(data: any): void {
    console.log('📨 Message from Service Worker:', data)

    switch (data.type) {
      case 'CACHE_UPDATED':
        this.notifyCacheUpdated(data.cacheName)
        break
      case 'SYNC_COMPLETE':
        this.notifySyncComplete(data.tag)
        break
      case 'OFFLINE_FALLBACK':
        this.notifyOfflineFallback()
        break
    }
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    if (isOnline) {
      // Sync offline changes when back online
      this.syncOfflineChanges()
      this.notifyConnectionRestored()
    } else {
      this.notifyConnectionLost()
    }
  }

  private handleAppFocus(): void {
    // Check for updates when app regains focus
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.update()
    }
  }

  private async syncOfflineChanges(): Promise<void> {
    console.log('🔄 Syncing offline changes...')

    try {
      // Sync portfolio changes
      await this.requestBackgroundSync('portfolio-sync')

      // Sync alert changes
      await this.requestBackgroundSync('property-alerts-sync')

      console.log('✅ Offline sync initiated')
    } catch (error) {
      console.error('Offline sync failed:', error)
    }
  }

  // Notification Methods
  private notifyInstallAvailable(): void {
    console.log('📱 PWA installation available')
    this.dispatchEvent('pwa:install-available')
  }

  private notifyAppInstalled(): void {
    console.log('🎉 PWA installed successfully')
    this.dispatchEvent('pwa:app-installed')
  }

  private notifyAppUpdate(): void {
    console.log('🔄 App update available')
    this.dispatchEvent('pwa:update-available')
  }

  private notifyCacheUpdated(cacheName: string): void {
    console.log(`💾 Cache updated: ${cacheName}`)
    this.dispatchEvent('pwa:cache-updated', { cacheName })
  }

  private notifySyncComplete(tag: string): void {
    console.log(`✅ Background sync complete: ${tag}`)
    this.dispatchEvent('pwa:sync-complete', { tag })
  }

  private notifyOfflineFallback(): void {
    console.log('📴 Using offline fallback')
    this.dispatchEvent('pwa:offline-fallback')
  }

  private notifyConnectionRestored(): void {
    console.log('🌐 Connection restored')
    this.dispatchEvent('pwa:connection-restored')
  }

  private notifyConnectionLost(): void {
    console.log('📴 Connection lost')
    this.dispatchEvent('pwa:connection-lost')
  }

  private dispatchEvent(type: string, detail?: any): void {
    window.dispatchEvent(new CustomEvent(type, { detail }))
  }

  // Public API for components to use
  addEventListener(type: string, listener: EventListener): void {
    window.addEventListener(type, listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    window.removeEventListener(type, listener)
  }

  // Utility methods for app features
  async shareData(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share(data)
        return true
      } catch (error) {
        console.error('Share failed:', error)
        return false
      }
    } else {
      // Fallback to clipboard
      if (navigator.clipboard && data.url) {
        try {
          await navigator.clipboard.writeText(data.url)
          return true
        } catch (error) {
          console.error('Clipboard write failed:', error)
          return false
        }
      }
      return false
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist()
        console.log('Persistent storage:', granted ? 'granted' : 'denied')
        return granted
      } catch (error) {
        console.error('Persistent storage request failed:', error)
        return false
      }
    }
    return false
  }

  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        return await navigator.storage.estimate()
      } catch (error) {
        console.error('Storage estimate failed:', error)
        return null
      }
    }
    return null
  }
}
