"use client";

import { useEffect, useState } from "react";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { PWAService } from "@/services/PWAService";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pwaService] = useState(() => PWAService.getInstance());
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Remove any extension-added classes during hydration
    document.body.className = "antialiased";

    // Initialize PWA service
    const initializePWA = async () => {
      try {
        await pwaService.initialize();
        console.log("✅ PWA Service initialized in ClientBody");

        // Check if install prompt should be shown
        setTimeout(() => {
          if (pwaService.canInstall()) {
            setShowInstallPrompt(true);
          }
        }, 3000); // Show after 3 seconds
      } catch (error) {
        console.error("❌ PWA initialization failed:", error);
      }
    };

    initializePWA();

    // Set up PWA event listeners
    const handleInstallAvailable = () => {
      setShowInstallPrompt(true);
    };

    const handleConnectionRestored = () => {
      setIsOnline(true);
      console.log("🌐 Connection restored");
    };

    const handleConnectionLost = () => {
      setIsOnline(false);
      console.log("📴 Connection lost - app running in offline mode");
    };

    const handleUpdateAvailable = () => {
      console.log("🔄 App update available");
      // Could show an update notification here
    };

    // Listen for PWA events
    pwaService.addEventListener("pwa:install-available", handleInstallAvailable);
    pwaService.addEventListener("pwa:connection-restored", handleConnectionRestored);
    pwaService.addEventListener("pwa:connection-lost", handleConnectionLost);
    pwaService.addEventListener("pwa:update-available", handleUpdateAvailable);

    // Set initial online status
    setIsOnline(pwaService.isOnline());

    return () => {
      pwaService.removeEventListener("pwa:install-available", handleInstallAvailable);
      pwaService.removeEventListener("pwa:connection-restored", handleConnectionRestored);
      pwaService.removeEventListener("pwa:connection-lost", handleConnectionLost);
      pwaService.removeEventListener("pwa:update-available", handleUpdateAvailable);
    };
  }, [pwaService]);

  return (
    <div className="antialiased">
      {children}

      {/* Connection Status Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center py-2 text-sm">
          📴 You're offline - Some features may be limited
        </div>
      )}

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <PWAInstallPrompt
          onInstall={() => {
            setShowInstallPrompt(false);
            console.log("🎉 PWA installed!");
          }}
          onDismiss={() => {
            setShowInstallPrompt(false);
            console.log("📱 PWA install dismissed");
          }}
        />
      )}
    </div>
  );
}
