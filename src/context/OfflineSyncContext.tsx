import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { SyncConfig, OfflineSyncContextValue } from "../types";
import { NetworkManager } from "../utils/network";

interface OfflineSyncProviderProps {
  children: ReactNode;
  config: SyncConfig;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(
  undefined
);

export const OfflineSyncProvider: React.FC<OfflineSyncProviderProps> = ({
  children,
  config,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [networkManager] = useState(() => new NetworkManager());

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(networkManager.isOnline());
    };

    // Initial status
    updateOnlineStatus();

    // Listen for network changes
    const unsubscribeOnline = networkManager.onOnline(updateOnlineStatus);
    const unsubscribeOffline = networkManager.onOffline(updateOnlineStatus);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      networkManager.cleanup();
    };
  }, [networkManager]);

  const globalSync = async (): Promise<void> => {
    // This will be implemented by individual hooks
    console.log("Global sync triggered");
  };

  const value: OfflineSyncContextValue = {
    config,
    isOnline,
    globalSync,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSyncContext = (): OfflineSyncContextValue => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error(
      "useOfflineSyncContext must be used within an OfflineSyncProvider"
    );
  }
  return context;
};
