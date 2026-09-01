import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store wraps the OS keychain (iOS) / Keystore (Android) — the
// right place for a real auth token on a real device. Its web target has no
// implementation at all (there's no OS keychain in a browser to wrap), so
// this app's own web output — and this project's Playwright-driven test
// pass, which runs against that web output for lack of a UI-automation tool
// for a simulator — falls back to localStorage there instead. Native builds
// never touch this fallback; they always go through the real SecureStore.
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null
    return SecureStore.getItemAsync(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value)
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key)
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}
