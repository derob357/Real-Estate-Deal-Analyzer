"use client"

import { useState, useEffect } from "react"
import { X, Download, Smartphone, Monitor, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PWAService } from "@/services/PWAService"

interface PWAInstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
}

export default function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [platform, setPlatform] = useState<string>('unknown')
  const [pwaService] = useState(() => PWAService.getInstance())

  useEffect(() => {
    const checkInstallability = () => {
      const canInstall = pwaService.canInstall()
      const platform = pwaService.getPlatform()

      setIsVisible(canInstall)
      setPlatform(platform)
    }

    // Check initial state
    checkInstallability()

    // Listen for PWA events
    const handleInstallAvailable = () => {
      setIsVisible(true)
      checkInstallability()
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      onInstall?.()
    }

    pwaService.addEventListener('pwa:install-available', handleInstallAvailable)
    pwaService.addEventListener('pwa:app-installed', handleAppInstalled)

    return () => {
      pwaService.removeEventListener('pwa:install-available', handleInstallAvailable)
      pwaService.removeEventListener('pwa:app-installed', handleAppInstalled)
    }
  }, [pwaService, onInstall])

  const handleInstall = async () => {
    setIsInstalling(true)

    try {
      const success = await pwaService.promptInstall()
      if (success) {
        setIsVisible(false)
        onInstall?.()
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()

    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Smartphone className="h-6 w-6" />
      case 'android':
        return <Smartphone className="h-6 w-6" />
      case 'desktop':
        return <Monitor className="h-6 w-6" />
      default:
        return <Tablet className="h-6 w-6" />
    }
  }

  const getPlatformInstructions = () => {
    switch (platform) {
      case 'ios':
        return {
          title: 'Install on iPhone/iPad',
          description: 'Add CRE Analyzer to your home screen for quick access and offline capabilities.',
          instructions: [
            'Tap the Share button in Safari',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to install the app'
          ]
        }
      case 'android':
        return {
          title: 'Install on Android',
          description: 'Get the full app experience with offline access and push notifications.',
          instructions: [
            'Tap "Install" to add to your device',
            'The app will work offline',
            'Receive property alerts instantly'
          ]
        }
      case 'desktop':
        return {
          title: 'Install on Desktop',
          description: 'Install CRE Analyzer as a desktop app for faster access and better performance.',
          instructions: [
            'Click "Install" to add to your computer',
            'Launch from your desktop or start menu',
            'Works offline with synced data'
          ]
        }
      default:
        return {
          title: 'Install CRE Analyzer',
          description: 'Get the full app experience with offline capabilities.',
          instructions: [
            'Install for offline access',
            'Faster loading times',
            'Native app experience'
          ]
        }
    }
  }

  // Don't show if dismissed this session or not visible
  if (!isVisible || sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  const platformInfo = getPlatformInstructions()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                {getPlatformIcon()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{platformInfo.title}</h3>
                <p className="text-sm text-gray-600">CRE Analyzer</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {platformInfo.description}
          </p>

          <div className="space-y-2 mb-6">
            {platformInfo.instructions.map((instruction, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-gray-700">{instruction}</span>
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              Not Now
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Offline access</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Push notifications</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Faster loading</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
