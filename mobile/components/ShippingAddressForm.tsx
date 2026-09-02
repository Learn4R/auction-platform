import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import { saveShippingAddress, type MyProfile, type Order } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Text } from './Text'
import { TextInput } from './TextInput'

// Mirrors client/src/components/ShippingAddressForm.tsx — same fields,
// same endpoint, prefilled from the buyer's saved default address if they
// have one.
export function ShippingAddressForm({
  order,
  defaultAddress,
  onSaved,
}: {
  order: Order
  defaultAddress: MyProfile | null
  onSaved: (order: Order) => void
}) {
  const { token } = useAuth()
  const [name, setName] = useState(defaultAddress?.defaultShippingName ?? '')
  const [phone, setPhone] = useState(defaultAddress?.defaultShippingPhone ?? '')
  const [addressLine1, setAddressLine1] = useState(defaultAddress?.defaultShippingAddressLine1 ?? '')
  const [addressLine2, setAddressLine2] = useState(defaultAddress?.defaultShippingAddressLine2 ?? '')
  const [city, setCity] = useState(defaultAddress?.defaultShippingCity ?? '')
  const [state, setState] = useState(defaultAddress?.defaultShippingState ?? '')
  const [pincode, setPincode] = useState(defaultAddress?.defaultShippingPincode ?? '')
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const updated = await saveShippingAddress(
        order.id,
        { name, phone, addressLine1, addressLine2: addressLine2 || undefined, city, state, pincode, saveAsDefault },
        token,
      )
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shipping address')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.container} testID={`shipping-form-${order.id}`}>
      <Text variant="mono" style={styles.label}>
        Shipping Address Required
      </Text>
      <Text style={styles.hint}>Add where this lot should ship before you can pay.</Text>

      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} testID="ship-name" />
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="ship-phone"
      />
      <TextInput
        style={styles.input}
        placeholder="Address line 1"
        value={addressLine1}
        onChangeText={setAddressLine1}
        testID="ship-address1"
      />
      <TextInput
        style={styles.input}
        placeholder="Address line 2 (optional)"
        value={addressLine2}
        onChangeText={setAddressLine2}
        testID="ship-address2"
      />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half]} placeholder="City" value={city} onChangeText={setCity} testID="ship-city" />
        <TextInput style={[styles.input, styles.half]} placeholder="State" value={state} onChangeText={setState} testID="ship-state" />
      </View>
      <TextInput
        style={styles.input}
        placeholder="PIN code"
        value={pincode}
        onChangeText={setPincode}
        keyboardType="number-pad"
        maxLength={6}
        testID="ship-pincode"
      />

      <Pressable style={styles.checkboxRow} onPress={() => setSaveAsDefault((v) => !v)} testID="ship-save-default">
        <View style={[styles.checkbox, saveAsDefault && styles.checkboxChecked]} />
        <Text style={styles.checkboxLabel}>Save as my default address</Text>
      </Pressable>

      {error && (
        <Text style={styles.error} testID={`ship-error-${order.id}`}>
          {error}
        </Text>
      )}

      <Pressable
        style={[styles.submitButton, busy && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={busy}
        testID={`ship-submit-${order.id}`}
      >
        <Text style={styles.submitButtonText}>{busy ? 'Saving…' : 'Save Shipping Address'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.gray,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 12.5,
    color: colors.gray,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.royal,
  },
  checkboxChecked: {
    backgroundColor: colors.royal,
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: colors.charcoal,
  },
  error: {
    fontSize: 12,
    color: colors.red,
  },
  submitButton: {
    backgroundColor: colors.royal,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
})
