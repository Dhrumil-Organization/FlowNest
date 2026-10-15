/** Pure navigation transitions for the Daily Production hierarchy.
 * Keeps property-qualified Step keys untouched; only UI navigation state moves.
 */
import type { Mode, Step } from './ProductionDailyModel';

export type DrillNavigation = {
  mode: Mode;
  path: Step[];
  focusShed: Step | null;
  recordsOpen: boolean;
};
export type NavigationResult = {
  navigation: DrillNavigation;
  returnTo: DrillNavigation | null;
};
export type Breadcrumb = {
  key: string;
  label: string;
  target: 'root' | 'shedScope' | 'path' | 'terminal';
  pathIndex?: number;
  current: boolean;
};

export function breadcrumbsFor(nav: DrillNavigation): Breadcrumb[] {
  const out: Breadcrumb[] = [{key:'root',label:'Production',target:'root',current:false}];
  if (nav.focusShed) {
    out.push({key:'shedScope',label:nav.focusShed.label,target:'shedScope',current:false});
  }
  nav.path.forEach((p,i) => out.push({
    key:`step:${i}:${p.field}:${p.value}`,label:p.label,target:'path',pathIndex:i,current:false,
  }));
  if (nav.recordsOpen) {
    out.push({key:'records',label:'Checking records',target:'terminal',current:true});
  } else if (nav.path.length===0) {
    out.push({key:'view',label:nav.mode==='shed'?'Sheds':nav.mode==='category'?'Categories':'Designs',target:'terminal',current:true});
  } else {
    out[out.length-1].current=true;
  }
  return out;
}

export function parentLabelFor(nav: DrillNavigation, returnTo: DrillNavigation | null): string | null {
  if (nav.recordsOpen) return nav.path[nav.path.length-1]?.label || nav.focusShed?.label || 'Production';
  if (nav.path.length>1) return nav.path[nav.path.length-2].label;
  if (returnTo) return returnTo.path[returnTo.path.length-1]?.label || returnTo.focusShed?.label || 'Production';
  if (nav.focusShed) return nav.focusShed.label;
  if (nav.path.length) return 'Production';
  return null;
}

function toFocusedShed(shed: Step): DrillNavigation {
  return {mode:'shed',path:[shed],focusShed:null,recordsOpen:false};
}

/** Back never discards the date/filter context (stored outside navigation). */
export function backNavigation(nav: DrillNavigation, returnTo: DrillNavigation | null): NavigationResult | null {
  if (nav.recordsOpen) return {navigation:{...nav,recordsOpen:false},returnTo};
  if (nav.path.length>1) return {navigation:{...nav,path:nav.path.slice(0,-1)},returnTo};
  if (returnTo) return {navigation:{...returnTo,recordsOpen:false},returnTo:null};
  if (nav.focusShed) return {navigation:toFocusedShed(nav.focusShed),returnTo:null};
  if (nav.path.length>0) return {navigation:{...nav,path:[]},returnTo:null};
  return null;
}

/** Clicking an ancestor must directly restore its scope, not clear the full drilldown. */
export function navigateBreadcrumb(nav: DrillNavigation, crumb: Breadcrumb,
  returnTo: DrillNavigation | null): NavigationResult | null {
  if (crumb.current || crumb.target==='terminal') return null;
  if (crumb.target==='root') return {
    navigation:{mode:'shed',path:[],focusShed:null,recordsOpen:false},returnTo:null,
  };
  if (crumb.target==='shedScope' && nav.focusShed) {
    // Return to the real parent shed screen, not to a Design view filtered by shed.
    if (returnTo && returnTo.mode==='shed' && returnTo.path.some(s=>s.field==='shed' && s.value===nav.focusShed?.value)) {
      return {navigation:{...returnTo,recordsOpen:false},returnTo:null};
    }
    return {navigation:toFocusedShed(nav.focusShed),returnTo:null};
  }
  if (crumb.target==='path' && crumb.pathIndex!==undefined) {
    return {navigation:{...nav,path:nav.path.slice(0,crumb.pathIndex+1),recordsOpen:false},returnTo};
  }
  return null;
}
