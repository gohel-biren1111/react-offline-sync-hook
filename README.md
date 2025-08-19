# React Offline Sync Hook 🗄️

**The website will work even when the network is offline.**

A comprehensive React hook for offline data synchronization with automatic conflict resolution, queue management, and background sync capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## ✅ Features

1. **React Hook** → `useOfflineSync` (core)
2. **LocalStorage Adapter** → Fast, simple storage
3. **IndexedDB Adapter** → Large data storage
4. **Data Queue Manager** → Auto retry with exponential backoff
5. **Online/Offline Status** → Real-time network monitoring
6. **Auto Sync When Online** → Seamless data synchronization
7. **Conflict Resolution (LWW)** → Last-write-wins strategy
8. **Custom Conflict Handler** → User-defined resolution logic
9. **Manual Sync Trigger** → On-demand synchronization
10. **Background Sync** → Service Worker integration
11. **Batching Requests** → Optimized network usage
12. **Error Logging System** → Comprehensive error tracking
13. **Retry with Exponential Backoff** → Smart retry mechanism
14. **Status API** → Real-time sync status
15. **React Context Provider** → `<OfflineSyncProvider>`
16. **Hook Return Values** → Complete API surface
17. **TypeScript Support** → Full type safety
18. **JavaScript Support** → Compiled builds
19. **Universal Support** → Next.js, CRA, Remix
20. **Easy API Integration** → Ready-to-use

## 🚀 Live Demo & Documentation

- **Coming Soon...**

## 🚀 Installation

```bash
npm install react-offline-sync-hook
# or
yarn add react-offline-sync-hook
# or
pnpm add react-offline-sync-hook
```

## 📖 Quick Start

### Basic Usage

```tsx
import React from "react";
import { OfflineSyncProvider, useOfflineSync } from "react-offline-sync-hook";

// 1. Configure the sync behavior
const config = {
  storageAdapter: "indexedDB",
  apiEndpoint: "https://your-api.com/api/todos",
  retryAttempts: 3,
  conflictResolution: "last-write-wins",
  enableBackgroundSync: true,
};

// 2. Create your component
const TodoApp = () => {
  const { data, addItem, updateItem, deleteItem, status } = useOfflineSync(
    "todos",
    config
  );

  return (
    <div>
      <div>Status: {status.isOnline ? "🟢 Online" : "🔴 Offline"}</div>
      <button onClick={() => addItem({ title: "New Todo", completed: false })}>
        Add Todo
      </button>
      {data.map((todo) => (
        <div key={todo.id}>
          {todo.title}
          <button onClick={() => deleteItem(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};

// 3. Wrap with Provider
const App = () => (
  <OfflineSyncProvider config={config}>
    <TodoApp />
  </OfflineSyncProvider>
);
```

## 🔧 Configuration Options

```typescript
interface SyncConfig {
  // Storage
  storageAdapter: "localStorage" | "indexedDB";

  // API
  apiEndpoint: string;
  headers?: Record<string, string>;

  // Retry Logic
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms

  // Batching
  batchSize?: number; // Default: 10

  // Conflict Resolution
  conflictResolution?:
    | "client-wins"
    | "server-wins"
    | "last-write-wins"
    | "custom";
  customConflictHandler?: (local: any, remote: any) => any;

  // Background Sync
  enableBackgroundSync?: boolean; // Default: false
  syncInterval?: number; // Auto-sync interval in ms
}
```

## 📚 API Reference

### useOfflineSync Hook

```typescript
const {
  data, // T[] - Your synchronized data
  status, // SyncStatus - Current sync state
  error, // Error | null - Last error
  syncNow, // () => Promise<void> - Manual sync
  addItem, // (item: Omit<T, 'id'>) => Promise<void>
  updateItem, // (id: string, updates: Partial<T>) => Promise<void>
  deleteItem, // (id: string) => Promise<void>
  clearData, // () => Promise<void>
} = useOfflineSync<T>(key, config, initialData);
```

### SyncStatus Object

```typescript
interface SyncStatus {
  isOnline: boolean; // Network connectivity
  isSyncing: boolean; // Currently syncing
  lastSync: Date | null; // Last successful sync
  pendingItems: number; // Items waiting to sync
  error: string | null; // Last error message
}
```

## 🛠 Advanced Usage

### Custom Conflict Resolution

```typescript
const config = {
  conflictResolution: "custom",
  customConflictHandler: (localData, remoteData) => {
    // Your custom merge logic
    return {
      ...localData,
      ...remoteData,
      title: `${localData.title} (merged)`,
      updatedAt: new Date().toISOString(),
    };
  },
};
```

### Background Sync with Service Worker

```typescript
// 1. Enable in config
const config = {
  enableBackgroundSync: true,
  // ... other options
};

// 2. Create service worker file: public/offline-sync-sw.js
// (The package provides a generator for this)
```

### Multiple Data Types

```typescript
const todosSync = useOfflineSync<Todo>("todos", todosConfig);
const notesSync = useOfflineSync<Note>("notes", notesConfig);
const contactsSync = useOfflineSync<Contact>("contacts", contactsConfig);
```

## 🔄 Storage Adapters

### LocalStorage (Fast, Limited)

- ✅ Fast access
- ✅ Simple setup
- ❌ ~5-10MB limit
- ❌ Synchronous operations

```typescript
const config = { storageAdapter: "localStorage" };
```

### IndexedDB (Large, Async)

- ✅ Large storage capacity
- ✅ Asynchronous operations
- ✅ Complex queries
- ❌ Slightly more complex

```typescript
const config = { storageAdapter: "indexedDB" };
```

## 🚦 Network Detection

The hook automatically detects network changes:

```typescript
const { status } = useOfflineSync("data", config);

// React to network changes
useEffect(() => {
  if (status.isOnline) {
    console.log("Back online! Auto-syncing...");
  } else {
    console.log("Gone offline. Queuing changes...");
  }
}, [status.isOnline]);
```

## 🔁 Retry Mechanism

Built-in exponential backoff:

```typescript
const config = {
  retryAttempts: 5, // Try 5 times
  retryDelay: 1000, // Start with 1 second
  // Delays: 1s, 2s, 4s, 8s, 16s
};
```

## 📊 Error Handling & Logging

```typescript
const { error, status } = useOfflineSync("data", config);

// Handle errors
if (error) {
  console.error("Sync error:", error.message);
}

// Check sync status
if (status.error) {
  console.warn("Last sync failed:", status.error);
}
```

## 🌐 Framework Compatibility

### Next.js

```tsx
// pages/_app.tsx or app/layout.tsx
import { OfflineSyncProvider } from "react-offline-sync-hook";

export default function App({ Component, pageProps }) {
  return (
    <OfflineSyncProvider config={syncConfig}>
      <Component {...pageProps} />
    </OfflineSyncProvider>
  );
}
```

### Create React App

```tsx
// src/index.tsx
import { OfflineSyncProvider } from "react-offline-sync-hook";

ReactDOM.render(
  <OfflineSyncProvider config={syncConfig}>
    <App />
  </OfflineSyncProvider>,
  document.getElementById("root")
);
```

### Remix

```tsx
// app/root.tsx
import { OfflineSyncProvider } from "react-offline-sync-hook";

export default function App() {
  return (
    <html>
      <head />
      <body>
        <OfflineSyncProvider config={syncConfig}>
          <Outlet />
        </OfflineSyncProvider>
      </body>
    </html>
  );
}
```

## 🧪 Testing

```bash
npm test        # Run tests
npm run test:watch  # Watch mode
```

## 📦 Build & Publish

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check

# Publish
npm publish
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Biren Gohel](https://github.com/biren-gohel-1111)

## 🙏 Acknowledgments

- Inspired by modern offline-first applications
- Built for the React ecosystem
- Designed for real-world use cases

---

**Made with ❤️ for the [Biren Gohel](https://github.com/biren-gohel-1111)**
