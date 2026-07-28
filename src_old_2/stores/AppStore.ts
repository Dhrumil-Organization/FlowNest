// ─────────────────────────────────────────────────────────────
// FILE: src/stores/AppStore.ts
//
// Single unified store — matches every useAppStore(s => s.X)
// call across all screens. Uses AsyncStorage for persistence
// (works in Expo Go; swap to MMKV when on a dev build).
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  SEED_MAINS,
  SEED_SUBS,
  SEED_ORDERS,
} from '../data/seeds'

import type {
  UserAccount,
  MainDesign,
  SubDesign,
  CostingRecord,
  SalesOrder,
} from '../types'

// ─────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────
interface AppState {
  // ── auth ──────────────────────────────────────────────────
  user: UserAccount | null
  setUser:  (u: UserAccount | null) => void

  // ── designs ───────────────────────────────────────────────
  mains:    MainDesign[]
  subs:     SubDesign[]
  costings: CostingRecord[]
  addMain:     (m: MainDesign)     => void
  addSub:      (s: SubDesign)      => void
  addCosting:  (c: CostingRecord)  => void

  // ── orders ────────────────────────────────────────────────
  orders:        SalesOrder[]
  addOrder:      (o: SalesOrder)   => void
  authorizeOrder:(soNumber: string) => void
  rejectOrder:   (soNumber: string) => void
  dispatchOrder: (soNumber: string, updates: Record<string, number>) => void

  // ── bootstrap ─────────────────────────────────────────────
  // loadFromStorage is called in App.tsx useEffect.
  // With zustand/persist it's a no-op (data already rehydrated)
  // but we expose it so the call in App.tsx doesn't crash.
  loadFromStorage: () => void
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // ── auth ────────────────────────────────────────────────
      user: null,
      setUser: (u) => set((s) => { s.user = u }),

      // ── designs ─────────────────────────────────────────────
      mains:    SEED_MAINS,
      subs:     SEED_SUBS,
      costings: [],

      addMain: (m) => set((s) => {
        if (!s.mains.find(x => x.id === m.id)) s.mains.push(m)
      }),
      addSub: (sub) => set((s) => {
        if (!s.subs.find(x => x.id === sub.id)) s.subs.push(sub)
      }),
      addCosting: (c) => set((s) => { s.costings.push(c) }),

      // ── orders ──────────────────────────────────────────────
      orders: SEED_ORDERS,

      addOrder: (o) => set((s) => { s.orders.push(o) }),

      authorizeOrder: (soNumber) => set((s) => {
        const o = s.orders.find(x => x.soNumber === soNumber)
        if (o) o.status = 'authorized'
      }),

      rejectOrder: (soNumber) => set((s) => {
        const o = s.orders.find(x => x.soNumber === soNumber)
        if (o) o.status = 'rejected'
      }),

      dispatchOrder: (soNumber, updates) => set((s) => {
        const o = s.orders.find(x => x.soNumber === soNumber)
        if (!o) return
        o.colors.forEach((c) => {
          const dispatched = updates[c.color]
          if (dispatched) {
            c.pendingQty = Math.max(0, c.pendingQty - dispatched)
          }
        })
      }),

      // ── bootstrap ───────────────────────────────────────────
      // zustand/persist rehydrates automatically on mount.
      // This is a no-op kept so App.tsx useEffect doesn't throw.
      loadFromStorage: () => {},
    })),
    {
      name:    'erp-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// ─────────────────────────────────────────────────────────────
// autoSave — called after mutations in screens.
// With zustand/persist, state is auto-persisted on every set(),
// so this is also a no-op. Kept so screen imports don't break.
// ─────────────────────────────────────────────────────────────
export function autoSave() {
  // no-op — zustand/persist handles this automatically
}
