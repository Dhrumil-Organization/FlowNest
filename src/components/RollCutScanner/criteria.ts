// FILE: src/components/RollCutScanner/criteria.ts
// Property list of the filter. Same source as Taka History / Stock Verification (fetchProperties),
// only the txntype is 'roll_cut_scanner'. prptype is dynamic: useBusinessContext().prpGroup -> stored user_prptype.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import { useEffect, useMemo, useState } from 'react';
import { fetchProperties, type Api } from '../StockVerificationNEW/verificationApi';
import type { Row, VerifyConfig } from '../StockVerificationNEW/verificationModel';
import { TXN_ROLL_CUT, str, type Opt } from './api';

// fetchProperties reads its screen config from `api.cfg` -> give it the Roll Cut txntype.
const CRITERIA_CFG = { kind: 'fabric', title: 'Roll Cut', txntype: TXN_ROLL_CUT } as unknown as VerifyConfig;

type Args = { token: string; API: string; onAutoProperty: (code: string) => void };

export function useRollCutCriteria({ token, API, onAutoProperty }: Args) {
  const { prpGroup } = useBusinessContext();
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    if (prpGroup) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v: string | null) => alive && setStored(String(v || '').trim()))
      .catch(() => alive && setStored(''));
    return () => {
      alive = false;
    };
  }, [prpGroup]);

  const prptype = String(prpGroup || stored || '').trim();
  const prptypeMissing = (!!prpGroup || stored !== null) && !prptype;

  const api: Api | null = useMemo(
    () => (token && API && prptype ? { API, token, prptype, cfg: CRITERIA_CFG } : null),
    [API, token, prptype],
  );

  const [props, setProps] = useState<Row[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    setPropLoading(true);
    fetchProperties(api)
      .then((r) => {
        if (!alive) return;
        setProps(r);
        const ok = r.filter((x) => str(x?.PrpCode) !== '');
        if (ok.length === 1) onAutoProperty(str(ok[0].PrpCode));
      })
      .catch((e: any) => {
        if (alive) setProps([]);
        console.log('[Roll Cut] property error', e?.message);
      })
      .finally(() => alive && setPropLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, tick]);

  const propOpts: Opt[] = useMemo(
    () => props.filter((x) => str(x?.PrpCode) !== '').map((x) => ({ value: str(x.PrpCode), label: str(x.LngName) || str(x.PrpCode) })),
    [props],
  );

  return { prptype, prptypeMissing, propOpts, propLoading, reloadProps: () => setTick((t) => t + 1) };
}
