import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import AsyncStorage from '@react-native-async-storage/async-storage'

const GREIGE_STOCK: Record<string, any> = {
  MD01: { qty:1200, rsv:300, rate:196, da:12 },
  MD02: { qty:900,  rsv:200, rate:178, da:8  },
  MD03: { qty:600,  rsv:150, rate:188, da:18 },
  MD04: { qty:800,  rsv:400, rate:96,  da:6  },
}

const FINISHED_STOCK: Record<string, any> = {
  MD01: { rate:262, da:10, shades:[{ s:'Passat 1',     qty:320, rsv:80  }, { s:'Passat 16',    qty:180, rsv:0   }] },
  MD02: { rate:175, da:8,  shades:[{ s:'Oxford 1',     qty:280, rsv:100 }] },
  MD04: { rate:108, da:5,  shades:[{ s:'Active Grid 1',qty:600, rsv:200 }] },
}

const YARN_STOCK = [
  { id:'g01', mId:'Y03', name:'40 Lea Linen',   vname:'Dry Spun', qty:320, rsv:80,  rate:420, da:15 },
  { id:'g02', mId:'Y03', name:'40 Lea Linen',   vname:'Wet Spun', qty:180, rsv:0,   rate:460, da:45 },
  { id:'g03', mId:'Y07', name:'40 Ne L/C',      vname:'70/30',    qty:280, rsv:80,  rate:340, da:5  },
  { id:'g04', mId:'Y12', name:'40s Cotton',      vname:'Combed',   qty:350, rsv:100, rate:170, da:28 },
  { id:'g05', mId:'Y14', name:'75D Polyester',   vname:'Regular',  qty:600, rsv:200, rate:125, da:7  },
]

export const useStockStore = create<any>()(
  persist(
    immer((set) => ({
      greigeStock:   GREIGE_STOCK,
      finishedStock: FINISHED_STOCK,
      yarnStock:     YARN_STOCK,

      updateYarnQty: (id: string, delta: number) => set((s: any) => {
        const y = s.yarnStock.find((x: any) => x.id === id)
        if (y) y.qty = Math.max(0, y.qty + delta)
      }),
    })),
    {
      name:    'erp-stock',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
