// FILE: src/screens/inquiry/InquiryContext.tsx
// NEW ERP — Inquiry module: shared context + in-module navigation.
//
// The whole inquiry flow lives behind ONE route (`app/new/(tabs)/inquiry`).
// Instead of a separate expo-router route per screen (legacy had 17 route
// files + a callback registry to pass picks back), the module keeps its own
// small stack here:
//   - every opened view stays mounted underneath (form state, scroll and
//     filters survive while you open a picker / detail and come back),
//   - `useViewFocus` re-runs a loader whenever a view becomes the top again
//     (same as useFocusEffect in legacy -> lists refresh after a save),
//   - Android hardware back / the in-screen back button pops the stack.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { InquiryApi } from './inquiryApi';
import { InquiryRights } from './inquiryModel';

export type InquiryRoute =
  | { name: 'dashboard' }
  | { name: 'form'; inquiryId?: number }
  | { name: 'detail'; id: number }
  | { name: 'notes'; inquiryId: number; inquiryNo: string }
  | { name: 'costingPicker'; id: number }
  | { name: 'costSheet'; inquiryId: number; designId: number }
  | { name: 'quotation'; id: number }
  | { name: 'confirm'; id: number }
  | { name: 'reject'; id: number }
  | { name: 'authQueue' }
  | { name: 'authReview'; inquiryId: number; designId: number }
  | { name: 'tatConfig' }
  | { name: 'settings' };

type Entry = { key: string; route: InquiryRoute };

type NavApi = {
  stack: Entry[];
  push: (route: InquiryRoute) => void;
  replace: (route: InquiryRoute) => void;
  back: () => void;
  canGoBack: boolean;
  /** Pop back to the dashboard, then open `route` (e.g. new inquiry -> its detail). */
  resetTo: (route?: InquiryRoute) => void;
};

export type InquiryCtx = {
  api: InquiryApi;
  prptype: string;
  yearno: string;
  username: string;
  rights: InquiryRights | null;
  rightsLoaded: boolean;
  reloadRights: () => Promise<void>;
  isAuthorizer: boolean;
  pendingAuth: number;
  refreshAuth: () => Promise<void>;
};

const NavContext = createContext<NavApi | null>(null);
const DataContext = createContext<InquiryCtx | null>(null);
const EntryContext = createContext<{ key: string; focused: boolean }>({ key: '', focused: true });

export const useInquiry = () => {
  const v = useContext(DataContext);
  if (!v) throw new Error('useInquiry must be used inside <InquiryProvider>');
  return v;
};

export const useInquiryNav = () => {
  const v = useContext(NavContext);
  if (!v) throw new Error('useInquiryNav must be used inside <InquiryProvider>');
  return v;
};

/** Same as useInquiryNav but null outside the inquiry module (shared UI kit). */
export const useInquiryNavOptional = () => useContext(NavContext);

/** true while this view is the visible (top) one. */
export const useViewFocused = () => useContext(EntryContext).focused;

/**
 * Runs `effect` when the view becomes visible (first mount + every time the
 * user comes back to it). Legacy used useFocusEffect for the same reason.
 */
export function useViewFocus(effect: () => void, deps: React.DependencyList) {
  const focused = useViewFocused();
  const ref = useRef(effect);
  ref.current = effect;
  useEffect(() => {
    if (focused) ref.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, ...deps]);
}

let seq = 0;
const newKey = () => `v${++seq}`;

export function InquiryNavProvider({ children }: { children: (stack: Entry[]) => React.ReactNode }) {
  const [stack, setStack] = useState<Entry[]>(() => [{ key: newKey(), route: { name: 'dashboard' } }]);

  const push = useCallback((route: InquiryRoute) => setStack((s) => [...s, { key: newKey(), route }]), []);
  const replace = useCallback(
    (route: InquiryRoute) => setStack((s) => [...s.slice(0, -1), { key: newKey(), route }]),
    [],
  );
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const resetTo = useCallback(
    (route?: InquiryRoute) => setStack((s) => (route ? [s[0], { key: newKey(), route }] : [s[0]])),
    [],
  );

  // Android hardware back -> pop the module stack first.
  const depth = useRef(stack.length);
  depth.current = stack.length;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth.current <= 1) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [back]);

  const value = useMemo<NavApi>(
    () => ({ stack, push, replace, back, resetTo, canGoBack: stack.length > 1 }),
    [stack, push, replace, back, resetTo],
  );

  return <NavContext.Provider value={value}>{children(stack)}</NavContext.Provider>;
}

export function InquiryDataProvider({ value, children }: { value: InquiryCtx; children: React.ReactNode }) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function EntryProvider({ entryKey, focused, children }: { entryKey: string; focused: boolean; children: React.ReactNode }) {
  const v = useMemo(() => ({ key: entryKey, focused }), [entryKey, focused]);
  return <EntryContext.Provider value={v}>{children}</EntryContext.Provider>;
}
