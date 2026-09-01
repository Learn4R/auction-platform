import { Redirect } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import { useAuth } from '../lib/auth'

export default function Home() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.royal} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  return (
    <View style={styles.center} testID="home-screen">
      <Text style={styles.greeting} testID="home-greeting">
        Logged in as {user.name}
      </Text>
      <Text style={styles.role}>{user.role}</Text>
      <Pressable style={styles.button} onPress={logout} testID="home-logout">
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    paddingHorizontal: 24,
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
    marginBottom: 24,
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
})
