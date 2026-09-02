import { Ionicons } from '@expo/vector-icons'
import { PlatformPressable } from '@react-navigation/elements'
import { Redirect, Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors } from '../../constants/colors'
import { fonts } from '../../constants/fonts'
import { useAuth } from '../../lib/auth'
import { useNotifications } from '../../lib/notifications'

// react-navigation's BottomTabNavigationOptions has no tabBarTestID — the
// standard way to attach a stable testID to a tab button is to render it via
// tabBarButton, passing the rest of the props straight through to the real
// pressable so touch/focus behavior is untouched.
function tabButton(testID: string) {
  function TabButton(props: ComponentProps<typeof PlatformPressable>) {
    return <PlatformPressable {...props} testID={testID} />
  }
  return TabButton
}

// The tab bar is the logged-in home of the app — it only ever renders once
// AuthProvider has confirmed a real session, exactly like the old
// Phase 1 index.tsx gate did for the placeholder Home screen.
export default function TabsLayout() {
  const { user, loading } = useAuth()
  const { unreadCount } = useNotifications()

  if (loading) {
    return (
      <View style={styles.center} testID="tabs-loading">
        <ActivityIndicator color={colors.royal} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.royal,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButton: tabButton('tab-home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Auctions',
          tabBarButton: tabButton('tab-auctions'),
          tabBarIcon: ({ color, size }) => <Ionicons name="hammer" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarButton: tabButton('tab-watchlist'),
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarButton: tabButton('tab-notifications'),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: tabButton('tab-profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
  },
  badge: {
    backgroundColor: colors.gold,
    color: colors.royal,
    fontWeight: '700',
  },
})
