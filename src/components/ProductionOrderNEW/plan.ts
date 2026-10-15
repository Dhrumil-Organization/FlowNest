// FILE: src/components/ProductionOrderNEW/plan.ts
import { round3, firstValue, rowKey, Row } from './format';

/**
 * Pure port of the derived values in SudamoProductionOrderDetailNew.js
 * (lines ~924-1081 of the web ERP), extended with Sourcing (in-house / job work / purchase).
 * Keep this in lock-step with the web screen so both send identical payloads.
 */
export function computePlan(st: Row): Row {
  const {
    sourceMode, selfFabricType, stockType, selectedOrders, selectedGroup, selfDesign,
    baseQtyInput, selfGreigeQtyInput, shrinkage, stockMeters, stockMetersTouched,
    legacyCostingData, legacyCostChoice, newCostChoice, costingResult, resolvedCostingMeta,
    costingLoading, costingError, main
  } = st;

  const rawSoFabric = selectedOrders.length > 0 ? selectedOrders[0].fabric_type : (selectedGroup && selectedGroup.fabric_type);
  const fabricType = sourceMode === 'sales'
    ? (rawSoFabric === 'Greige' || rawSoFabric === 'Finish' ? rawSoFabric : '')
    : selfFabricType;
  const mixedSoFabric = sourceMode === 'sales' && selectedOrders.some((r: Row) => r.fabric_type !== fabricType);

  const selectedDesign = sourceMode === 'sales' ? (selectedOrders[0] || selectedGroup || {}) : selfDesign;
  const metaBase = sourceMode === 'sales' ? (selectedGroup || selectedOrders[0] || {}) : selfDesign;
  const costMeta = { ...metaBase, ...resolvedCostingMeta };
  const costingSource = String(costMeta.design_costing_source || costMeta.DesignCostingSource || '').toUpperCase();
  const costingMdId = String(costMeta.md_id || costMeta.mdId || '').trim();
  const isNewDesignCosting = costingSource === 'NEW' && costingMdId !== '';

  const baseQty = sourceMode === 'sales'
    ? round3(selectedOrders.reduce((s: number, r: Row) => s + Number(r.qty || 0), 0)) : round3(baseQtyInput);
  const selfGf = Number(firstValue(selfDesign.gf_shrink, selfDesign.gfShrink, selfDesign.GFShrink, 0) || 0);
  const selfAutoGreigeQty = sourceMode === 'self' && fabricType === 'Finish' && baseQty > 0 && selfGf >= 0 && selfGf < 100
    ? round3(baseQty / (1 - selfGf / 100)) : 0;
  const selfEnteredGreigeQty = Math.max(0, round3(Number(selfGreigeQtyInput || 0)));
  const selfArtifactGreigeQty = sourceMode === 'self'
    ? (fabricType === 'Greige' ? baseQty : (selfEnteredGreigeQty > 0 ? selfEnteredGreigeQty : selfAutoGreigeQty)) : 0;

  const recipeMeta = sourceMode === 'sales' ? (selectedGroup || selectedOrders[0] || {}) : {};
  const legacyMain = legacyCostingData && Array.isArray(legacyCostingData.main) ? (legacyCostingData.main[0] || {}) : {};
  const effectiveLegacyCostUid = Number(
    (legacyCostChoice && legacyCostChoice.costuid) || costMeta.legacy_costuid || costMeta.LegacyCostUId ||
    main.costuid || main.CostUId || 0
  );
  const newCostShrink = isNewDesignCosting && newCostChoice
    ? Number(firstValue(newCostChoice.gf_shrink, newCostChoice.ShrinkPer, newCostChoice.shkperc, 0)) : null;
  const currentRecipeAvailable = isNewDesignCosting && Number.isFinite(newCostShrink)
    ? true
    : (sourceMode === 'sales' && Boolean(recipeMeta.recipe_available) && String(recipeMeta.md_id || '').trim() !== '');
  const legacyShrinkRaw = firstValue(legacyMain.ShrinkPer, legacyMain.shrinkper);
  const legacyRecipeAvailable = !isNewDesignCosting && effectiveLegacyCostUid > 0 && legacyShrinkRaw !== '';
  const finishRequirement = fabricType === 'Finish';
  const designFinishShrinkRaw = recipeMeta.recipe_gf_shrink;
  const designFinishAvailable = sourceMode === 'sales' && recipeMeta.recipe_available &&
    designFinishShrinkRaw !== undefined && designFinishShrinkRaw !== null && designFinishShrinkRaw !== '';
  const recipeFinishShrink = designFinishAvailable ? Number(designFinishShrinkRaw)
    : (isNewDesignCosting && Number.isFinite(newCostShrink) ? Number(newCostShrink)
      : (currentRecipeAvailable ? Number(recipeMeta.recipe_gf_shrink || 0)
        : (legacyRecipeAvailable ? Number(legacyShrinkRaw) : null)));
  const warpRaw = recipeMeta.recipe_warp_shrink;
  const recipeWarpShrink = sourceMode === 'sales' && warpRaw !== null && warpRaw !== undefined && warpRaw !== '' ? Number(warpRaw) : null;
  const greigeSoRequirement = sourceMode === 'sales' && fabricType === 'Greige' && stockType === 'I';
  const recipeAvailable = greigeSoRequirement
    ? (Boolean(recipeMeta.recipe_available) && String(recipeMeta.md_id || '').trim() !== '' && recipeWarpShrink !== null)
    : (currentRecipeAvailable || legacyRecipeAvailable);
  const recipeSource = greigeSoRequirement ? 'CURRENT_DESIGN'
    : (isNewDesignCosting ? 'NEW_COSTING' : (currentRecipeAvailable ? 'CURRENT_DESIGN' : (legacyRecipeAvailable ? 'LEGACY_COSTING' : '')));
  const appliedRecipeShrink = greigeSoRequirement ? recipeWarpShrink : recipeFinishShrink;
  const recipeValid = recipeAvailable && appliedRecipeShrink !== null && Number.isFinite(appliedRecipeShrink) &&
    appliedRecipeShrink >= 0 && appliedRecipeShrink < 100;
  const recipeApplied = sourceMode === 'sales' ? recipeValid : (finishRequirement && recipeValid);
  const recipeGreigeQty = recipeApplied && baseQty > 0 ? round3(baseQty / (1 - Number(appliedRecipeShrink) / 100)) : null;
  const recipeAdditionQty = recipeGreigeQty !== null ? round3(recipeGreigeQty - baseQty) : null;
  const recipeEffectiveAdditionPct = recipeAdditionQty !== null && baseQty > 0 ? (recipeAdditionQty / baseQty) * 100 : null;
  const effectiveShrinkage = recipeApplied ? Number(recipeEffectiveAdditionPct || 0)
    : (finishRequirement ? Number(shrinkage || 0) : 0);
  const soGreigeQty = recipeGreigeQty !== null ? recipeGreigeQty
    : (finishRequirement ? round3(baseQty * (1 + effectiveShrinkage / 100)) : round3(baseQty));
  const stockMetersQty = stockMetersTouched ? Math.max(0, round3(Number(stockMeters || 0))) : 0;
  const totalQty = sourceMode === 'sales' ? round3(soGreigeQty + stockMetersQty) : round3(selfArtifactGreigeQty || soGreigeQty);

  // ---------- Sourcing: where the greige metres come from (artifact "Sourcing") ----------
  // All in GREIGE metres — the unit prodorderjob.Qty / jobqty / selfprodqty use.
  //   in-house (mill) + job work (any number of job workers) + greige purchase = total greige.
  const jobList: Row[] = (st.jobList || []).filter((r: Row) => r);
  const purchaseList: Row[] = (st.purchaseList || []).filter((r: Row) => r);
  const jobErrors: string[] = [];
  const seenJob: Record<string, boolean> = {};
  jobList.forEach((r: Row) => {
    if (round3(r.qty) <= 0) return;
    if (!r.parcode) jobErrors.push('Choose a job worker for every job-work line with metres.');
    else if (seenJob[r.parcode]) jobErrors.push(`${r.parname || r.parcode} is listed twice in job work — merge the lines.`);
    if (r.parcode) seenJob[r.parcode] = true;
  });
  purchaseList.forEach((r: Row) => {
    if (round3(r.qty) > 0 && !r.parcode) jobErrors.push('Choose a supplier for every greige-purchase line with metres.');
  });
  const jobQty = round3(jobList.reduce((s: number, r: Row) => s + Number(r.qty || 0), 0));
  const purchaseQty = round3(purchaseList.reduce((s: number, r: Row) => s + Number(r.qty || 0), 0));
  const millQty = round3(totalQty - jobQty - purchaseQty); // what the server stores as selfprodqty
  const inhouseQty = st.inhouseTouched ? Math.max(0, round3(Number(st.inhouseQtyInput || 0))) : Math.max(0, millQty);
  const allocatedQty = round3(inhouseQty + jobQty + purchaseQty);
  const allocationBalanced = Math.abs(allocatedQty - totalQty) < 0.0005;
  if (millQty < 0) jobErrors.push(`Job work + purchase (${round3(jobQty + purchaseQty)} m) exceed the ${totalQty} m greige required.`);
  else if (!allocationBalanced) jobErrors.push(`Sourcing allocates ${allocatedQty} of ${totalQty} m — use "Balance in-house".`);
  const jobCompanies = Object.keys(seenJob).length;

  const jobRows = jobList.filter((r: Row) => round3(r.qty) > 0).map((r: Row) => ({
    parcode: r.parcode, parname: r.parname, qty: round3(r.qty), line_type: 'ORDER',
    pick_rate: Number(r.pickRate || 0), yarn_from: r.yarnFrom === 'BOUGHT' ? 'BOUGHT' : 'OUR', yarn_tol_pct: Number(r.tolPct || 0)
  }));
  const purchaseRows = purchaseList.filter((r: Row) => round3(r.qty) > 0).map((r: Row) => ({
    parcode: r.parcode, parname: r.parname, qty: round3(r.qty), rate: Number(r.rate || 0), gst_pct: Number(r.gstPct || 0)
  }));

  // ---------- Commercial (unchanged from web) ----------
  const weightedRateQty = selectedOrders.reduce((s: number, r: Row) => s + Number(r.qty || 0), 0);
  const weightedRate = weightedRateQty > 0
    ? selectedOrders.reduce((s: number, r: Row) => s + Number(r.qty || 0) * Number(r.rate || 0), 0) / weightedRateQty : 0;
  const plannedGreigeCost = isNewDesignCosting
    ? (costingResult ? Number(costingResult.snap_greige_price || 0) : 0)
    : Number(legacyMain.Total || legacyMain.total || legacyMain.FabCost || legacyMain.fabcost || 0);
  const plannedFinishedCost = isNewDesignCosting
    ? (costingResult ? Number(costingResult.snap_final_cost || 0) : 0)
    : Number(legacyMain.FinTotAmt || legacyMain.fintotamt || legacyMain.Total || legacyMain.total || 0);
  const productionYield = sourceMode === 'sales' && recipeApplied ? Math.max(0.000001, 1 - Number(appliedRecipeShrink || 0) / 100) : 1;
  const plannedCost = fabricType === 'Finish' ? plannedFinishedCost
    : (sourceMode === 'sales' ? plannedGreigeCost / productionYield : plannedGreigeCost);
  const effectiveSellingRate = sourceMode === 'sales' ? weightedRate : 0;
  const plannedMargin = plannedCost > 0 && effectiveSellingRate > 0 ? effectiveSellingRate - plannedCost : null;
  const belowCost = plannedMargin !== null && plannedMargin < 0;

  const bookedSoQty = sourceMode === 'sales' && selectedGroup
    ? round3((selectedGroup.orders || []).reduce((s: number, r: Row) => s + Number(r.available_qty || r.qty || 0), 0)) : 0;
  const plannedSoQty = round3(baseQty);
  const coverageDiff = round3(plannedSoQty - bookedSoQty);

  const finishYield = recipeValid ? Math.max(0.000001, 1 - Number(recipeFinishShrink || 0) / 100) : 1;
  const greigeCostOnFinishedMetre = plannedGreigeCost > 0 ? plannedGreigeCost / finishYield : 0;
  const finishingAddon = finishRequirement && plannedFinishedCost > 0 && greigeCostOnFinishedMetre > 0
    ? Math.max(0, plannedFinishedCost - greigeCostOnFinishedMetre) : 0;
  const saleLines = selectedOrders.map((r: Row) => {
    const qty = Number(r.qty || 0); const rate = Number(r.rate || 0);
    const greigeEq = sourceMode === 'sales' ? qty / productionYield : qty;
    const netBack = finishRequirement ? (rate - finishingAddon) * finishYield : rate * productionYield;
    const ownCost = finishRequirement ? plannedFinishedCost : plannedCost;
    return { ...r, greigeEq, netBack, ownCost, ownMargin: rate - ownCost };
  });
  const saleGreigeEqQty = saleLines.reduce((s: number, r: Row) => s + r.greigeEq, 0);
  const weightedGreigeNetBack = saleGreigeEqQty > 0
    ? saleLines.reduce((s: number, r: Row) => s + r.greigeEq * r.netBack, 0) / saleGreigeEqQty : null;
  const greigeBasisMargin = weightedGreigeNetBack !== null && plannedGreigeCost > 0 ? weightedGreigeNetBack - plannedGreigeCost : null;
  const greigeBasisMarginPct = greigeBasisMargin !== null && plannedGreigeCost > 0 ? (greigeBasisMargin / plannedGreigeCost) * 100 : null;
  const greigeBelowCost = greigeBasisMargin !== null && greigeBasisMargin < 0;
  const belowCostLines = saleLines.filter((r: Row) => r.ownCost > 0 && Number(r.rate || 0) < r.ownCost);

  const costingReady = !costingLoading && !costingError &&
    (isNewDesignCosting ? Boolean(costingResult && newCostChoice) : (effectiveLegacyCostUid > 0 && Boolean(legacyCostingData))) &&
    plannedGreigeCost > 0 && (!finishRequirement || plannedFinishedCost > 0);

  return {
    fabricType, mixedSoFabric, selectedDesign, costMeta, metaBase, isNewDesignCosting, costingMdId,
    baseQty, selfGf, selfAutoGreigeQty, selfArtifactGreigeQty, recipeMeta, legacyMain, effectiveLegacyCostUid,
    currentRecipeAvailable, finishRequirement, recipeFinishShrink, recipeWarpShrink, greigeSoRequirement,
    recipeAvailable, recipeSource, appliedRecipeShrink, recipeValid, recipeApplied, effectiveShrinkage,
    soGreigeQty, stockMetersQty, totalQty,
    jobErrors, jobQty, jobCompanies, jobRows, purchaseRows, purchaseQty, millQty, inhouseQty, allocatedQty, allocationBalanced,
    weightedRate, plannedGreigeCost, plannedFinishedCost, plannedCost, plannedMargin, belowCost,
    bookedSoQty, plannedSoQty, coverageDiff, saleLines, weightedGreigeNetBack, greigeBasisMargin,
    greigeBasisMarginPct, greigeBelowCost, belowCostLines, costingReady
  };
}

export function validatePlan(st: Row, p: Row): string {
  const { readOnly, lock, sourceMode, selectedOrders, stockType, selfDesign, selfFinishedCost, selfGreigeCost,
    ownerLoading, poOwnerCode, costingLoading, shrinkage, isAdd, voucher } = st;
  if (readOnly) return (lock && lock.reason) || 'This record is view-only.';
  if (sourceMode === 'sales' && selectedOrders.length === 0) return stockType === 'P' ? 'Select a Design and at least one Job Order.' : 'Select a Design and at least one Sales Order.';
  if (sourceMode === 'self' && selfDesign.dsncode && !selfDesign.itmcode) return 'The selected design must provide an item code.';
  if (sourceMode === 'self' && p.baseQty <= 0) return p.fabricType === 'Finish' ? 'Enter Finished qty.' : 'Enter Greige qty.';
  if (sourceMode === 'self' && !selfDesign.dsncode && p.fabricType === 'Finish' && Number(selfFinishedCost || 0) <= 0) return 'Enter Finished costing.';
  if (sourceMode === 'self' && !selfDesign.dsncode && p.fabricType === 'Greige' && Number(selfGreigeCost || 0) <= 0) return 'Enter Greige costing.';
  if (sourceMode === 'sales' && !p.fabricType) return 'Sales Order fabric type is unavailable. Reload the Sales Orders.';
  if (sourceMode === 'sales' && p.mixedSoFabric) return 'Select Sales Orders with the same fabric type.';
  if (sourceMode === 'sales' && p.baseQty <= 0 && p.stockMetersQty <= 0) return 'Select Sales Order quantity or add stock metres.';
  if (p.greigeSoRequirement && !p.recipeAvailable) return 'Design Warp Shrink is not available. Complete the design recipe before proceeding.';
  if (p.greigeSoRequirement && !p.recipeValid) return 'Design Warp Shrink must be between 0 and less than 100 percent.';
  if (ownerLoading) return 'PO Owners are still loading.';
  if (!poOwnerCode) return 'Select PO Owner.';
  if (costingLoading) return 'Selected costing is still loading.';
  if (p.finishRequirement && !p.recipeValid && (Number(shrinkage) < 0 || Number(shrinkage) > 100)) return 'Shrinkage must be between 0 and 100 percent.';
  if (p.finishRequirement && p.recipeAvailable && !p.recipeValid) return 'Design Recipe Finish Shrink must be between 0 and less than 100 percent.';
  if (p.jobErrors.length) return p.jobErrors[0];
  if (p.millQty < 0) return 'Job Work + Purchase quantity cannot exceed Total Production quantity.';
  if (isAdd && !voucher.vouno) return 'Voucher number is still being prepared.';
  return '';
}

export function authorizationReason(st: Row, p: Row): string {
  if (st.sourceMode === 'self' && !st.selfDesign.dsncode) return '';
  if (p.costingReady) return '';
  if (st.costingLoading) return 'Costing is still loading.';
  if (st.costingError) return st.costingError;
  if (!p.effectiveLegacyCostUid && !p.isNewDesignCosting) return 'Select a costing sheet before owner authorization.';
  return 'Load a valid costing before owner authorization.';
}

// Map saved prodorderjob rows (d12 = job work, d13 = purchase) back into sourcing lines.
const lc = (row: Row): Row => { const r: Row = {}; Object.keys(row || {}).forEach((k) => { r[k.toLowerCase()] = row[k]; }); return r; };
export function sourcingFromRows(d12: Row[], d13: Row[]) {
  const jobList = (d12 || []).map((row: Row, i: number) => {
    const r = lc(row);
    return {
      id: `job-${i}-${r.srno || i}`, parcode: String(r.parcode || ''), parname: r.parname || r.parcode || '',
      qty: String(Number(r.qty || 0)), pickRate: r.pickrate != null ? String(Number(r.pickrate)) : '',
      yarnFrom: String(r.yarnfrom || '').toUpperCase() === 'BOUGHT' ? 'BOUGHT' : 'OUR',
      tolPct: r.yarntolpct != null ? String(Number(r.yarntolpct)) : '10'
    };
  });
  const purchaseList = (d13 || []).map((row: Row, i: number) => {
    const r = lc(row);
    return {
      id: `pur-${i}-${r.srno || i}`, parcode: String(r.parcode || ''), parname: r.parname || r.parcode || '',
      qty: String(Number(r.qty || 0)), rate: r.rate != null ? String(Number(r.rate)) : '',
      gstPct: r.gstpct != null ? String(Number(r.gstpct)) : '5'
    };
  });
  return { jobList, purchaseList };
}
