import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../lib/notifications'
import { WatchlistProvider } from '../lib/watchlist'

export default function RootLayout() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="items/[id]" />
            <Stack.Screen name="live/[id]" />
          </Stack>
        </NotificationProvider>
      </WatchlistProvider>
    </AuthProvider>
  )
}
