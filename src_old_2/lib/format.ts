export const rupee  = (n: number) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN',{ minimumFractionDigits:2 })
export const rupee0 = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const fvNum  = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(2)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`
export const fmt    = (n: number) => Math.round(n).toLocaleString('en-IN')
export const fmtD   = (d: string) => new Date(d+'T00:00:00').toLocaleDateString('en-IN',{ day:'2-digit', month:'short', year:'numeric' })
export const catShort = (c: string) => c==='Linen Shirting'?'Shirting':c==='Linen Suiting'?'Suiting':c