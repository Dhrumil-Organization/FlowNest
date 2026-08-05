export const ROLE_TABS: Record<string, string[]> = {
  owner:      ['home','orders','designs','costing','stock','expense','po','aliases', 'monthlysalestarget', 'loom','ledger'],
  planthead:  ['home','designs','costing','stock','po','loom','ledger'],
  prodhead:   ['home','designs','costing','po','loom','ledger'],
  designer:   ['designs','costing'],
  sales:      ['home','orders','aliases', 'monthlysalestarget'],
  erpop:      ['designs','costing'],
  deo_elec:   ['expense'],
  deo_sal:    ['expense'],
  store:      ['stock'],
  checker:    ['stock'],
  warehouse:  ['stock'],
  supervisor: ['home','stock'],
}

export const ROLE_LABEL: Record<string, string> = {
  owner:      'Owner',
  planthead:  'Plant Head',
  prodhead:   'Production Head',
  designer:   'Designer',
  sales:      'Sales Executive',
  erpop:      'ERP Operator',
  deo_elec:   'DEO — Electricity',
  deo_sal:    'DEO — Salary',
  store:      'Store Assistant',
  checker:    'Checker / QC',
  warehouse:  'Warehouse Incharge',
  supervisor: 'Shift Supervisor',
}

export const ACCOUNTS = [
  { role:'owner',     name:'Owner',            glyph:'♚', sub:'Full access — all modules' },
  { role:'planthead', name:'Plant Head',        glyph:'★', sub:'Production + designs + costing' },
  { role:'prodhead',  name:'Production Head',   glyph:'⚙', sub:'PO + looms + designs' },
  { role:'designer',  name:'Designer',          glyph:'◳', sub:'Designs & costing only' },
  { role:'sales',     name:'Sales Executive',   glyph:'▤', sub:'Home, orders & aliases' },
  { role:'erpop',     name:'ERP Operator',      glyph:'⌗', sub:'Designs, costing & shades' },
  { role:'deo_elec',  name:'DEO — Electricity', glyph:'⚡', sub:'Daily electricity entry' },
  { role:'deo_sal',   name:'DEO — Salary',      glyph:'₹', sub:'Daily salary entry' },
  { role:'store',     name:'Store Assistant',   glyph:'▦', sub:'Yarn inward & creel' },
  { role:'checker',   name:'Checker / QC',      glyph:'☑', sub:'Checking & mending' },
  { role:'warehouse', name:'Warehouse Incharge', glyph:'▥', sub:'Dispatch & stock-take' },
  { role:'supervisor',name:'Shift Supervisor',  glyph:'◈', sub:'Downtime & exceptions' },
]