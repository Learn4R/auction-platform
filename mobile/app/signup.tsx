import { useState } from 'react'
import { Link, router } from 'expo-router'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../components/Text'
import { TextInput } from '../components/TextInput'
import { colors } from '../constants/colors'
import { fonts } from '../constants/fonts'
import { useAuth } from '../lib/auth'
import type { RegisterableRole } from '../lib/api'

export default function Signup() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RegisterableRole>('buyer')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are all required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password, role })
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
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
        <Text variant="display" style={styles.title}>
          Sign Up
        </Text>
        <Text style={styles.subtitle}>Create an account to bid, or sell items of your own.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} testID="signup-name" />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          testID="signup-email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
          testID="signup-password"
        />

        <Text style={styles.label}>I want to</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleOption, role === 'buyer' && styles.roleOptionActive]}
            onPress={() => setRole('buyer')}
            testID="signup-role-buyer"
          >
            <Text style={[styles.roleTitle, role === 'buyer' && styles.roleTitleActive]}>Buy</Text>
            <Text style={styles.roleSubtitle}>Bid on auctions</Text>
          </Pressable>
          <Pressable
            style={[styles.roleOption, role === 'seller' && styles.roleOptionActive]}
            onPress={() => setRole('seller')}
            testID="signup-role-seller"
          >
            <Text style={[styles.roleTitle, role === 'seller' && styles.roleTitleActive]}>Sell</Text>
            <Text style={styles.roleSubtitle}>List items for auction</Text>
          </Pressable>
        </View>

        {error && (
          <Text style={styles.error} testID="signup-error">
            {error}
          </Text>
        )}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="signup-submit"
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" style={styles.link} testID="signup-goto-login">
            Log In
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
    paddingVertical: 24,
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
    marginBottom: 24,
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
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roleOptionActive: {
    borderColor: colors.royal,
    backgroundColor: 'rgba(23, 59, 112, 0.05)',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
  },
  roleTitleActive: {
    color: colors.royal,
  },
  roleSubtitle: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
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
    fontFamily: fonts.bodySemiBold,
  },
})
