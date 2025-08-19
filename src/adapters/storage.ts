import { StorageAdapter } from "../types";

// LocalStorage Adapter
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = "offline-sync") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async getItem(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("LocalStorage getItem error:", error);
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error("LocalStorage setItem error:", error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error("LocalStorage removeItem error:", error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("LocalStorage clear error:", error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.prefix}:`)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error("LocalStorage getAllKeys error:", error);
      return [];
    }
  }
}

// IndexedDB Adapter
export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor(dbName = "OfflineSyncDB", storeName = "syncData", version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  async getItem(key: string): Promise<any> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
      });
    } catch (error) {
      console.error("IndexedDB getItem error:", error);
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, value });

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error("IndexedDB setItem error:", error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error("IndexedDB removeItem error:", error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error("IndexedDB clear error:", error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error("IndexedDB getAllKeys error:", error);
      return [];
    }
  }
}

// Factory function to create storage adapter
export function createStorageAdapter(
  type: "localStorage" | "indexedDB"
): StorageAdapter {
  switch (type) {
    case "localStorage":
      return new LocalStorageAdapter();
    case "indexedDB":
      return new IndexedDBAdapter();
    default:
      throw new Error(`Unsupported storage adapter type: ${type}`);
  }
}
