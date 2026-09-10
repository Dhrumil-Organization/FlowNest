import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import AsyncStorage from '@/common/utils/compatibleStorage'

const INIT_UNITS = ['01-Jun','02-Jun','03-Jun','04-Jun'].map(d => ({
  d, mwLooms:0, mwLuwa:0, sudLooms:0, sudLuwa:0, wjetLooms:0, warping:0, misc:0,
}))

export const useExpenseStore = create<any>()(
  persist(
    immer((set) => ({
      rate:       7.67,
      days:       4,
      stores:     { rapier: 33279, wjet: 23166 },
      dailyUnits:  INIT_UNITS,
      dailySalary: ['01-Jun','02-Jun','03-Jun','04-Jun'].map(d => ({ d, rapier:0, wjet:0 })),
      dailyMaint:  ['01-Jun','02-Jun','03-Jun','04-Jun'].map(d => ({ d, rapier:0, wjet:0, common:0 })),
      dailyOther:  ['01-Jun','02-Jun','03-Jun','04-Jun'].map(d => ({ d, rapier:0, wjet:0, common:0 })),

      setUnitCell:  (i: number, k: string, v: any) => set((s: any) => { s.dailyUnits[i][k]  = Number(v) || 0 }),
      setSalCell:   (i: number, k: string, v: any) => set((s: any) => { s.dailySalary[i][k] = Number(v) || 0 }),
      setMaintCell: (i: number, k: string, v: any) => set((s: any) => { s.dailyMaint[i][k]  = Number(v) || 0 }),
      setOtherCell: (i: number, k: string, v: any) => set((s: any) => { s.dailyOther[i][k]  = Number(v) || 0 }),
      setRate: (v: number) => set((s: any) => { s.rate = v }),
      setDays: (v: number) => set((s: any) => { s.days = v }),

      addUnitDay: () => set((s: any) => {
        const last = s.dailyUnits[s.dailyUnits.length - 1] || {}
        s.dailyUnits.push({ ...last, d: `${s.dailyUnits.length + 1}-Jun` })
      }),
      addSalDay: () => set((s: any) => {
        const last = s.dailySalary[s.dailySalary.length - 1] || {}
        s.dailySalary.push({ ...last, d: `${s.dailySalary.length + 1}-Jun` })
      }),
    })),
    {
      name:    'erp-expense',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// ── Pure compute — pass useExpenseStore.getState() or the hook value ──
export function computeExpense(e: any) {
  const r = e.rate || 0
  const u = (e.dailyUnits || []).reduce((acc: any, row: any) => {
    for (const k of ['mwLooms','mwLuwa','sudLooms','sudLuwa','wjetLooms','warping','misc'])
      acc[k] = (acc[k] || 0) + (row[k] || 0)
    return acc
  }, {})
  const eAll       = Object.fromEntries(Object.entries(u).map(([k, v]) => [k, (v as number) * r]))
  const elecTotal  = Object.values(eAll).reduce((s: any, x: any) => s + x, 0)
  const shared     = (eAll.warping || 0) + (eAll.misc || 0)
  const rapierElec = (eAll.mwLooms||0)+(eAll.mwLuwa||0)+(eAll.sudLooms||0)+(eAll.sudLuwa||0)+(2/3)*shared
  const wjetElec   = (eAll.wjetLooms||0)+(1/3)*shared
  const salT       = (e.dailySalary || []).reduce(
    (a: any, row: any) => ({ rapier: a.rapier+(row.rapier||0), wjet: a.wjet+(row.wjet||0) }),
    { rapier:0, wjet:0 }
  )
  const salTotal   = salT.rapier + salT.wjet
  const storeTotal = (e.stores?.rapier || 0) + (e.stores?.wjet || 0)
  const coreTotal  = elecTotal + salTotal + storeTotal
  return {
    elecTotal, rapierElec, wjetElec,
    salTotal, storeTotal, coreTotal,
    unitsTotal: Object.values(u).reduce((s: number, x: any) => s + x, 0),
  }
}
