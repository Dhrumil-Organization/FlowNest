import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Args = { UserId: string | number; ModuleCode: string; ModuleName: string; ScreenCode: string; ScreenName: string; token?: string };
export function useMobileUserPreference(args: Args) {
  const key = `mobile_pref:${args.UserId}:${args.ModuleCode}:${args.ScreenCode}`;
  const loadDefaultPreference = useCallback(async () => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try { const value = JSON.parse(raw); return { ...value, criteria: value?.PreferenceJson?.criteria || value?.criteria || null }; } catch { return null; }
  }, [key]);
  const savePreference = useCallback(async (value: any) => { await AsyncStorage.setItem(key, JSON.stringify(value)); return value; }, [key]);
  const loadPreferenceList = useCallback(async () => { const v = await loadDefaultPreference(); return v ? [v] : []; }, [loadDefaultPreference]);
  return { loadDefaultPreference, savePreference, loadPreferenceList };
}
