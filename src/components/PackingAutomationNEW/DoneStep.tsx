// FILE: src/components/PackingAutomationNEW/DoneStep.tsx
// After printing — what was printed, and the next most likely action.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Text, View } from 'react-native';
import { LinkBtn, Notice, SelectionsCard, tab } from './ui';
import type { Form, PrintResult } from './usePackingForm';

export default function DoneStep({ f, facility, result, printError, onReprint, reprinting }: {
  f: Form; facility: string; result: PrintResult; printError?: string; onReprint: () => void; reprinting?: boolean;
}) {
  const time = new Date(result.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.green + '14', borderColor: T.green + '45', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}
        accessibilityLiveRegion="polite">
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: T.ink }}>
            {result.printed} label{result.printed === 1 ? '' : 's'} sent to printer
          </Text>
          <Text style={[{ fontSize: 13, color: T.muted, marginTop: 2 }, tab]}>{result.label.printer} · {time}</Text>
        </View>
      </View>
      {printError ? <Notice tone="err" text={printError} /> : null}
      <SelectionsCard f={f} facility={facility} upTo={3} />
      <View style={{ alignItems: 'center' }}>
        <LinkBtn label={reprinting ? 'Reprinting…' : 'Label didn’t print? Reprint'} icon="replay" onPress={onReprint} />
      </View>
    </>
  );
}
