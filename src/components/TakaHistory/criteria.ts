// FILE: src/components/TakaHistory/criteria.ts
// Property -> Year -> Store option lists of the filter. Uses the SAME calls as Stock Verification
// (StockVerificationNEW): fetchProperties (properties) and useYearStore (years of the property, then stores
// of property + year). prptype is dynamic exactly like there: useBusinessContext().prpGroup -> stored user_prptype.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import { useEffect, useMemo, useState } from 'react';
import { toOpts, useYearStore, type Opt } from '../StockVerificationNEW/ui';
import { fetchProperties, type Api } from '../StockVerificationNEW/verificationApi';
import { str, type Row, type VerifyConfig } from '../StockVerificationNEW/verificationModel';

// Stock Verification passes its screen config inside `api`; the property / year / store lists only need the
// fabric flavour of it (Taka History = fabric takas).
const CRITERIA_CFG = { kind: 'fabric', title: 'Taka History' } as unknown as VerifyConfig;

type Args = {
  token: string;
  API: string;
  onAutoProperty: (code: string) => void; // only one property -> pick it
  // year / store lists are no longer used by the filter (financial year is automatic, store is fixed);
  // kept optional only for the old FilterScreen.
  prpCode?: string;
  yearNo?: string;
  onAutoYear?: (year: string) => void;
  onAutoStore?: (store: string) => void;
};

const noop = () => {};

export function useTakaCriteria({ token, API, prpCode = '', yearNo = '', onAutoProperty, onAutoYear = noop, onAutoStore = noop }: Args) {
  /* ------------------------- dynamic prptype ----------------------------- */
  const { prpGroup } = useBusinessContext();
  const [storedPrptype, setStoredPrptype] = useState<string | null>(null);
  useEffect(() => {
    if (prpGroup) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v: string | null) => {
        if (alive) setStoredPrptype(String(v || '').trim());
      })
      .catch(() => {
        if (alive) setStoredPrptype('');
      });
    return () => {
      alive = false;
    };
  }, [prpGroup]);
  const prptype = String(prpGroup || storedPrptype || '').trim();
  const prptypeResolved = !!prpGroup || storedPrptype !== null;

  const api: Api | null = useMemo(
    () => (token && API && prptype ? { API, token, prptype, cfg: CRITERIA_CFG } : null),
    [API, token, prptype],
  );

  /* ---------------------------- properties ------------------------------- */
  const [props, setProps] = useState<Row[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [propTick, setPropTick] = useState(0);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    setPropLoading(true);
    fetchProperties(api)
      .then((r) => {
        if (!alive) return;
        setProps(r);
        const opts = r.filter((x) => str(x?.PrpCode) !== '');
        if (opts.length === 1) onAutoProperty(str(opts[0].PrpCode));
      })
      .catch((e: any) => {
        if (alive) {
          setProps([]);
          console.log('[Taka History] get_criterion error', e?.message);
        }
      })
      .finally(() => alive && setPropLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, propTick]);

  const propOpts: Opt[] = useMemo(() => toOpts(props, 'PrpCode', 'LngName'), [props]);

  /* ----------------------------- year + store ---------------------------- */
  const ys = useYearStore(api, prpCode, yearNo, onAutoYear, onAutoStore);

  return {
    propOpts,
    propLoading,
    reloadProps: () => setPropTick((t) => t + 1),
    yearOpts: ys.yearOpts as Opt[],
    yearLoading: ys.yLoading as boolean,
    reloadYears: ys.reloadYears as () => void,
    storeOpts: ys.storeOpts as Opt[],
    storeLoading: ys.sLoading as boolean,
    reloadStores: ys.reloadStores as () => void,
    prptypeMissing: prptypeResolved && !prptype,
  };
}
