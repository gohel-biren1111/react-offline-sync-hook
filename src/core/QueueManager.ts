import { QueueItem, StorageAdapter, SyncConfig } from "../types";
import { Logger } from "../utils/logger";

export class QueueManager {
  private storageAdapter: StorageAdapter;
  private config: SyncConfig;
  private logger: Logger;
  private queueKey = "sync-queue";

  constructor(storageAdapter: StorageAdapter, config: SyncConfig) {
    this.storageAdapter = storageAdapter;
    this.config = config;
    this.logger = new Logger();
  }

  async addToQueue(
    item: Omit<QueueItem, "id" | "timestamp" | "retryCount">
  ): Promise<void> {
    try {
      const queueItem: QueueItem = {
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
        ...item,
      };

      const queue = await this.getQueue();
      queue.push(queueItem);
      await this.storageAdapter.setItem(this.queueKey, queue);

      this.logger.info("Item added to sync queue", { itemId: queueItem.id });
    } catch (error) {
      this.logger.error("Failed to add item to queue", error);
      throw error;
    }
  }

  async getQueue(): Promise<QueueItem[]> {
    try {
      const queue = await this.storageAdapter.getItem(this.queueKey);
      return queue || [];
    } catch (error) {
      this.logger.error("Failed to get queue", error);
      return [];
    }
  }

  async getNextBatch(): Promise<QueueItem[]> {
    try {
      const queue = await this.getQueue();
      const batchSize = this.config.batchSize || 10;
      return queue.slice(0, batchSize);
    } catch (error) {
      this.logger.error("Failed to get next batch", error);
      return [];
    }
  }

  async removeFromQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.filter((item) => item.id !== itemId);
      await this.storageAdapter.setItem(this.queueKey, updatedQueue);

      this.logger.info("Item removed from sync queue", { itemId });
    } catch (error) {
      this.logger.error("Failed to remove item from queue", error);
      throw error;
    }
  }

  async updateRetryCount(itemId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const item = queue.find((q) => q.id === itemId);

      if (item) {
        item.retryCount += 1;
        await this.storageAdapter.setItem(this.queueKey, queue);
        this.logger.info("Item retry count updated", {
          itemId,
          retryCount: item.retryCount,
        });
      }
    } catch (error) {
      this.logger.error("Failed to update retry count", error);
      throw error;
    }
  }

  async getFailedItems(): Promise<QueueItem[]> {
    try {
      const queue = await this.getQueue();
      const maxRetries = this.config.retryAttempts || 3;
      return queue.filter((item) => item.retryCount >= maxRetries);
    } catch (error) {
      this.logger.error("Failed to get failed items", error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await this.storageAdapter.setItem(this.queueKey, []);
      this.logger.info("Sync queue cleared");
    } catch (error) {
      this.logger.error("Failed to clear queue", error);
      throw error;
    }
  }

  async getQueueSize(): Promise<number> {
    try {
      const queue = await this.getQueue();
      return queue.length;
    } catch (error) {
      this.logger.error("Failed to get queue size", error);
      return 0;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Exponential backoff calculation
  calculateBackoffDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
  }

  async shouldRetryItem(item: QueueItem): Promise<boolean> {
    const maxRetries = this.config.retryAttempts || 3;
    return item.retryCount < maxRetries;
  }

  // Clean up old failed items (older than 24 hours)
  async cleanupOldItems(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const maxRetries = this.config.retryAttempts || 3;

      const cleanedQueue = queue.filter((item) => {
        return item.retryCount < maxRetries || item.timestamp > oneDayAgo;
      });

      if (cleanedQueue.length !== queue.length) {
        await this.storageAdapter.setItem(this.queueKey, cleanedQueue);
        this.logger.info("Cleaned up old queue items", {
          removedCount: queue.length - cleanedQueue.length,
        });
      }
    } catch (error) {
      this.logger.error("Failed to cleanup old items", error);
    }
  }
}
