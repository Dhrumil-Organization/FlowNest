import React from 'react'
import { View, ViewProps, StyleSheet } from 'react-native'
import { T } from '@/constants/theme'

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[s.card, style]} {...rest} />
}
const s = StyleSheet.create({
  card:{ backgroundColor:T.surface, borderRadius:12, borderWidth:1, borderColor:T.border, overflow:'hidden' }
})