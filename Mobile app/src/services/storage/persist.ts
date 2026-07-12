import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/** Zustand-compatible storage backed by AsyncStorage. */
export const asyncStorageAdapter: StateStorage = {
  getItem: async (name) => {
    try {
      return (await AsyncStorage.getItem(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // best-effort persistence
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
};
