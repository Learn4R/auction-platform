import { useEffect, useState } from 'react'
import { router, Stack } from 'expo-router'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors } from '../constants/colors'
import { applyToSell, getMySellerApplication, type MySellerApplication, type SellerApplicationInput } from '../lib/api'
import { useAuth } from '../lib/auth'

const emptyApplication: SellerApplicationInput = {
  fullName: '',
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  panNumber: '',
  bankAccountNumber: '',
  bankIFSC: '',
}

// Same fields, same endpoint as the web app's SellerApplicationGate
// (client/src/pages/Sell.tsx). Reached from the Profile tab whenever the
// seller isn't approved yet.
export default function ApplyToSell() {
  const { token } = useAuth()
  const [status, setStatus] = useState<MySellerApplication | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<SellerApplicationInput>(emptyApplication)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    getMySellerApplication(token)
      .then(setStatus)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load your application status'))
  }, [token])

  function update<K extends keyof SellerApplicationInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!token) return
    setError(null)
    setSubmitting(true)
    try {
      await applyToSell(form, token)
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    )
  }

  if (!status) {
    return (
      <View style={styles.center} testID="apply-loading">
        <ActivityIndicator color={colors.royal} />
      </View>
    )
  }

  if (status.sellerStatus === 'pending') {
    return (
      <View style={styles.center} testID="apply-pending">
        <Text style={styles.pendingTitle}>Application Under Review</Text>
        <Text style={styles.pendingBody}>
          Your seller application is under review. We&apos;ll notify you as soon as a decision is made — usually
          within a couple of business days.
        </Text>
      </View>
    )
  }

  if (status.sellerStatus === 'approved') {
    return (
      <View style={styles.center} testID="apply-already-approved">
        <Text style={styles.pendingTitle}>You&apos;re already an approved seller</Text>
      </View>
    )
  }

  const showReapply = status.sellerStatus === 'rejected'

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: showReapply ? 'Reapply to Sell' : 'Apply to Sell' }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} testID="apply-form">
          <Text style={styles.title}>{showReapply ? 'Reapply to Sell' : 'Apply to Sell'}</Text>
          <Text style={styles.subtitle}>
            Selling on Mudra House requires a short verification step. Tell us a bit about yourself and where to
            send payouts, and our team will review your application.
          </Text>

          {showReapply && status.application?.rejectionReason && (
            <View style={styles.rejectionBox} testID="apply-previous-rejection">
              <Text style={styles.rejectionTitle}>Your previous application was rejected.</Text>
              <Text style={styles.rejectionReason}>{status.application.rejectionReason}</Text>
            </View>
          )}

          <Field label="Full Name">
            <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => update('fullName', v)} testID="apply-fullName" />
          </Field>
          <Field label="Mobile Number">
            <TextInput
              style={styles.input}
              value={form.mobile}
              onChangeText={(v) => update('mobile', v)}
              keyboardType="phone-pad"
              testID="apply-mobile"
            />
          </Field>
          <Field label="Address">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.address}
              onChangeText={(v) => update('address', v)}
              multiline
              numberOfLines={3}
              testID="apply-address"
            />
          </Field>
          <Field label="City">
            <TextInput style={styles.input} value={form.city} onChangeText={(v) => update('city', v)} testID="apply-city" />
          </Field>
          <Field label="State">
            <TextInput style={styles.input} value={form.state} onChangeText={(v) => update('state', v)} testID="apply-state" />
          </Field>
          <Field label="Pincode">
            <TextInput
              style={styles.input}
              value={form.pincode}
              onChangeText={(v) => update('pincode', v)}
              keyboardType="number-pad"
              testID="apply-pincode"
            />
          </Field>

          <Text style={styles.sectionTitle}>Payout Details</Text>
          <Field label="PAN Number">
            <TextInput
              style={styles.input}
              value={form.panNumber}
              onChangeText={(v) => update('panNumber', v.toUpperCase())}
              autoCapitalize="characters"
              testID="apply-panNumber"
            />
          </Field>
          <Field label="Bank Account Number">
            <TextInput
              style={styles.input}
              value={form.bankAccountNumber}
              onChangeText={(v) => update('bankAccountNumber', v)}
              keyboardType="number-pad"
              testID="apply-bankAccountNumber"
            />
          </Field>
          <Field label="Bank IFSC">
            <TextInput
              style={styles.input}
              value={form.bankIFSC}
              onChangeText={(v) => update('bankIFSC', v.toUpperCase())}
              autoCapitalize="characters"
              testID="apply-bankIFSC"
            />
          </Field>

          {error && (
            <Text style={styles.errorText} testID="apply-error">
              {error}
            </Text>
          )}

          <Pressable
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            testID="apply-submit"
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting…' : showReapply ? 'Resubmit Application' : 'Submit Application'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 19,
    marginBottom: 20,
  },
  rejectionBox: {
    borderWidth: 1,
    borderColor: 'rgba(200,59,59,0.3)',
    backgroundColor: 'rgba(200,59,59,0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 4,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.red,
  },
  rejectionReason: {
    fontSize: 13,
    color: colors.red,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.royal,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.royal,
    textAlign: 'center',
  },
  pendingBody: {
    fontSize: 13.5,
    color: '#8a6e18',
    textAlign: 'center',
    lineHeight: 19,
  },
})
