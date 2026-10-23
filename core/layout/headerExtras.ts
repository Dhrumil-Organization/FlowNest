import type { ReactNode } from 'react';
import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────
// There is now exactly ONE AppHeader in the whole app, rendered once in
// `app/new/(tabs)/_layout.tsx`. Its title/eyebrow come from the current
// route. But a few screens need to put something *extra* in the header —
// Dashboard's business-context subtitle, Orders' "name · role" text,
// Permission Manager's "Sync Registry" button. This store is that one
// narrow escape hatch, instead of each screen rendering its own header.
//
// Screens set/clear this via `useFocusEffect` (not a plain `useEffect`),
// because Expo Router's Tabs keep other tab screens mounted-but-hidden
// rather than unmounting them on tab switch — a plain useEffect's cleanup
// only runs on unmount, so a previous tab's subtitle would keep showing
// after switching tabs. `useFocusEffect`'s cleanup runs on blur (tab
// switched away), which is what we actually want here.
// ─────────────────────────────────────────────────────────────────────────
type HeaderExtrasState = {
  subtitle: string | null;
  right: ReactNode | null;
  setHeaderExtras: (extras: { subtitle?: string | null; right?: ReactNode | null }) => void;
  clearHeaderExtras: () => void;
};

export const useHeaderExtrasStore = create<HeaderExtrasState>((set) => ({
  subtitle: null,
  right: null,
  setHeaderExtras: (extras) =>
    set(() => ({
      subtitle: extras.subtitle !== undefined ? extras.subtitle : null,
      right: extras.right !== undefined ? extras.right : null,
    })),
  clearHeaderExtras: () => set({ subtitle: null, right: null }),
}));
