import "@testing-library/jest-dom";

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

const mockIDBDatabase = {
  objectStoreNames: {
    contains: jest.fn(() => false),
  },
  createObjectStore: jest.fn(),
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      get: jest.fn(() => mockIDBRequest),
      put: jest.fn(() => mockIDBRequest),
      delete: jest.fn(() => mockIDBRequest),
      clear: jest.fn(() => mockIDBRequest),
      getAllKeys: jest.fn(() => mockIDBRequest),
    })),
  })),
};

const mockIDBOpenRequest = {
  ...mockIDBRequest,
  result: mockIDBDatabase,
  onupgradeneeded: null,
};

global.indexedDB = {
  open: jest.fn(() => mockIDBOpenRequest),
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

global.localStorage = localStorageMock as any;

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Mock service worker
Object.defineProperty(global.navigator, "serviceWorker", {
  value: {
    register: jest.fn(() =>
      Promise.resolve({
        sync: {
          register: jest.fn(),
        },
      })
    ),
  },
  writable: true,
});

// Mock window events
global.addEventListener = jest.fn();
global.removeEventListener = jest.fn();
