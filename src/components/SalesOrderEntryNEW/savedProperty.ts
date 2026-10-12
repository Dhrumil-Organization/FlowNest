// FILE: src/components/SalesOrderEntryNEW/savedProperty.ts
// Property used by the Auth / Tracking / Summary tabs.
// They read 'selected_prpcode' (as Legacy). Legacy wrote that key only when the
// property was picked by hand, so a property that New Order auto-selected from the
// saved default criteria never reached the other tabs. Fix (NEW only):
//   1. New Order writes 'selected_prpcode' whenever its property changes (also when auto-selected).
//   2. If the key is still empty (e.g. Auth opened before New Order finished), the tabs
//      read the same saved default criteria New Order uses and take its property.
// Year: Summary reads 'selectedyear', Auth / Tracking read 'selected_yearno' (Legacy never
// wrote that one, so they ignored the picked year). New Order now writes both keys; if a
// key is still empty the tabs take the year of the saved default criteria (useSavedYear).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';

export function useSavedPrpCode(token: string, userid: string | number) {
  const { loadDefaultPreference } = useMobileUserPreference({
    UserId: userid || 0,
    ModuleCode: 'SALES ORDER ENTRY',
    ModuleName: 'SALES ORDER',
    ScreenCode: 'SALES_ORDER_BROWSER',
    ScreenName: 'Sales Order Entry',
    token,
  });

  /** 'selected_prpcode', else the property of the saved default criteria ('' if none). */
  return async (): Promise<string> => {
    const stored = await AsyncStorage.getItem('selected_prpcode');
    if (stored) return stored;
    if (!token || !userid) return '';
    try {
      const saved = await loadDefaultPreference();
      const code = String(saved?.criteria?.prpcode || '');
      if (code) await AsyncStorage.setItem('selected_prpcode', code);
      return code;
    } catch (e) {
      return '';
    }
  };
}

/** Year text for a tab: the stored key, else the saved default year ("27"), else ''. */
export function useSavedYear(token: string, userid: string | number) {
  const { loadDefaultPreference } = useMobileUserPreference({
    UserId: userid || 0,
    ModuleCode: 'SALES ORDER ENTRY',
    ModuleName: 'SALES ORDER',
    ScreenCode: 'SALES_ORDER_BROWSER',
    ScreenName: 'Sales Order Entry',
    token,
  });

  return async (key: 'selected_yearno' | 'selectedyear'): Promise<string> => {
    const stored = await AsyncStorage.getItem(key);
    if (stored) return stored;
    if (!token || !userid) return '';
    try {
      const saved = await loadDefaultPreference();
      return String(saved?.criteria?.yearno || '');
    } catch (e) {
      return '';
    }
  };
}
