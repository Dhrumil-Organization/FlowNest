export const formatCurrency = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return '₹ 0';
  return '₹ ' + Number(n).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const isValidGSTIN = (g: string): boolean => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    (g || '').toUpperCase(),
  );
};

export const isValidEmail = (e: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

export const isValidMobile = (m: string): boolean =>
  /^[6-9]\d{9}$/.test((m || '').replace(/\D/g, '').slice(-10));
