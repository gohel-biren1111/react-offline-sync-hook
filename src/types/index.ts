export interface SyncConfig {
  storageAdapter: "localStorage" | "indexedDB";
  apiEndpoint: string;
  retryAttempts?: number;
  retryDelay?: number;
  batchSize?: number;
  conflictResolution?:
    | "client-wins"
    | "server-wins"
    | "last-write-wins"
    | "custom";
  customConflictHandler?: (local: any, remote: any) => any;
  enableBackgroundSync?: boolean;
  syncInterval?: number;
  headers?: Record<string, string>;
}

export interface QueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  data: any;
  timestamp: number;
  retryCount: number;
  endpoint?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingItems: number;
  error: string | null;
}

export interface StorageAdapter {
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface UseOfflineSyncReturn<T = any> {
  data: T[];
  status: SyncStatus;
  error: Error | null;
  syncNow: () => Promise<void>;
  addItem: (item: Omit<T, "id">) => Promise<void>;
  updateItem: (id: string, updates: Partial<T>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearData: () => Promise<void>;
}

export interface OfflineSyncContextValue {
  config: SyncConfig;
  isOnline: boolean;
  globalSync: () => Promise<void>;
}

export interface ConflictResolutionOptions {
  strategy: "client-wins" | "server-wins" | "last-write-wins" | "custom";
  customHandler?: (local: any, remote: any) => any;
}

export interface BackgroundSyncOptions {
  tag: string;
  data: QueueItem[];
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  data?: any;
}
