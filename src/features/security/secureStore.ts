import * as SecureStore from 'expo-secure-store';

/**
 * The few calls the security service needs from the phone's secure storage (Keychain on iOS,
 * Keystore-backed storage on Android). Tests swap in `createMemoryKV()`.
 */
export interface SecureKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** expo-secure-store behind `SecureKV`. Only readable while the phone is unlocked. */
export const secureKV: SecureKV = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  delete: (key) => SecureStore.deleteItemAsync(key),
};

/** In-memory `SecureKV` for tests. Pass the same map to two stores to simulate a restart. */
export function createMemoryKV(map: Map<string, string> = new Map()): SecureKV & {
  map: Map<string, string>;
} {
  return {
    map,
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
}
