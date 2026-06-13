/**
 * Cross-platform secure-ish storage helper.
 * - Mobile: expo-secure-store
 * - Web:    localStorage
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const tokenStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined"
          ? window.localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
