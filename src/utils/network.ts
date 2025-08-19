export class NetworkManager {
  private onlineListeners: Set<() => void> = new Set();
  private offlineListeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));
    }
  }

  isOnline(): boolean {
    if (typeof navigator === "undefined") {
      return true; // SSR fallback
    }
    return navigator.onLine;
  }

  onOnline(callback: () => void): () => void {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  onOffline(callback: () => void): () => void {
    this.offlineListeners.add(callback);
    return () => this.offlineListeners.delete(callback);
  }

  private handleOnline(): void {
    this.onlineListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in online callback:", error);
      }
    });
  }

  private handleOffline(): void {
    this.offlineListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in offline callback:", error);
      }
    });
  }

  cleanup(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline.bind(this));
      window.removeEventListener("offline", this.handleOffline.bind(this));
    }
    this.onlineListeners.clear();
    this.offlineListeners.clear();
  }
}
