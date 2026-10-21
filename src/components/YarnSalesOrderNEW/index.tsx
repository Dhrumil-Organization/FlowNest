// FILE: src/components/YarnSalesOrderNEW/index.tsx
// NEW ERP port of the Legacy "Yarn Sales Order" module:
//   sales order list -> select party -> order summary -> item -> grade -> shade(s) ->
//   qty / rate details -> save, plus open / modify / delete / print of a saved order.
//
// Legacy sources (components/YarnSalesOrder/):
//   index.tsx (Sales Order Browse), PartyListScreen.tsx, OrderSummaryScreen.tsx,
//   SalesOrderItemList.tsx, AddNewItemScreen.tsx, SalesOrderGradeList.tsx,
//   SalesOrderShadeList.tsx, SalesOrderDetails.tsx, SalesOrderAddAnotherShade.tsx,
//   SalesOrderSaveSuccess.tsx, SalesOrderContext.tsx, Shared/PdfViewerScreenMain.tsx
// Legacy routes: app/(tabs)/yarn-sales-order.tsx + PartyListScreen, OrderSummaryScreen,
//   SalesOrderItemList, AddNewItemScreen, SalesOrderGradeList, SalesOrderShadeList,
//   SalesOrderDetails, SalesOrderAddAnotherShade, SalesOrderSaveSuccess, pdf-view.
// The legacy screens, routes and files are untouched.
//
// Files of this folder
//   index.tsx        this file: the step stack (replaces the expo-router pushes)
//   api.ts           every HTTP call (endpoint list + payloads documented there)
//   model.ts         pure rules: numbers, dates, row merge, validation, save payload
//   nav.ts           step / flow types            ui.tsx   shared presentation pieces
//   BrowseStep.tsx   PartyStep.tsx   SummaryStep.tsx   ItemStep.tsx   AddItemStep.tsx
//   GradeStep.tsx    ShadeStep.tsx   DetailsStep.tsx   ResultSteps.tsx   PdfStep.tsx
//
// Navigation: a local stack of { step, params }. Lower entries stay mounted (hidden),
// so the order being edited lives in SummaryStep while the pickers are open on top of
// it. Android hardware back closes one step; on the list it is left to the app.
//
// Legacy behaviour kept as-is (looks like a Legacy bug — decide if you want it changed)
//   1. (fixed Oct 2026) Save used to send the party City as `DZip` / `DCity` / `Station`.
//      It now sends the delivery address: DAdd / DCity / DState / DCnty / DZip (and
//      Station = delivery city), falling back to the billing address. Old orders whose
//      DZip holds the city show a blank zip.
//   2. Picking a delivery address ("Tap to change") sets only the delivery fields and
//      sends the address SrNo as `QtyKgs`; the party's billing address is not changed.
//   3. (replaced) Delivery Days / Date are no longer on the form — see "Changes" below.
//   4. Discount and Tax % have no input; the values loaded with a saved order are still
//      used for DisAmt / TaxAmt / NetAmt.
//   5. The list opens with From = To = today and no property / year; the dates shown in
//      the filter apply only after "Apply Filter". The year picker's first entry is
//      built from the calendar year (in Jan-Mar it is one financial year ahead).
//   6. Returning rows to the order merges rows with the same Item + Grade + Shade
//      (Qty and Pcs added, Rate of the later row) — this also merges such duplicates
//      that were already saved in the order.
//   7. Adding a shade whose Item + Grade + Shade is already on the order is skipped
//      silently (the confirmation screen still shows it).
//
// Changes requested after the port (Oct 2026)
//   - Due Days / Due Date replace Delivery Days / Date. Due Days starts from the party's
//     credit days and is editable; Due Date = SO date + Due Days, and picking a Due Date
//     sets Due Days. Saved as DueDay / DueDate. DDays: a saved order keeps its own value,
//     a new order sends the Due Days.
//   - Sales Executive can be changed on the order (saved as SExe).
//   - Sales Party card after the main party. Saved in main[SALES_PARTY_KEYS] (model.ts) —
//     CONFIRM those column names with the backend. Not picked = same as the main party.
//   - Qty / Pcs / Rate pencils on every row (changed in place, Amount recalculated).
//   - Available stock shown on every row (tap for the merchant-wise breakdown).
//   - Search box over the order rows.
//   - Billing vs delivery address kept apart (model.ts): the Party card shows the billing
//     address (party master); the details sheet shows Delivery Address / City / State /
//     Country / Zip. A saved order's billing address is filled from /api/accountbasic.
//   - Sales Party card shows its billing address with City, State, Country - Zip.
//
// Deliberate differences from legacy
//   - No own header / StatusBar / SafeArea: the global AppHeader is used; every step
//     has a back row instead.
//   - The order summary keeps its state between steps. Legacy re-opened a blank summary
//     after every item / grade / shade pick, which reset Delivery Days and Remark and —
//     on a saved order — dropped the loaded header from the save payload.
//   - Row menu "Edit" opens the details form of that row (Qty / Pcs / Rate / Remark /
//     Stock Sales). In legacy it did the same as the Item pencil, so a row's quantity
//     or rate could only be changed by deleting and re-adding the row.
//   - "Change" party on a new order keeps the rows already added (legacy opened a new
//     blank order). Changing the temp party '-1' of an authorised order swaps the party
//     in place (legacy started a new order instead).
//   - "+ Add New Item" continues to the grade list with the new item (code '-1'). The
//     legacy button passed its data in a shape the grade screen could not read and
//     stopped with "Item is missing."
//   - After Delete from the summary the list opens again, reloaded (legacy stayed on
//     the deleted order). After Save, Back goes to the list, not to the unsaved form
//     (legacy went back to the form, where Save could be pressed a second time).
//   - Filter "Reset" reloads the list with the reset values (legacy reloaded with the
//     old ones). An empty result shows "No sales order found" (legacy kept showing the
//     loading placeholders).
//   - A saved order that fails to load shows "Try again" instead of an empty form that
//     could be saved over the order. Leaving a changed order asks "Discard changes?".
//   - Shade step: "Next" with nothing ticked says "Please select shade" at once
//     (legacy only at the next screen); the refresh button reloads the current search.
//   - Party list: the party request is sent once (legacy re-sent the identical request
//     after every key press); the on-screen filter is the same.
//   - Server error text is shown when the server sends one (legacy read a wrong field
//     and always showed the generic text).
//   - Lists use 1 / 2 / 3 columns by screen width; pickers are sheets (bottom sheet on
//     phone, dialog on tablet / web).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { T } from '../../../src/theme';
import AddItemStep from './AddItemStep';
import BrowseStep from './BrowseStep';
import DetailsStep from './DetailsStep';
import GradeStep from './GradeStep';
import ItemStep from './ItemStep';
import { BrowseSignal, Nav, StepName } from './nav';
import PartyStep from './PartyStep';
import PdfStep from './PdfStep';
import { SavedStep, ShadeDoneStep } from './ResultSteps';
import ShadeStep from './ShadeStep';
import SummaryStep from './SummaryStep';

type Props = { token: string; API: string; username?: string };

type Entry = { id: number; step: StepName; params?: any };

export default function YarnSalesOrderNEW({ token, API }: Props) {
  const nextId = useRef(1);
  const [stack, setStack] = useState<Entry[]>([{ id: 0, step: 'browse' }]);
  const [signal, setSignal] = useState<BrowseSignal | null>(null);
  const signalKey = useRef(0);

  /** entry id -> leave guard (returns true when it handles the back press itself). */
  const guards = useRef(new Map<number, () => boolean>());
  /** entry id -> its nav object (stable for the life of the entry). */
  const navs = useRef(new Map<number, Nav>());

  const stackRef = useRef(stack);
  stackRef.current = stack;

  const emit = useCallback((s?: Omit<BrowseSignal, 'key'>) => {
    if (!s) return;
    signalKey.current += 1;
    setSignal({ ...s, key: signalKey.current });
  }, []);

  const push = useCallback((step: StepName, params?: any) => {
    // a step that is already on top is not opened twice (double tap)
    setStack((prev) => (prev[prev.length - 1]?.step === step ? prev : [...prev, { id: nextId.current++, step, params }]));
  }, []);

  /** Close the step `id` if it is the visible one. */
  const popIfTop = useCallback((id: number) => {
    setStack((prev) => (prev.length > 1 && prev[prev.length - 1].id === id ? prev.slice(0, -1) : prev));
  }, []);

  const backFrom = useCallback(
    (id: number) => {
      const cur = stackRef.current;
      if (cur.length <= 1 || cur[cur.length - 1].id !== id) return;
      const guard = guards.current.get(id);
      if (guard && guard()) return;
      // Leaving "Order Saved" always lands on the list.
      if (cur[cur.length - 1].step === 'saved') {
        setStack((prev) => prev.slice(0, 1));
        return;
      }
      popIfTop(id);
    },
    [popIfTop],
  );

  const navFor = (id: number): Nav => {
    const cached = navs.current.get(id);
    if (cached) return cached;
    const nav: Nav = {
      push,
      back: () => backFrom(id),
      forceBack: () => popIfTop(id),
      popToSelf: () =>
        setStack((prev) => {
          const at = prev.findIndex((e) => e.id === id);
          return at >= 0 ? prev.slice(0, at + 1) : prev;
        }),
      restartWith: (step, params, s) => {
        setStack((prev) => [prev[0], { id: nextId.current++, step, params }]);
        emit(s);
      },
      exitToBrowse: (s) => {
        setStack((prev) => prev.slice(0, 1));
        emit(s);
      },
      setGuard: (guard) => {
        if (guard) guards.current.set(id, guard);
        else guards.current.delete(id);
      },
    };
    navs.current.set(id, nav);
    return nav;
  };

  // forget guards / nav objects of closed steps
  useEffect(() => {
    const open = new Set(stack.map((e) => e.id));
    Array.from(guards.current.keys()).forEach((id) => {
      if (!open.has(id)) guards.current.delete(id);
    });
    Array.from(navs.current.keys()).forEach((id) => {
      if (!open.has(id)) navs.current.delete(id);
    });
  }, [stack]);

  const depth = stack.length;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const cur = stackRef.current;
      if (cur.length <= 1) return false;
      backFrom(cur[cur.length - 1].id);
      return true;
    });
    return () => sub.remove();
  }, [depth, backFrom]);

  const renderStep = (entry: Entry) => {
    const nav = navFor(entry.id);
    switch (entry.step) {
      case 'browse':
        return <BrowseStep token={token} API={API} nav={nav} signal={signal} />;
      case 'party':
        return <PartyStep token={token} API={API} nav={nav} params={entry.params} />;
      case 'summary':
        return <SummaryStep token={token} API={API} nav={nav} params={entry.params} />;
      case 'item':
        return <ItemStep token={token} API={API} nav={nav} flow={entry.params} />;
      case 'addItem':
        return <AddItemStep nav={nav} flow={entry.params} />;
      case 'grade':
        return <GradeStep token={token} API={API} nav={nav} flow={entry.params} />;
      case 'shade':
        return <ShadeStep token={token} API={API} nav={nav} flow={entry.params} />;
      case 'details':
        return <DetailsStep token={token} API={API} nav={nav} flow={entry.params} />;
      case 'shadeDone':
        return <ShadeDoneStep nav={nav} params={entry.params} />;
      case 'saved':
        return <SavedStep nav={nav} params={entry.params} />;
      case 'pdf':
        return <PdfStep pdfUrl={entry.params?.pdfUrl} title={entry.params?.title || 'PDF Preview'} onBack={nav.back} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {stack.map((entry, index) => {
        const top = index === stack.length - 1;
        return (
          <View
            key={entry.id}
            style={top ? { flex: 1 } : { display: 'none' }}
            pointerEvents={top ? 'auto' : 'none'}
            accessibilityElementsHidden={!top}
            importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
          >
            {renderStep(entry)}
          </View>
        );
      })}
    </View>
  );
}
