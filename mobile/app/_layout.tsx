import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="items/[id]" />
        <Stack.Screen name="live/[id]" />
      </Stack>
    </AuthProvider>
  )
}
