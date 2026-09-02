import { useEffect, useState } from 'react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CheckoutWebView, type CheckoutResult } from '../../components/CheckoutWebView'
import { colors } from '../../constants/colors'
import { createPayment, verifyPayment } from '../../lib/api'
import { useAuth } from '../../lib/auth'

// Opened from the "Pay Now" button on My Orders. Calls the real
// create-payment endpoint for a real Razorpay order, then loads the real
// checkout.js flow (see components/CheckoutWebView.tsx) — exactly the same
// server calls and the same Razorpay integration the web app uses, just
// presented inside the app.
export default function PayScreen() {
  const { orderId, itemTitle } = useLocalSearchParams<{ orderId: string; itemTitle?: string }>()
  const { token } = useAuth()
  const [checkoutOptions, setCheckoutOptions] = useState<{
    keyId: string
    amount: number
    currency: string
    orderId: string
    description: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'success' | 'failed' | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!token || !orderId) return
    createPayment(orderId, token)
      .then((payment) => {
        setCheckoutOptions({
          keyId: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          orderId: payment.razorpayOrderId,
          description: itemTitle ?? 'Auction lot',
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to start payment'))
  }, [token, orderId, itemTitle])

  async function handleResult(result: CheckoutResult) {
    if (result.type === 'dismiss') {
      router.back()
      return
    }
    if (result.type === 'failed') {
      setOutcome('failed')
      setError(result.error ?? 'Payment failed')
      return
    }
    // success
    if (!token || !orderId || !result.razorpay_order_id || !result.razorpay_payment_id || !result.razorpay_signature) {
      setOutcome('failed')
      setError('Payment response was incomplete')
      return
    }
    setVerifying(true)
    try {
      await verifyPayment(
        orderId,
        {
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
        },
        token,
      )
      setOutcome('success')
    } catch (err) {
      setOutcome('failed')
      setError(err instanceof Error ? err.message : 'Payment verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Payment', presentation: 'modal' }} />
      <View style={styles.container}>
        {outcome === 'success' ? (
          <View style={styles.center} testID="payment-success">
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Payment Successful</Text>
            <Text style={styles.successBody}>Your order has been marked as paid.</Text>
            <Pressable style={styles.doneButton} onPress={() => router.replace('/my-orders')} testID="payment-done">
              <Text style={styles.doneButtonText}>Back to My Orders</Text>
            </Pressable>
          </View>
        ) : outcome === 'failed' ? (
          <View style={styles.center} testID="payment-failed">
            <Text style={styles.failIcon}>✕</Text>
            <Text style={styles.failTitle}>Payment Failed</Text>
            {error && <Text style={styles.failBody}>{error}</Text>}
            <Pressable style={styles.doneButton} onPress={() => router.back()} testID="payment-back">
              <Text style={styles.doneButtonText}>Back to My Orders</Text>
            </Pressable>
          </View>
        ) : verifying ? (
          <View style={styles.center} testID="payment-verifying">
            <ActivityIndicator color={colors.royal} />
            <Text style={styles.verifyingText}>Verifying payment…</Text>
          </View>
        ) : error ? (
          <View style={styles.center} testID="payment-error">
            <Text style={styles.failBody}>{error}</Text>
          </View>
        ) : !checkoutOptions ? (
          <View style={styles.center} testID="payment-loading">
            <ActivityIndicator color={colors.royal} />
          </View>
        ) : (
          <CheckoutWebView options={checkoutOptions} onResult={handleResult} />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  successIcon: {
    fontSize: 40,
    color: '#1a9550',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.royal,
  },
  successBody: {
    fontSize: 13.5,
    color: colors.gray,
    textAlign: 'center',
  },
  failIcon: {
    fontSize: 40,
    color: colors.red,
    marginBottom: 8,
  },
  failTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.red,
  },
  failBody: {
    fontSize: 13.5,
    color: colors.red,
    textAlign: 'center',
  },
  verifyingText: {
    fontSize: 13.5,
    color: colors.gray,
  },
  doneButton: {
    marginTop: 16,
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
})
