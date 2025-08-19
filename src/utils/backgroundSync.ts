import { BackgroundSyncOptions } from "../types";

export class BackgroundSyncManager {
  private swRegistration: ServiceWorkerRegistration | any = null;

  async register(): Promise<void> {
    if (
      !("serviceWorker" in navigator) ||
      !("sync" in window.ServiceWorkerRegistration.prototype)
    ) {
      console.warn("Background sync not supported");
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register(
        "/offline-sync-sw.js"
      );
      console.log("Service worker registered for background sync");
    } catch (error) {
      console.error("Failed to register service worker:", error);
    }
  }

  async scheduleSync(options: BackgroundSyncOptions): Promise<void> {
    if (!this.swRegistration || !this.swRegistration.sync) {
      console.warn("Background sync not available");
      return;
    }

    try {
      // Store data for sync
      await this.storeDataForSync(options.data);

      // Register background sync
      await this.swRegistration.sync.register(options.tag);
      console.log("Background sync scheduled:", options.tag);
    } catch (error) {
      console.error("Failed to schedule background sync:", error);
    }
  }

  private async storeDataForSync(data: any[]): Promise<void> {
    try {
      localStorage.setItem("pending-sync-data", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to store sync data:", error);
    }
  }

  static generateServiceWorkerScript(): string {
    return `
self.addEventListener('sync', function(event) {
  if (event.tag === 'offline-sync') {
    event.waitUntil(performSync());
  }
});

async function performSync() {
  try {
    const pendingData = localStorage.getItem('pending-sync-data');
    if (!pendingData) return;

    const data = JSON.parse(pendingData);
    
    // Send data to server
    for (const item of data) {
      try {
        const response = await fetch(item.endpoint || '/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        });

        if (response.ok) {
          console.log('Background sync successful for item:', item.id);
        } else {
          console.error('Background sync failed for item:', item.id);
        }
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }

    // Clear pending data after successful sync
    localStorage.removeItem('pending-sync-data');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
`;
  }
}
