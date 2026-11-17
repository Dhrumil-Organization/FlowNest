// FILE: src/features/support/components/Pictures.tsx
// Picture thumbnails (screenshots / photos) + full-screen viewer.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { pickPictures, takePhoto } from '../capture';
import { toast } from './ui';

export type Pic = { key: string; uri: string; name?: string; removable?: boolean; sub?: string };

export function Thumbs({ pics, onRemove, size = 86 }: { pics: Pic[]; onRemove?: (key: string) => void; size?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!pics.length) return null;
  return (
    <>
      <View style={s.grid}>
        {pics.map((p, i) => (
          <View key={p.key} style={[s.thumb, { width: size, height: size }]}>
            <Pressable onPress={() => setOpen(i)} style={{ flex: 1 }} accessibilityRole="imagebutton" accessibilityLabel={`Open picture ${i + 1}`}>
              <Image source={{ uri: p.uri }} style={s.img} resizeMode="cover" />
            </Pressable>
            {p.sub ? <Text style={s.sub} numberOfLines={1}>{p.sub}</Text> : null}
            {onRemove && p.removable !== false ? (
              <TouchableOpacity style={s.remove} onPress={() => onRemove(p.key)} accessibilityLabel="Remove picture" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="close" size={14} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>
      <Viewer pics={pics} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}

export function Viewer({ pics, index, onClose, onIndex }: { pics: Pic[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  if (index === null || !pics[index]) return null;
  const p = pics[index];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.viewer}>
        <View style={s.vHead}>
          <Text style={s.vTitle} numberOfLines={1}>{p.name || `Picture ${index + 1}`}  ·  {index + 1}/{pics.length}</Text>
          <TouchableOpacity onPress={onClose} style={s.vBtn} accessibilityLabel="Close"><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
        >
          <Image source={{ uri: p.uri }} style={s.vImg} resizeMode="contain" />
        </ScrollView>
        {pics.length > 1 ? (
          <View style={s.vNav}>
            <TouchableOpacity disabled={index === 0} onPress={() => onIndex(index - 1)} style={[s.vBtn, index === 0 && { opacity: 0.3 }]} accessibilityLabel="Previous picture"><Icon name="chevron-left" size={30} color="#fff" /></TouchableOpacity>
            <TouchableOpacity disabled={index === pics.length - 1} onPress={() => onIndex(index + 1)} style={[s.vBtn, index === pics.length - 1 && { opacity: 0.3 }]} accessibilityLabel="Next picture"><Icon name="chevron-right" size={30} color="#fff" /></TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/** "Gallery" / "Camera" buttons; returns new pictures as data URLs */
export function AddPictures({ onAdd, max = 6, compact }: { onAdd: (p: { uri: string; name: string }[]) => void; max?: number; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      const list = Array.isArray(r) ? r : r ? [r] : [];
      if (list.length) onAdd(list);
    } catch (e: any) {
      toast(e?.message || 'Could not add the picture.', 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.addRow}>
      <TouchableOpacity style={[s.addBtn, compact && s.addBtnCompact]} onPress={() => run(() => pickPictures(max))} disabled={busy} accessibilityRole="button">
        <Icon name="add-photo-alternate" size={18} color={T.copper} />
        <Text style={s.addText}>{busy ? 'Adding…' : Platform.OS === 'web' ? 'Add pictures' : 'Gallery'}</Text>
      </TouchableOpacity>
      {Platform.OS !== 'web' ? (
        <TouchableOpacity style={[s.addBtn, compact && s.addBtnCompact]} onPress={() => run(takePhoto)} disabled={busy} accessibilityRole="button">
          <Icon name="photo-camera" size={18} color={T.copper} />
          <Text style={s.addText}>Camera</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { borderRadius: 10, overflow: 'hidden', backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  img: { width: '100%', height: '100%' },
  sub: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.7)', color: '#fff', fontSize: 9.5, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 2 },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(178,58,42,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(5,10,18,0.96)' },
  vHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: Platform.OS === 'web' ? 12 : 44, paddingBottom: 8 },
  vTitle: { flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '800' },
  vBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  vImg: { width: '100%', height: '100%', minHeight: 300 },
  vNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 26 },
  addRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: `${T.copper}88`, backgroundColor: `${T.copper}0A` },
  addBtnCompact: { height: 34 },
  addText: { fontSize: 12.5, fontWeight: '800', color: T.copper },
});
