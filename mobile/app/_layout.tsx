import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { colors } from '../constants/colors'
import {
  fonts,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_500Medium_Italic,
  Newsreader_600SemiBold,
  Newsreader_700Bold,
} from '../constants/fonts'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../lib/notifications'
import { WatchlistProvider } from '../lib/watchlist'

// Keep the native splash screen up until the three brand font families
// (Newsreader for headings, Inter for body text, IBM Plex Mono for prices/
// labels — the same three client/src/index.css's @theme block declares)
// have actually finished loading, so nothing ever flashes in the OS
// default font first.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <AuthProvider>
      <WatchlistProvider>
        <NotificationProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: colors.white },
              headerTintColor: colors.royal,
              headerTitleStyle: { fontFamily: fonts.displaySemiBold, fontSize: 17, color: colors.royal },
              // Without this, iOS's back button falls back to showing the
              // *previous* screen's route name next to the chevron — and
              // since the (tabs) group has no title of its own, every
              // pushed screen's back button literally read "(tabs)". A
              // bare chevron (no label) is the cleaner fix vs. picking an
              // arbitrary label for a back destination that's different
              // per tab anyway.
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="items/[id]" />
            <Stack.Screen name="live/[id]" />
            <Stack.Screen name="apply-to-sell" />
            <Stack.Screen name="sell-item" />
            <Stack.Screen name="my-listings" />
            <Stack.Screen name="my-payouts" />
            <Stack.Screen name="my-orders" />
            <Stack.Screen name="pay/[orderId]" />
          </Stack>
        </NotificationProvider>
      </WatchlistProvider>
    </AuthProvider>
  )
}
