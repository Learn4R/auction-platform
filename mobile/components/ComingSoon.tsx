import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'

export function ComingSoon({ title, testID }: { title: string; testID: string }) {
  return (
    <View style={styles.center} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming soon — we&apos;re building this out in an upcoming phase.</Text>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.royal,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 19,
  },
})
