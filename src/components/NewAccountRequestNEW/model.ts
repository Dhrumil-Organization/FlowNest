// FILE: src/components/NewAccountRequestNEW/model.ts
// Pure helpers of New Account Request — copied 1:1 from legacy components/NewAccountRequest/index.tsx.

export type Row = { [key: string]: any };
export type Action = 'accept' | 'reject';
export type EditMap = { [uid: string]: { CrLimit?: string; CrDay?: string; CrLimitRaw?: string; CrDayRaw?: string } };

export const str = (v: any) => (v === null || v === undefined ? '' : String(v));

/** legacy uid generator for browse rows */
export const makeUid = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/** legacy formatToIndianCurrency */
export const formatToIndianCurrency = (value: string | number) => {
  const numericValue = typeof value === 'string'
    ? value.replace(/[^0-9.]/g, '')
    : String(value).replace(/[^0-9.]/g, '');
  const num = parseFloat(numericValue) || 0;
  return num.toLocaleString('en-IN');
};

/** legacy filteredData (filterKey is always 'all': any value of the row contains the query) */
export const searchRows = (data: Row[], searchQuery: string) => {
  if (!searchQuery) return data;
  return data.filter((item) =>
    Object.values(item).some((val) => String(val).toLowerCase().includes(searchQuery.toLowerCase())),
  );
};

/** legacy handleEdit */
export const applyEdit = (prev: EditMap, uid: string, field: 'CrLimit' | 'CrDay', formattedValue: string): EditMap => {
  const rawValue = formattedValue.replace(/[₹,]/g, '');
  const displayValue = formatToIndianCurrency(rawValue || '0');
  return {
    ...prev,
    [uid]: {
      ...prev[uid],
      [field]: field === 'CrLimit' ? displayValue : formattedValue,
      [`${field}Raw`]: rawValue,
    },
  };
};

/** legacy handleConfirmAction payload — same keys, same order, same value sources.
 *  NOTE (legacy behaviour kept): CrLimit / CrDay come from the ROW, not from the edited inputs. */
export const authPayload = (selectedItem: Row, action: Action): Row => {
  const paylaodData: Row = { ...selectedItem };
  delete paylaodData.uid;
  return {
    ...paylaodData,
    CrLimit: formatToIndianCurrency(paylaodData.CrLimit || '0'),
    CrDay: (paylaodData.CrDay || '0'),
    IsAuth: action === 'accept' ? 1 : 2,
    referrer: 'dashboard',
    txntype: 'newaccountrequest',
    action: 'edit',
  };
};
