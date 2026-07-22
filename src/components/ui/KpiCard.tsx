import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from './AppText'
import { T } from '@/constants/theme'

interface Props { label:string; value:string; sub?:string; accent?:string }
export function KpiCard({ label, value, sub, accent=T.copper }: Props) {
  return (
    <View style={[s.card, { borderTopColor:accent, borderTopWidth:3 }]}>
      <AppText variant="caption" style={s.lbl}>{label}</AppText>
      <AppText variant="mono"    style={s.val}>{value}</AppText>
      {sub && <AppText variant="caption" style={{ marginTop:2 }}>{sub}</AppText>}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 10,
    padding: 10,          // ← reduce from 12
    borderWidth: 1,
    borderColor: T.border,
  },
  lbl: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,   // ← reduce from 0.5
    marginBottom: 4,
    fontSize: 9,          // ← add this, was inheriting 11
  },
  val: {
    fontSize: 15,         // ← reduce from 18
    fontWeight: '800',
    color: T.ink,
  },
})