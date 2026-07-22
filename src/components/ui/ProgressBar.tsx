import React from 'react'
import { View, StyleSheet } from 'react-native'
import { T } from '@/constants/theme'

interface Props { pct:number; color?:string; height?:number; bg?:string }
export function ProgressBar({ pct, color=T.copper, height=7, bg=T.alt }: Props) {
  return (
    <View style={[s.track, { height, backgroundColor:bg }]}>
      <View style={[s.fill, { width:`${Math.min(100,Math.max(0,pct))}%`, backgroundColor:color, height }]} />
    </View>
  )
}
const s = StyleSheet.create({
  track: { borderRadius:8, overflow:'hidden', width:'100%' },
  fill:  { borderRadius:8 },
})