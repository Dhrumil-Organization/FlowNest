// FILE: src/features/beamGatePass/logic.ts

/** "1", "00000001", "00000001/BM" all match outward 00000001/BM */
export const matchesVoucher = (vouNo: string, typed: string) => {
  const t = typed.trim().toUpperCase();
  if (!t) return false;
  const v = vouNo.toUpperCase();
  if (v === t || v.startsWith(`${t}/`)) return true;
  const vn = Number(v.split('/')[0].replace(/\D/g, ''));
  const tn = Number(t.split('/')[0].replace(/\D/g, ''));
  const ts = t.includes('/') ? t.split('/')[1] : '';
  return !!tn && vn === tn && (!ts || v.endsWith(`/${ts}`));
};
