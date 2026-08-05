import GorhomBottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { T } from '@/constants/theme'
import { T } from '../../theme';

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: string[]
}

export function BottomSheet({ open, onClose, title, children, snapPoints=['60%','90%'] }: Props) {
  const ref = useRef<GorhomBottomSheet>(null)
  const snaps = useMemo(() => snapPoints, [snapPoints])

  const onChange = useCallback((idx: number) => { if (idx < 0) onClose() }, [onClose])

  React.useEffect(() => {
    if (open) ref.current?.snapToIndex(0)
    else      ref.current?.close()
  }, [open])

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={snaps}
      onChange={onChange}
      enablePanDownToClose
      backgroundStyle={s.bg}
      handleIndicatorStyle={s.handle}
    >
      <BottomSheetScrollView>
        {title && (
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.x}>✕</Text></TouchableOpacity>
          </View>
        )}
        {children}
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  )
}

const s = StyleSheet.create({
  bg:     { backgroundColor:T.surface, borderTopLeftRadius:16, borderTopRightRadius:16 },
  handle: { backgroundColor:T.border, width:36 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title:  { fontSize:14, fontWeight:'800', color:T.nav, fontFamily:'DMSans' },
  x:      { fontSize:20, color:T.muted },
})
