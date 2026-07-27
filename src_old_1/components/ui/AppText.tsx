import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { T, FONTS } from '@/constants/theme'

interface Props extends TextProps { variant?: 'h1'|'h2'|'h3'|'body'|'caption'|'mono' }

export function AppText({ variant='body', style, ...rest }: Props) {
  return <Text style={[styles[variant], style]} {...rest} />
}

const styles = StyleSheet.create({
  h1:      { fontSize:22, fontWeight:'800', fontFamily:FONTS.sans, color:T.ink },
  h2:      { fontSize:17, fontWeight:'800', fontFamily:FONTS.sans, color:T.ink },
  h3:      { fontSize:14, fontWeight:'700', fontFamily:FONTS.sans, color:T.ink },
  body:    { fontSize:14, fontWeight:'400', fontFamily:FONTS.sans, color:T.ink },
  caption: { fontSize:11, fontWeight:'600', fontFamily:FONTS.sans, color:T.muted },
  mono:    { fontSize:13, fontWeight:'500', fontFamily:FONTS.mono, color:T.ink },
})
