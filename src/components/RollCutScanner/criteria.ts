// FILE: src/components/RollCutScanner/criteria.ts
// Property list of the filter. Same source as Taka History / Stock Verification (fetchProperties),
// only the txntype is 'roll_cut_scanner'. prptype is dynamic: useBusinessContext().prpGroup -> stored user_prptype.
//
// OFFLINE: the list saved on the device (offline/masters.ts) is shown immediately; when there is network the
// live API is called as before and refreshes the saved copy. No network / API failed -> the saved copy stays.
import { useEffect, useMemo, useState } from 'react';
import { str, type Opt } from './api';
import { fetchRollCutProperties, getMasters, type PropRow } from './offline/masters';
import { useOnline } from './offline/network';
import { useRollCutPrptype } from './offline/RollCutOfflineBoot';

type Args = { token: string; API: string; scope: string; onAutoProperty: (code: string) => void };

export function useRollCutCriteria({ token, API, scope, onAutoProperty }: Args) {
  const { prptype, prptypeMissing } = useRollCutPrptype();
  const online = useOnline();

  const [props, setProps] = useState<PropRow[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [propsAt, setPropsAt] = useState(0); // when the shown list was downloaded
  const [propsLive, setPropsLive] = useState(false); // true = came from the server in this session
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token || !API || !prptype) return;
    let alive = true;
    const show = (rows: PropRow[], at: number, live: boolean) => {
      if (!alive) return;
      setProps(rows);
      setPropsAt(at);
      setPropsLive(live);
      if (rows.length === 1) onAutoProperty(rows[0].PrpCode);
    };
    (async () => {
      setPropLoading(true);
      // 1) saved copy first -> the dropdown is usable at once, with or without network
      const saved = await getMasters(scope, prptype);
      if (saved.props.length) show(saved.props, saved.propsAt, false);
      // 2) live list when online
      if (online) {
        try {
          await fetchRollCutProperties({ API, token, prptype, scope });
          const m = await getMasters(scope, prptype);
          show(m.props, m.propsAt, true);
        } catch (e: any) {
          console.log('[Roll Cut] property error', e?.message);
        }
      }
    })().finally(() => alive && setPropLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, prptype, scope, online, tick]);

  const propOpts: Opt[] = useMemo(() => props.map((x) => ({ value: str(x.PrpCode), label: str(x.LngName) || str(x.PrpCode) })), [props]);

  return { prptype, prptypeMissing, propOpts, propLoading, propsAt, propsLive, reloadProps: () => setTick((t) => t + 1) };
}
