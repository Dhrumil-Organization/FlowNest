import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { T } from '@/constants/theme'

type Variant = 'pri'|'sec'|'ghost'|'grn'|'red'|'dark'
interface BtnProps {
  children: React.ReactNode
  onPress?: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  full?: boolean
}

const BG:Record<Variant,string> = { pri:T.copper, sec:T.surface, ghost:'transparent', grn:T.green, red:T.red, dark:T.nav }
const FG:Record<Variant,string> = { pri:'#fff', sec:T.ink, ghost:T.muted, grn:'#fff', red:'#fff', dark:'#fff' }
const BD:Record<Variant,string> = { pri:'transparent', sec:T.border, ghost:T.border, grn:T.green, red:T.red, dark:'transparent' }

export function Btn({ children, onPress, variant='pri', disabled, loading, full }:BtnProps) {
  const v = variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        s.btn,
        { backgroundColor:BG[v], borderColor:BD[v], opacity: disabled ? 0.45 : 1, width: full ? '100%' : undefined },
      ]}
    >
      {loading
        ? <ActivityIndicator color={FG[v]} size="small" />
        : <Text style={[s.label, { color:FG[v] }]}>{children}</Text>
      }
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn:   { paddingVertical:12, paddingHorizontal:18, borderRadius:10, borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  label: { fontSize:14, fontWeight:'700', fontFamily:'DMSans' },
})
