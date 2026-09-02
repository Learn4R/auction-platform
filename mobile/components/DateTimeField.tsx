import DateTimePicker from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import { formatDateTime } from '../lib/format'
import { Text } from './Text'
import { TextInput } from './TextInput'

// @react-native-community/datetimepicker has no web implementation at all —
// there's no OS date/time UI to wrap in a browser, the same situation Phase
// 1 hit with expo-secure-store (confirmed by there being no .web.* file
// anywhere in the package). Native platforms get the real system picker;
// web falls back to a plain text field for typing an ISO-ish datetime
// directly, which is also what this project's Playwright-driven web
// testing exercises. Real devices never touch the web branch.
export function DateTimeField({
  value,
  onChange,
  placeholder,
  testID,
}: {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  testID?: string
}) {
  const [showPicker, setShowPicker] = useState(false)

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'YYYY-MM-DDTHH:MM'}
        placeholderTextColor={colors.gray}
        testID={testID}
      />
    )
  }

  return (
    <View>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)} testID={testID}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDateTime(value) : (placeholder ?? 'Select date & time')}
        </Text>
      </Pressable>
      {showPicker && (
        <>
          <DateTimePicker
            value={value ? new Date(value) : new Date()}
            mode="datetime"
            display="default"
            onChange={(_event, date) => {
              // Android's picker is its own modal dialog with built-in
              // OK/Cancel, so it should close itself immediately. iOS's
              // default/spinner style has no built-in confirm — it stays
              // open until the Done button below is tapped.
              if (Platform.OS === 'android') setShowPicker(false)
              if (date) onChange(date.toISOString())
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.white,
    justifyContent: 'center',
    minHeight: 44,
  },
  valueText: {
    fontSize: 14.5,
    color: colors.charcoal,
  },
  placeholderText: {
    fontSize: 14.5,
    color: colors.gray,
  },
  doneButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.royal,
    borderRadius: 8,
  },
  doneButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
})
