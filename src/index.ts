// Main Hook
export { useOfflineSync } from "./hooks/useOfflineSync";

// Context Provider
export {
  OfflineSyncProvider,
  useOfflineSyncContext,
} from "./context/OfflineSyncContext";

// Types
export type {
  SyncConfig,
  QueueItem,
  SyncStatus,
  StorageAdapter,
  UseOfflineSyncReturn,
  OfflineSyncContextValue,
  ConflictResolutionOptions,
  BackgroundSyncOptions,
  LogEntry,
} from "./types";

// Storage Adapters
export {
  createStorageAdapter,
  LocalStorageAdapter,
  IndexedDBAdapter,
} from "./adapters/storage";

// Core Managers
export { SyncManager } from "./core/SyncManager";
export { QueueManager } from "./core/QueueManager";

// Utilities
export { NetworkManager } from "./utils/network";
export { Logger } from "./utils/logger";
export { BackgroundSyncManager } from "./utils/backgroundSync";
