export const buildOrderYarnRequirement = (lines: any, greigeMetres: any) => {
  const numberOrNull = (value: any) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    ? null : (Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null);
  const metres = numberOrNull(greigeMetres);
  const totals: Record<string, number> = { warp: 0, weft: 0, selvedge: 0, overall: 0 };
  const rows = (Array.isArray(lines) ? lines : []).map((value: any, index: number) => {
    const line = value && typeof value === 'object' ? value : {};
    const type = String(line.yarn_type || '').trim().toLowerCase();
    const grams = numberOrNull(line.grams_per_metre);
    const kilograms = numberOrNull(line.kg_per_metre);
    const invalidValue = ['grams_per_metre', 'kg_per_metre'].some((key: string) => line[key] !== undefined && line[key] !== null && line[key] !== '' && numberOrNull(line[key]) === null);
    const inconsistent = invalidValue || (grams !== null && kilograms !== null && Math.abs(grams / 1000 - kilograms) > 0.0000001);
    const kgPerMetre = inconsistent ? null : (kilograms !== null ? kilograms : (grams !== null ? grams / 1000 : null));
    const supportedType = ['warp', 'weft', 'selvedge'].includes(type);
    const requiredKg = supportedType && kgPerMetre !== null && metres !== null ? kgPerMetre * metres : null;
    if (requiredKg !== null) {
      totals[type] += requiredKg;
      totals.overall += requiredKg;
    }
    return { ...line, rowKey: `${type}-${line.design_line_id || line.mi_id || 'line'}-${index}`,
      yarn_type: type, kgPerMetre, gramsPerMetre: kgPerMetre === null ? null : kgPerMetre * 1000, requiredKg };
  });
  const complete = metres !== null && rows.length > 0 && rows.every((row: any) => row.requiredKg !== null)
    && rows.some((row: any) => row.yarn_type === 'warp') && rows.some((row: any) => row.yarn_type === 'weft');
  return { rows, complete, totals: complete ? totals : null };
};

// Legacy TotWt is stored on the row's CostDiv basis, rather than directly in g/m.
// Verify the conversion against the saved cost before using it for order planning.
export const normalizeLegacyYarn = (row: any, yarnType: string) => {
  const line = { ...row, yarn_type: yarnType, name: row?.YarnName || row?.name };
  if (row?.grams_per_metre !== undefined || row?.kg_per_metre !== undefined) return line;
  const read = (value: any) => value === null || value === undefined || String(value).trim() === ''
    ? NaN : Number(value);
  const weight = read(row?.TotWt);
  const divisor = read(row?.CostDiv);
  const rate = read(row?.YarnRate);
  const cost = read(row?.Cost);
  if (![weight, divisor, rate, cost].every(Number.isFinite)
      || weight < 0 || divisor <= 0 || rate <= 0 || cost < 0) return line;
  const kgPerMetre = weight / divisor;
  // Both source weights and costs are rounded; allow two paise per metre.
  if (Math.abs(kgPerMetre * rate - cost) > 0.0200001) return line;
  return { ...line, kg_per_metre: kgPerMetre };
};
