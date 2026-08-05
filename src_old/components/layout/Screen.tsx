import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import React from 'react'
import { T } from '@/constants/theme'

interface Props {
  children: React.ReactNode
  scroll?: boolean
  padded?: boolean
  refreshing?: boolean
  onRefresh?: () => void
}

export function Screen({ children, scroll=true, padded=true, refreshing, onRefresh }: Props) {
  const inner = <View style={[s.inner, padded && s.padded]}>{children}</View>
  return (
    <SafeAreaView style={s.safe}>
      {scroll
        ? <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshing !== undefined
              ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} />
              : undefined}
          >{inner}</ScrollView>
        : inner}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:T.bg },
  scroll: { flexGrow:1, paddingBottom:32 },
  inner:  { flex:1 },
  padded: { paddingHorizontal:14 },
})
