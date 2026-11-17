// FILE: app/new/support/_layout.tsx — Raise ticket (opened from the header icon)
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

export default function SupportLayout() {
  const token = useAppSessionStore((s) => s.token);
  if (!token) return <Redirect href="/new/role-login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
