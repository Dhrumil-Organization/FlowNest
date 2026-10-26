import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import AsyncStorage from '@/common/utils/compatibleStorage'
import { SEED_ORDERS } from '../data/seeds'   // ← fix: was @/constants/seeds

export const useOrderStore = create<any>()(
  persist(
    immer((set) => ({
      orders: SEED_ORDERS,

      addOrder: (o: any) => set((s: any) => {
        s.orders.push(o)
      }),

      authorize: (so: string) => set((s: any) => {
        const o = s.orders.find((x: any) => x.soNumber === so)
        if (o) o.status = 'authorized'
      }),

      reject: (so: string) => set((s: any) => {
        const o = s.orders.find((x: any) => x.soNumber === so)
        if (o) o.status = 'rejected'
      }),

      confirmColor: (so: string, shade: string) => set((s: any) => {
        const o = s.orders.find((x: any) => x.soNumber === so); if (!o) return
        const c = o.colors.find((c: any) => c.color === '__APC__')
        if (c) c.color = shade
      }),

      dispatch: (so: string, updates: Record<string, number>) => set((s: any) => {
        const o = s.orders.find((x: any) => x.soNumber === so); if (!o) return
        o.colors.forEach((c: any) => {
          const dq = updates[c.color]
          if (dq) c.pendingQty = Math.max(0, (c.pendingQty ?? c.qty) - dq)
        })
      }),
    })),
    {
      name:    'erp-orders',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
