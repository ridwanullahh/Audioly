import React, { memo, useMemo, useCallback, type ReactNode } from "react";
import { FlatList, type ListRenderItem, type FlatListProps } from "react-native";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function useThrottle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  const lastCall = React.useRef(0);
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return fn(...args);
    }
  }, [fn, delay]) as T;
}

export const MemoizedFlatList = memo(FlatList) as unknown as typeof FlatList;

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => Promise<void>] {
  const [storedValue, setStoredValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const item = await AsyncStorage.getItem(key);
        if (item) setStoredValue(JSON.parse(item));
      } catch {}
    })();
  }, [key]);

  const setValue = async (value: T) => {
    setStoredValue(value);
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  return [storedValue, setValue];
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(true);
  React.useEffect(() => {
    const NetInfo = require("@react-native-community/netinfo");
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);
  return isOnline;
}

export function useDocumentTitle(title: string) {
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | Audioly`;
    }
  }, [title]);
}

export function lazyLoad<T>(factory: () => Promise<{ default: T }>) {
  let cached: T | null = null;
  return async (): Promise<T> => {
    if (!cached) {
      const mod = await factory();
      cached = mod.default;
    }
    return cached;
  };
}

export function batchOperations<T, R>(items: T[], batchSize: number, operation: (item: T) => Promise<R>): Promise<R[]> {
  return new Promise(async (resolve, reject) => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(operation));
      results.push(...batchResults);
    }
    resolve(results);
  });
}
