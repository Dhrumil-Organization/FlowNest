In `app/new/(tabs)/_layout.tsx`, inside the active (non-commented) HEADER_CONTENT map,
add one entry so the global AppHeader shows the right title for this route:

const HEADER_CONTENT: Record<string, { eyebrow?: string; title: string }> = {
  index: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Business Dashboard' },
  designs: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Designs' },
  costing: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Costing' },
  monthlysalestarget: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Monthly Sales Target' },
  orders: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Orders' },
  priority: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Chart Priority' },   // <-- ADD THIS LINE
  reports: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Reports' },
  'permissions/index': { eyebrow: 'ADMINISTRATION', title: 'Permission Manager' },
  'checking-scanner': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Checking Scanner' },
  'beam-close': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Open/Close' },
  'beam-gaiting/index': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Gaiting' },
};

That's the only change needed in this file. No changes to the
Tabs.Screen mapping, GlassTabBar, or MAX_PRIMARY_TABS — the "priority"
route already flows through automatically via APP_NAVIGATION once the
ui-registry module (step 6 above) is wired in, exactly like Grey Packing
does today.
