import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { T } from '@/constants/theme'

type Color = 'green'|'amber'|'red'|'blue'|'copper'|'muted'
const BG:Record<Color,string> = { green:T.green+'20', amber:T.amber+'20', red:T.red+'20', blue:T.blue+'20', copper:T.copper+'20', muted:T.muted+'20' }
const FG:Record<Color,string> = { green:T.green, amber:T.amber, red:T.red, blue:T.blue, copper:T.copper, muted:T.muted }

export function Badge({ label, color='muted' }:{ label:string; color?:Color }) {
  return (
    <View style={[s.wrap, { backgroundColor:BG[color] }]}>
      <Text style={[s.txt, { color:FG[color] }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  txt:  { fontSize:9, fontWeight:'800', fontFamily:'DMSans', letterSpacing:0.4 },
})
