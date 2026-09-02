import { TextInput as RNTextInput, type TextInputProps } from 'react-native'
import { fonts } from '../constants/fonts'

// Matches web's `.input` class, which sets `font-family: var(--font-body)`
// unconditionally regardless of what the field holds — every text field in
// this app (including numeric ones like price/PIN code) uses Inter, same
// as web. The default goes first so any explicit fontFamily a caller
// passes in its own style still wins.
export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} style={[{ fontFamily: fonts.body }, style]} />
}
