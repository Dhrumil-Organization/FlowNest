// eventYear.js
// ONE source of truth for the financial year (yearno) used by every Event
// API call — enquiry save / sync / edit / delete, master downloads and the
// Event reports. No year is hardcoded anywhere in the Event module.
//
// Order of preference (most accurate first):
//   1. 'yno'          → year of the logged-in NEW ERP session (saved at login
//                       from the ERP user defaults — same key every other NEW
//                       ERP screen uses).
//   2. 'app_session'  → business_context.year_no of the same login.
//   3. Current Indian financial year (April–March) as a last resort, e.g.
//      before the first login on an old install.

import AsyncStorage from '@/common/utils/compatibleStorage';
import { getCurrentFinancialYear } from '../../common/commonfunction';

const clean = (v) => {
  const s = String(v ?? '').trim();
  return s && s !== 'undefined' && s !== 'null' && s !== '0' ? s : '';
};

export async function getEventYearNo() {
  try {
    const yno = clean(await AsyncStorage.getItem('yno'));
    if (yno) return yno;

    const raw = await AsyncStorage.getItem('app_session');
    const session = raw ? JSON.parse(raw) : null;
    const fromSession = clean(session?.business_context?.year_no);
    if (fromSession) return fromSession;
  } catch {
    // fall through to the calendar financial year
  }
  return getCurrentFinancialYear();
}
