import { renderHook, act } from "@testing-library/react";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { SyncConfig } from "../types";

const mockConfig: SyncConfig = {
  storageAdapter: "localStorage",
  apiEndpoint: "https://api.example.com/todos",
  retryAttempts: 3,
  conflictResolution: "last-write-wins",
};

describe("useOfflineSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with empty data", () => {
    const { result } = renderHook(() => useOfflineSync("test", mockConfig, []));

    expect(result.current.data).toEqual([]);
    expect(result.current.status.isOnline).toBe(true);
    expect(result.current.status.isSyncing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should add item to data", async () => {
    const { result } = renderHook(() => useOfflineSync("test", mockConfig, []));

    const newItem: any = { title: "Test Todo", completed: false };

    await act(async () => {
      await result.current.addItem(newItem);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toMatchObject(newItem);
    expect(result.current.data[0]).toHaveProperty("id");
  });

  it("should update item in data", async () => {
    const initialData = [{ id: "1", title: "Initial Todo", completed: false }];

    const { result } = renderHook(() =>
      useOfflineSync("test", mockConfig, initialData)
    );

    await act(async () => {
      await result.current.updateItem("1", { completed: true });
    });

    expect(result.current.data[0].completed).toBe(true);
  });

  it("should delete item from data", async () => {
    const initialData = [
      { id: "1", title: "Todo to delete", completed: false },
    ];

    const { result } = renderHook(() =>
      useOfflineSync("test", mockConfig, initialData)
    );

    await act(async () => {
      await result.current.deleteItem("1");
    });

    expect(result.current.data).toHaveLength(0);
  });

  it("should clear all data", async () => {
    const initialData = [
      { id: "1", title: "Todo 1", completed: false },
      { id: "2", title: "Todo 2", completed: true },
    ];

    const { result } = renderHook(() =>
      useOfflineSync("test", mockConfig, initialData)
    );

    await act(async () => {
      await result.current.clearData();
    });

    expect(result.current.data).toHaveLength(0);
  });

  it("should handle sync errors gracefully", async () => {
    // Mock fetch to fail
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));

    const { result } = renderHook(() => useOfflineSync("test", mockConfig, []));

    await act(async () => {
      try {
        await result.current.syncNow();
      } catch (error) {
        // Expected to catch error
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.status.isSyncing).toBe(false);
  });
});
