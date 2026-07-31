import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SEED_MAINS } from '../data/seeds'     // ← fix: was @/constants/seeds

interface DesignState {
  mains:       any[]
  subs:        any[]
  costings:    any[]
  shades:      any[]
  addMain:     (m: any) => void
  addColorway: (s: any) => void
  addCosting:  (c: any) => void
  addShade:    (s: any) => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    immer((set) => ({
      mains:    SEED_MAINS,
      subs:     [],
      costings: [],
      shades:   [],

      addMain:     (m) => set(st => { st.mains.push(m) }),
      addColorway: (s) => set(st => { st.subs.push(s) }),
      addCosting:  (c) => set(st => { st.costings.push(c) }),
      addShade:    (s) => set(st => { st.shades.push(s) }),
    })),
    {
      name:    'erp-designs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
