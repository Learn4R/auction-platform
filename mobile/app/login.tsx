import { useState } from 'react'
import { Link, router } from 'expo-router'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors } from '../constants/colors'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Log In</Text>
        <Text style={styles.subtitle}>Sign in to bid, sell items, or manage the marketplace.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          testID="login-email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          testID="login-password"
        />

        {error && (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        )}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="login-submit"
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Log In</Text>}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/signup" style={styles.link} testID="login-goto-signup">
            Sign Up
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.royal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.charcoal,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: colors.gray,
    fontSize: 13.5,
  },
  link: {
    color: colors.royal,
    fontWeight: '600',
    fontSize: 13.5,
  },
})
