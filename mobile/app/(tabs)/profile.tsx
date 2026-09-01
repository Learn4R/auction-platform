import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../constants/colors'
import { useAuth } from '../../lib/auth'

// Mostly a "coming soon" placeholder like Watchlist/Notifications, but it
// keeps the one real feature Phase 1 already built — signing out — since
// that's the natural home for it and removing it would leave no way to log
// out once the placeholder Home screen was replaced by the tab bar.
export default function Profile() {
  const { user, logout } = useAuth()

  return (
    <View style={styles.center} testID="profile-screen">
      <Text style={styles.greeting} testID="profile-greeting">
        Logged in as {user?.name}
      </Text>
      <Text style={styles.role}>{user?.role}</Text>
      <Pressable style={styles.button} onPress={logout} testID="profile-logout">
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
      <Text style={styles.subtitle}>
        More profile features — addresses, orders, seller tools — coming soon in an upcoming phase.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    paddingHorizontal: 32,
    gap: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.royal,
    textAlign: 'center',
  },
  role: {
    fontSize: 13,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 28,
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 19,
  },
})
