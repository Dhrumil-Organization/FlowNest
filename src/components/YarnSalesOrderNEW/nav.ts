// FILE: src/components/YarnSalesOrderNEW/nav.ts
// Types of the in-module step stack (replaces the legacy expo-router pushes
// between /yarn-sales-order, /PartyListScreen, /OrderSummaryScreen,
// /SalesOrderItemList, /SalesOrderGradeList, /SalesOrderShadeList,
// /SalesOrderDetails, /SalesOrderAddAnotherShade, /SalesOrderSaveSuccess, /pdf-view).
import { OrderCtx, OrderMode, Row } from './model';

export type StepName =
  | 'browse'
  | 'party'
  | 'summary'
  | 'item'
  | 'addItem'
  | 'grade'
  | 'shade'
  | 'details'
  | 'shadeDone'
  | 'saved'
  | 'pdf';

/** Sent to the browse list when the user comes back from an order. */
export type BrowseSignal = {
  key: number;
  kind: 'saved' | 'deleted';
  prpcode?: any;
  yearno?: any;
  strcode?: any;
};

export type Nav = {
  /** Open a step on top of the current one. */
  push: (step: StepName, params?: any) => void;
  /** Close this step (only while it is the visible one). Runs the leave guard first. */
  back: () => void;
  /** Close this step without asking the leave guard. */
  forceBack: () => void;
  /** Close every step that was opened on top of this one. */
  popToSelf: () => void;
  /** Close everything down to the browse list, then open `step` on it. */
  restartWith: (step: StepName, params?: any, signal?: Omit<BrowseSignal, 'key'>) => void;
  /** Close everything down to the browse list. */
  exitToBrowse: (signal?: Omit<BrowseSignal, 'key'>) => void;
  /**
   * Leave guard of this step: return true when the step handles the back press
   * itself (e.g. shows "Discard changes?"). Pass null to remove it.
   */
  setGuard: (guard: (() => boolean) | null) => void;
};

/**
 * What travels through Item -> Grade -> Shade -> Details (the legacy router
 * params of those screens). `workingRows` is the order's row list at the moment
 * the flow started; `onDone` hands the finished list back to the summary.
 */
export type PickFlow = {
  ctx: OrderCtx;
  mode: OrderMode;
  uid: string;
  party: Row | null;
  /** true when an existing row is being changed. */
  editMode: boolean;
  oldRow: Row | null;
  workingRows: Row[];
  /** Which single part of `oldRow` is being replaced (null = full add flow). */
  replace: 'item' | 'grade' | 'shade' | 'details' | null;
  selectedItem?: Row;
  selectedGrade?: Row;
  selectedShades?: Row[];
  onDone: (rows: Row[], isEdit: boolean) => void;
};
