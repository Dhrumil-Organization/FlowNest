// FILE: src/features/support/components/UsersPanel.tsx
// IT Desk team (admin only): add members, rename, reset password, switch off.
// The admin account itself lives in the server .env file.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { SupportCall } from '../api';
import { fmtWhen, ItUser } from '../model';
import { Avatar, Btn, Dialog, Field, Input, Panel, toast } from './ui';

export function UsersPanel({ visible, onClose, api, users, onUsers, me }: { visible: boolean; onClose: () => void; api: SupportCall; users: ItUser[]; onUsers: (u: ItUser[]) => void; me: ItUser }) {
  const [edit, setEdit] = useState<ItUser | 'new' | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (u: ItUser | 'new') => {
    setEdit(u);
    setName(u === 'new' ? '' : u.name);
    setUsername(u === 'new' ? '' : u.username);
    setPassword('');
  };
  const refresh = async () => { const r = await api<{ users: ItUser[] }>('users.list'); onUsers(r.users); };
  const save = async () => {
    if (busy || !edit) return;
    setBusy(true);
    try {
      if (edit === 'new') await api('users.create', { name, username, password });
      else await api('users.update', { user_id: edit.id, name, username, ...(password ? { password } : {}) });
      toast(edit === 'new' ? 'Member added' : 'Saved', 'ok');
      setEdit(null);
      await refresh();
    } catch (e: any) {
      toast(e?.message || 'Could not save.', 'err');
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (u: ItUser, active: boolean) => {
    try {
      await api('users.update', { user_id: u.id, active });
      toast(active ? `${u.name} can log in again` : `${u.name} is switched off and logged out`, 'ok');
      await refresh();
    } catch (e: any) {
      toast(e?.message || 'Could not save.', 'err');
    }
  };

  return (
    <Panel visible={visible} onClose={onClose} title="IT team" subtitle={`${users.filter((u) => u.active).length} active · every login has its own session`} width={560}
      right={<Btn small title="Add member" icon="person-add" onPress={() => open('new')} />}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 8 }}>
        {users.map((u) => (
          <View key={u.id} style={[s.row, !u.active && { opacity: 0.55 }]}>
            <Avatar name={u.name} id={u.id} color={u.color} size={38} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.name} numberOfLines={1}>{u.name}</Text>
                {u.role === 'admin' ? <Text style={s.admin}>ADMIN</Text> : null}
                {u.id === me.id ? <Text style={s.you}>YOU</Text> : null}
              </View>
              <Text style={s.sub} numberOfLines={1}>@{u.username} · {u.last_login_at ? `last login ${fmtWhen(u.last_login_at)}` : 'never logged in'}</Text>
            </View>
            {u.role !== 'admin' ? (
              <>
                <Switch value={u.active} onValueChange={(v) => toggle(u, v)} trackColor={{ true: T.green, false: T.border }} thumbColor="#fff" accessibilityLabel={`${u.name} active`} />
                <Btn small kind="ghost" title="Edit" icon="edit" onPress={() => open(u)} />
              </>
            ) : <Icon name="lock" size={18} color={T.muted} />}
          </View>
        ))}
        <Text style={s.note}>The admin login is set on the server (.env: SUPPORT_ADMIN_USERNAME / SUPPORT_ADMIN_PASSWORD). Switching a member off logs him out everywhere.</Text>
      </ScrollView>
      <Dialog visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add IT team member' : 'Edit member'}
        footer={<><Btn title="Cancel" kind="ghost" onPress={() => setEdit(null)} /><Btn title={edit === 'new' ? 'Add' : 'Save'} icon="check" onPress={save} busy={busy} /></>}>
        <Field label="Name" required><Input value={name} onChangeText={setName} placeholder="Full name" autoFocus /></Field>
        <Field label="Username" required hint="Used to log in: letters, digits, . _ -"><Input value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="e.g. ravi.p" autoCapitalize="none" autoCorrect={false} /></Field>
        <Field label={edit === 'new' ? 'Password' : 'New password'} required={edit === 'new'} hint={edit === 'new' ? 'At least 6 characters' : 'Leave empty to keep the current one (a new one logs him out everywhere)'}>
          <Input value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry autoCapitalize="none" />
        </Field>
      </Dialog>
    </Panel>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  name: { fontSize: 14, fontWeight: '900', color: T.nav, flexShrink: 1 },
  sub: { fontSize: 11.5, color: T.muted, fontWeight: '700', marginTop: 2 },
  admin: { fontSize: 9, fontWeight: '900', color: '#fff', backgroundColor: T.copper, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  you: { fontSize: 9, fontWeight: '900', color: T.blue, backgroundColor: `${T.blue}14`, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  note: { fontSize: 11.5, color: T.muted, fontWeight: '600', marginTop: 8, lineHeight: 17 },
});
