import React from "react";
import {
  OfflineSyncProvider,
  useOfflineSync,
  SyncConfig,
} from "react-offline-sync-hook";

// Define your data type
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Configuration
const syncConfig: SyncConfig = {
  storageAdapter: "indexedDB", // or 'localStorage'
  apiEndpoint: "https://your-api.com/api/todos",
  retryAttempts: 3,
  retryDelay: 1000,
  batchSize: 10,
  conflictResolution: "last-write-wins",
  enableBackgroundSync: true,
  syncInterval: 30000, // 30 seconds
  headers: {
    Authorization: "Bearer your-token",
    "Content-Type": "application/json",
  },
};

// Todo Component
const TodoApp: React.FC = () => {
  const {
    data: todos,
    status,
    error,
    syncNow,
    addItem,
    updateItem,
    deleteItem,
    clearData,
  } = useOfflineSync<Todo>("todos", syncConfig);

  const handleAddTodo = async () => {
    const newTodo = {
      title: `Todo ${Date.now()}`,
      completed: false,
    };

    await addItem(newTodo);
  };

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      await updateItem(id, { completed: !todo.completed });
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteItem(id);
  };

  return (
    <div className="todo-app">
      <header>
        <h1>Offline Todo App</h1>
        <div className="status">
          <span className={status.isOnline ? "online" : "offline"}>
            {status.isOnline ? "🟢 Online" : "🔴 Offline"}
          </span>
          {status.isSyncing && <span>🔄 Syncing...</span>}
          {status.pendingItems > 0 && (
            <span>📦 {status.pendingItems} pending</span>
          )}
          {status.lastSync && (
            <span>✅ Last sync: {status.lastSync.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="actions">
          <button onClick={handleAddTodo}>Add Todo</button>
          <button onClick={syncNow} disabled={status.isSyncing}>
            Manual Sync
          </button>
          <button onClick={clearData}>Clear All</button>
        </div>
      </header>

      {error && <div className="error">❌ Error: {error.message}</div>}

      <div className="todo-list">
        {todos.length === 0 ? (
          <p>No todos yet. Add one!</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`todo-item ${todo.completed ? "completed" : ""}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleTodo(todo.id)}
              />
              <span>{todo.title}</span>
              <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// App with Provider
const App: React.FC = () => {
  return (
    <OfflineSyncProvider config={syncConfig}>
      <TodoApp />
    </OfflineSyncProvider>
  );
};

export default App;
