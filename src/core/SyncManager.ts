import {
  SyncConfig,
  QueueItem,
  StorageAdapter,
  ConflictResolutionOptions,
} from "../types";
import { QueueManager } from "./QueueManager";
import { Logger } from "../utils/logger";
import { NetworkManager } from "../utils/network";

export class SyncManager {
  private storageAdapter: StorageAdapter;
  private queueManager: QueueManager;
  private config: SyncConfig;
  private logger: Logger;
  private networkManager: NetworkManager;
  private syncInProgress = false;

  constructor(storageAdapter: StorageAdapter, config: SyncConfig) {
    this.storageAdapter = storageAdapter;
    this.config = config;
    this.queueManager = new QueueManager(storageAdapter, config);
    this.logger = new Logger();
    this.networkManager = new NetworkManager();
  }

  async sync(): Promise<void> {
    if (this.syncInProgress) {
      this.logger.info("Sync already in progress, skipping");
      return;
    }

    if (!this.networkManager.isOnline()) {
      this.logger.info("Device is offline, skipping sync");
      return;
    }

    this.syncInProgress = true;
    this.logger.info("Starting sync process");

    try {
      // Process outgoing queue
      await this.processOutgoingQueue();

      // Fetch remote updates
      await this.fetchRemoteUpdates();

      // Cleanup old items
      await this.queueManager.cleanupOldItems();

      this.logger.info("Sync completed successfully");
    } catch (error) {
      this.logger.error("Sync failed", error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOutgoingQueue(): Promise<void> {
    const batch = await this.queueManager.getNextBatch();

    if (batch.length === 0) {
      this.logger.info("No items in queue to sync");
      return;
    }

    this.logger.info(`Processing ${batch.length} items from queue`);

    for (const item of batch) {
      try {
        await this.processQueueItem(item);
        await this.queueManager.removeFromQueue(item.id);
        this.logger.info("Successfully processed queue item", {
          itemId: item.id,
        });
      } catch (error) {
        this.logger.error("Failed to process queue item", {
          itemId: item.id,
          error,
        });

        if (await this.queueManager.shouldRetryItem(item)) {
          await this.queueManager.updateRetryCount(item.id);
          const delay = this.queueManager.calculateBackoffDelay(
            item.retryCount
          );
          this.logger.info(`Will retry item after ${delay}ms`, {
            itemId: item.id,
          });

          // Schedule retry
          setTimeout(() => this.retryItem(item), delay);
        } else {
          this.logger.error("Item exceeded max retry attempts", {
            itemId: item.id,
          });
          await this.queueManager.removeFromQueue(item.id);
        }
      }
    }
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    const endpoint = item.endpoint || this.config.apiEndpoint;
    const headers = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    let url = endpoint;
    let method = "POST";
    let body: string | undefined;

    switch (item.operation) {
      case "create":
        method = "POST";
        body = JSON.stringify(item.data);
        break;
      case "update":
        method = "PUT";
        url = `${endpoint}/${item.data.id}`;
        body = JSON.stringify(item.data);
        break;
      case "delete":
        method = "DELETE";
        url = `${endpoint}/${item.data.id}`;
        break;
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    this.logger.info("API request successful", {
      operation: item.operation,
      itemId: item.id,
      status: response.status,
    });

    return result;
  }

  private async retryItem(item: QueueItem): Promise<void> {
    if (!this.networkManager.isOnline()) {
      return;
    }

    try {
      await this.processQueueItem(item);
      await this.queueManager.removeFromQueue(item.id);
      this.logger.info("Retry successful", { itemId: item.id });
    } catch (error) {
      this.logger.error("Retry failed", { itemId: item.id, error });

      if (await this.queueManager.shouldRetryItem(item)) {
        await this.queueManager.updateRetryCount(item.id);
        const delay = this.queueManager.calculateBackoffDelay(item.retryCount);
        setTimeout(() => this.retryItem(item), delay);
      } else {
        await this.queueManager.removeFromQueue(item.id);
      }
    }
  }

  private async fetchRemoteUpdates(): Promise<void> {
    try {
      const response = await fetch(this.config.apiEndpoint, {
        headers: this.config.headers,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch remote updates: ${response.statusText}`
        );
      }

      const remoteData = await response.json();
      const localData = (await this.storageAdapter.getItem("data")) || [];

      // Resolve conflicts and merge data
      const mergedData = await this.resolveConflicts(localData, remoteData);
      await this.storageAdapter.setItem("data", mergedData);

      this.logger.info("Remote updates fetched and merged successfully");
    } catch (error) {
      this.logger.error("Failed to fetch remote updates", error);
      throw error;
    }
  }

  private async resolveConflicts(
    localData: any[],
    remoteData: any[]
  ): Promise<any[]> {
    const strategy = this.config.conflictResolution || "last-write-wins";

    switch (strategy) {
      case "client-wins":
        return this.clientWinsResolution(localData, remoteData);
      case "server-wins":
        return this.serverWinsResolution(localData, remoteData);
      case "last-write-wins":
        return this.lastWriteWinsResolution(localData, remoteData);
      case "custom":
        return this.customResolution(localData, remoteData);
      default:
        return this.lastWriteWinsResolution(localData, remoteData);
    }
  }

  private clientWinsResolution(localData: any[], remoteData: any[]): any[] {
    const localMap = new Map(localData.map((item) => [item.id, item]));
    const result = [...localData];

    // Add remote items that don't exist locally
    for (const remoteItem of remoteData) {
      if (!localMap.has(remoteItem.id)) {
        result.push(remoteItem);
      }
    }

    return result;
  }

  private serverWinsResolution(localData: any[], remoteData: any[]): any[] {
    const remoteMap = new Map(remoteData.map((item) => [item.id, item]));
    const result = [...remoteData];

    // Add local items that don't exist remotely
    for (const localItem of localData) {
      if (!remoteMap.has(localItem.id)) {
        result.push(localItem);
      }
    }

    return result;
  }

  private lastWriteWinsResolution(localData: any[], remoteData: any[]): any[] {
    const dataMap = new Map();

    // Add local data first
    for (const item of localData) {
      dataMap.set(item.id, item);
    }

    // Override with remote data if it's newer
    for (const item of remoteData) {
      const existing = dataMap.get(item.id);
      if (
        !existing ||
        (item.updatedAt &&
          existing.updatedAt &&
          item.updatedAt > existing.updatedAt)
      ) {
        dataMap.set(item.id, item);
      }
    }

    return Array.from(dataMap.values());
  }

  private customResolution(localData: any[], remoteData: any[]): any[] {
    if (!this.config.customConflictHandler) {
      return this.lastWriteWinsResolution(localData, remoteData);
    }

    const dataMap = new Map();

    // Add local data
    for (const item of localData) {
      dataMap.set(item.id, item);
    }

    // Resolve conflicts with custom handler
    for (const remoteItem of remoteData) {
      const localItem = dataMap.get(remoteItem.id);
      if (localItem) {
        const resolved = this.config.customConflictHandler(
          localItem,
          remoteItem
        );
        dataMap.set(remoteItem.id, resolved);
      } else {
        dataMap.set(remoteItem.id, remoteItem);
      }
    }

    return Array.from(dataMap.values());
  }

  async addToQueue(
    operation: "create" | "update" | "delete",
    data: any,
    endpoint?: string
  ): Promise<void> {
    await this.queueManager.addToQueue({
      operation,
      data,
      endpoint,
    });
  }

  async getQueueSize(): Promise<number> {
    return this.queueManager.getQueueSize();
  }

  async clearQueue(): Promise<void> {
    await this.queueManager.clearQueue();
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}
