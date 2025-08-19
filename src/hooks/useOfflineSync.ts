import { useState, useEffect, useCallback, useRef } from "react";
import {
  SyncConfig,
  UseOfflineSyncReturn,
  SyncStatus,
  StorageAdapter,
} from "../types";
import { SyncManager } from "../core/SyncManager";
import { createStorageAdapter } from "../adapters/storage";
import { NetworkManager } from "../utils/network";
import { BackgroundSyncManager } from "../utils/backgroundSync";

export function useOfflineSync<T = any>(
  key: string,
  config: SyncConfig,
  initialData: T[] = []
): UseOfflineSyncReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingItems: 0,
    error: null,
  });
  const [error, setError] = useState<Error | null>(null);

  const storageAdapterRef = useRef<StorageAdapter>();
  const syncManagerRef = useRef<SyncManager>();
  const networkManagerRef = useRef<NetworkManager>();
  const backgroundSyncRef = useRef<BackgroundSyncManager>();

  // Initialize managers
  useEffect(() => {
    try {
      storageAdapterRef.current = createStorageAdapter(config.storageAdapter);
      syncManagerRef.current = new SyncManager(
        storageAdapterRef.current,
        config
      );
      networkManagerRef.current = new NetworkManager();

      if (config.enableBackgroundSync) {
        backgroundSyncRef.current = new BackgroundSyncManager();
        backgroundSyncRef.current.register();
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [config]);

  // Load initial data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!storageAdapterRef.current) return;

        const storedData = await storageAdapterRef.current.getItem(
          `data:${key}`
        );
        if (storedData) {
          setData(storedData);
        }
      } catch (err) {
        setError(err as Error);
      }
    };

    loadData();
  }, [key]);

  // Network status monitoring
  useEffect(() => {
    if (!networkManagerRef.current) return;

    const updateStatus = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: networkManagerRef.current!.isOnline(),
      }));
    };

    updateStatus();

    const unsubscribeOnline = networkManagerRef.current.onOnline(() => {
      updateStatus();
      // Auto-sync when coming back online
      syncNow();
    });

    const unsubscribeOffline =
      networkManagerRef.current.onOffline(updateStatus);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, []);

  // Periodic sync
  useEffect(() => {
    if (!config.syncInterval) return;

    const interval = setInterval(() => {
      if (status.isOnline && !status.isSyncing) {
        syncNow();
      }
    }, config.syncInterval);

    return () => clearInterval(interval);
  }, [config.syncInterval, status.isOnline, status.isSyncing]);

  // Update pending items count
  useEffect(() => {
    const updatePendingCount = async () => {
      if (!syncManagerRef.current) return;

      try {
        const pendingItems = await syncManagerRef.current.getQueueSize();
        setStatus((prev) => ({ ...prev, pendingItems }));
      } catch (err) {
        console.error("Failed to get pending items count:", err);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!syncManagerRef.current || status.isSyncing) return;

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    setError(null);

    try {
      await syncManagerRef.current.sync();

      // Reload data after sync
      const updatedData = await storageAdapterRef.current!.getItem(
        `data:${key}`
      );
      if (updatedData) {
        setData(updatedData);
      }

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sync failed";
      setError(err as Error);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));
    }
  }, [key, status.isSyncing]);

  const addItem = useCallback(
    async (item: Omit<T, "id">): Promise<void> => {
      try {
        const newItem = {
          ...item,
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as T;

        // Update local data
        const updatedData = [...data, newItem];
        setData(updatedData);

        // Store locally
        await storageAdapterRef.current!.setItem(`data:${key}`, updatedData);

        // Add to sync queue
        await syncManagerRef.current!.addToQueue("create", newItem);

        // Schedule background sync if enabled
        if (config.enableBackgroundSync && backgroundSyncRef.current) {
          await backgroundSyncRef.current.scheduleSync({
            tag: "offline-sync",
            data: [
              {
                operation: "create",
                data: newItem,
                id: "",
                timestamp: 0,
                retryCount: 0,
              },
            ],
          });
        }

        // Auto-sync if online
        if (status.isOnline) {
          setTimeout(syncNow, 100);
        }
      } catch (err) {
        setError(err as Error);
      }
    },
    [data, key, status.isOnline, syncNow, config.enableBackgroundSync]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<T>): Promise<void> => {
      try {
        const updatedData = data.map((item) =>
          (item as any).id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : item
        );

        setData(updatedData);
        await storageAdapterRef.current!.setItem(`data:${key}`, updatedData);

        const updatedItem = updatedData.find((item) => (item as any).id === id);
        if (updatedItem) {
          await syncManagerRef.current!.addToQueue("update", updatedItem);

          if (config.enableBackgroundSync && backgroundSyncRef.current) {
            await backgroundSyncRef.current.scheduleSync({
              tag: "offline-sync",
              data: [
                {
                  operation: "update",
                  data: updatedItem,
                  id: "",
                  timestamp: 0,
                  retryCount: 0,
                },
              ],
            });
          }

          if (status.isOnline) {
            setTimeout(syncNow, 100);
          }
        }
      } catch (err) {
        setError(err as Error);
      }
    },
    [data, key, status.isOnline, syncNow, config.enableBackgroundSync]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        const itemToDelete = data.find((item) => (item as any).id === id);
        if (!itemToDelete) return;

        const updatedData = data.filter((item) => (item as any).id !== id);
        setData(updatedData);
        await storageAdapterRef.current!.setItem(`data:${key}`, updatedData);

        await syncManagerRef.current!.addToQueue("delete", { id });

        if (config.enableBackgroundSync && backgroundSyncRef.current) {
          await backgroundSyncRef.current.scheduleSync({
            tag: "offline-sync",
            data: [
              {
                operation: "delete",
                data: { id },
                id: "",
                timestamp: 0,
                retryCount: 0,
              },
            ],
          });
        }

        if (status.isOnline) {
          setTimeout(syncNow, 100);
        }
      } catch (err) {
        setError(err as Error);
      }
    },
    [data, key, status.isOnline, syncNow, config.enableBackgroundSync]
  );

  const clearData = useCallback(async (): Promise<void> => {
    try {
      setData([]);
      await storageAdapterRef.current!.setItem(`data:${key}`, []);
      await syncManagerRef.current!.clearQueue();
    } catch (err) {
      setError(err as Error);
    }
  }, [key]);

  return {
    data,
    status,
    error,
    syncNow,
    addItem,
    updateItem,
    deleteItem,
    clearData,
  };
}
