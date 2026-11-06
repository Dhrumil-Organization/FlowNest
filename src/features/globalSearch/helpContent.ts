// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/helpContent.ts
//
// Plain-language help for the screens that exist today, shown by "/help".
// Keyed by the PERMISSION path of the screen (stable — routes and titles may
// change, rights keys do not).
//
// THIS FILE IS OPTIONAL FOR NEW SCREENS. A screen that is not listed here
// still gets full help, built from the registries (its menu place, its tabs /
// cards / reports, and the actions the user is allowed to do). To give a new
// screen better words WITHOUT touching search code, put them on its nav node:
//
//   { id: 'nav.my_screen', kind: 'navigation', …,
//     metadata: { help: 'One line about the screen', keywords: ['other', 'names'],
//                 steps: ['Pick a party', 'Tap Save'] } }
// ─────────────────────────────────────────────────────────────
import type { ScreenHelp } from './types';

export const SCREEN_HELP: Record<string, ScreenHelp> = {
  // ── Management ─────────────────────────────────────────────
  dashboard: {
    summary: 'Home dashboard of the business: monthly target, monthly report, production cost and the sales / production / collection / payment / outstanding detail cards — each card only when it is given to you.',
    steps: ['Open Home.', 'Tap a card (Sales, Production, Collection …) to drill down into the detail report.', 'Pull down to refresh the figures.'],
    keywords: ['home', 'business dashboard', 'kpi', 'overview', 'mis'],
    tips: ['Cards you do not see are not assigned to your user or role.'],
  },
  'production.owner_dashboard': {
    summary: 'One-page owner summary: sales, collection, outstanding, sales orders, profit, alerts, production, deployment and the executive table.',
    steps: ['Choose Date, Month or Executive filter.', 'Read the KPI cards; tap a section to see its detail.'],
    keywords: ['owner', 'profit', 'kpi', 'alerts', 'executive'],
  },
  reports: {
    summary: 'Reports hub: Real Costing Chain, Expense & Production, Beam Shortage and Assign Report — only the reports given to you are listed.',
    steps: ['Open Reports.', 'Tap a report card.', 'Set the dates / filters and load.'],
    keywords: ['mis', 'analysis'],
  },
  'production.salary': {
    summary: 'Salary — daily entry calendar, one month at a time (port of the Web ERP salary calendar).',
    steps: ['Pick year and month — the month loads by itself.', 'Enter / modify the daily values.', 'Tap Save.'],
    keywords: ['wages', 'payroll', 'labour cost', 'monthly salary'],
  },
  'production.unit_consumption': {
    summary: 'Unit Consumption — daily electricity unit entry calendar, one month at a time.',
    steps: ['Pick year and month.', 'Enter / modify the daily units.', 'Tap Save.'],
    keywords: ['electricity', 'units', 'power', 'bijli'],
  },
  monthlysalestarget: {
    summary: 'Monthly sales target per executive: set and review the target for each month.',
    keywords: ['target', 'sales target', 'executive target'],
  },
  datalog: {
    summary: 'Opens the external Datalog (machine data) dashboard. On web it opens in a new browser tab.',
    keywords: ['machine data', 'loom data', 'iot'],
  },
  access_control: {
    summary: 'Permission Manager: give or remove rights (screens, tabs, actions) for roles and users.',
    steps: ['Pick a role or a user.', 'Switch each screen / tab / action to Allow, Deny or Inherit.', 'Save.'],
    keywords: ['rights', 'roles', 'users', 'access', 'permission manager', 'admin'],
  },

  // ── Design / commercial ───────────────────────────────────
  designs: {
    summary: 'Design library: catalog, design, colourway, yarns and dyeing tabs, plus creating a new design.',
    steps: ['Open Designs.', 'Search the catalog or pick a tab.', 'Tap a design to see its detail; use New to add one.'],
    keywords: ['catalog', 'catalogue', 'colourway', 'quality'],
  },
  costing: {
    summary: 'Costing calculator for a design, yarn prices, colourway tiers, cost history and variance.',
    steps: ['Pick the design.', 'Check / change yarn prices.', 'See the cost per metre; open History for earlier costs.'],
    keywords: ['cost sheet', 'calculator', 'cost per metre'],
  },
  orders: {
    summary: 'Orders: new order entry, order authorization and order tracking.',
    keywords: ['new order', 'order auth', 'order tracking'],
  },
  priority: {
    summary: 'Dyeing: chart priority (reorder the sales-order allocation charts and save the order), daily update and Mill Hub tabs — each tab by its own right.',
    steps: ['Open Dyeing.', 'Pick the tab you need.', 'Reorder / update the status lot-wise and save.'],
    keywords: ['priority', 'dyeing priority', 'chart priority', 'lot status'],
  },

  // ── Production ────────────────────────────────────────────
  'production.production_order_tracking': {
    summary: 'Track production orders: status of each order from order to production and packing.',
    keywords: ['po tracking', 'production status'],
  },
  'production.production_order_entry': {
    summary: 'Production Orders: create and modify production orders (SO based / stock & sell), pools of your orders and job work — Orders, Pools and Job work tabs, each by its own right.',
    steps: ['Open Production Orders.', 'Orders tab → New to create, or pick an order to modify.', 'Pools tab shows your pooled orders; Job work tab the job-work orders.'],
    keywords: ['production order', 'new production order', 'pool', 'job work', 'jobwork'],
  },
  'production.sudamo_production_order': {
    summary: 'Authorize (approve / reject) Sudamo production orders.',
    keywords: ['production order auth', 'approve production order'],
  },
  'production.credit_limit_request': {
    summary: 'Credit limit requests of parties: review and approve or reject a request for a higher credit limit.',
    keywords: ['credit limit', 'limit request', 'party limit'],
  },
  'production.purchase_order': {
    summary: 'Purchase orders: view and authorize purchase orders.',
    keywords: ['po', 'purchase', 'buy'],
  },
  'production.daily_collection_report_new': {
    summary: 'Daily Collection Report: money collected from parties, day-wise.',
    keywords: ['collection report', 'receipt report', 'daily collection'],
  },
  'production.daily_payment_report': {
    summary: 'Daily Payment Report: payments made, day-wise.',
    keywords: ['payment report', 'daily payment'],
  },
  'production.snapview': {
    summary: 'Snap View: a quick one-screen snapshot of the key business figures.',
    keywords: ['snapshot', 'quick view'],
  },
  'production.sales_order': {
    summary: 'Sales Order: browse and manage sales orders.',
    keywords: ['so', 'sales order list'],
  },
  'production.sales_order_entry': {
    summary: 'Sales Order Entry: new sales order, order authorization, order tracking and order summary.',
    steps: ['Tap New order.', 'Pick the party, then item → design → shade and quantity / rate.', 'Save; track it later from Tracking.'],
    keywords: ['new sales order', 'so entry', 'book order', 'order booking'],
  },
  'production.sales_order_inactive': {
    summary: 'Sales orders that are inactive (closed / stopped) — view them.',
    keywords: ['inactive order', 'closed order'],
  },
  'production.sales_order_tracking': {
    summary: 'Sales Order Tracking: status of every sales order — ordered, produced, dispatched, pending.',
    keywords: ['so tracking', 'order status', 'pending order', 'dispatch status'],
  },
  'production.purchase_tracking': {
    summary: 'Purchase Order Tracking: status of every purchase order — ordered, received, pending.',
    keywords: ['po tracking', 'purchase status'],
  },
  'production.grey_purchase_order': {
    summary: 'Grey Purchase Order: purchase orders for grey (greige) fabric.',
    keywords: ['greige', 'grey po', 'grey fabric purchase'],
  },
  'production.collection': {
    summary: 'Collection: enter and edit payments received from parties.',
    steps: ['Tap Add.', 'Pick the party and enter amount / mode / reference.', 'Save.'],
    keywords: ['receipt', 'payment received', 'collection entry'],
  },
  'production.event': {
    summary: 'Event: company events and announcements.',
    keywords: ['events', 'calendar', 'announcement'],
  },
  'production.payable': {
    summary: 'Payable: what the company has to pay to suppliers — summary and bill-wise detail with totals.',
    steps: ['Set the filters (date, party …).', 'Read the summary; open a party for the bill-wise detail.'],
    keywords: ['creditor', 'to pay', 'supplier outstanding'],
  },
  'production.receivables': {
    summary: 'Receivables: what parties have to pay — summary, bill-wise detail and cumulative balance. Sudamo / Knits and Rayons each show their own receivables.',
    steps: ['Set the filters.', 'Read the summary; tap a party for bill-wise detail.'],
    keywords: ['outstanding', 'debtor', 'dues', 'party outstanding'],
  },
  'production.fabric_stock': {
    summary: 'Fabric Stock: grey / finish stock, item → design → sub design → shade.',
    keywords: ['finish stock', 'grey stock', 'febric stock', 'cloth stock'],
  },
  'production.yarn_stock': {
    summary: 'Yarn Stock: main item → item → merge → shade.',
    keywords: ['yarn balance', 'yarn inventory'],
  },
  'production.yarnstockverification': {
    summary: 'Yarn Stock Verification: load cartons, verify them, print and add a carton.',
    keywords: ['yarn verify', 'carton verification', 'physical stock'],
  },
  'production.fabricstockverification': {
    summary: 'Fabric Stock Verification: scan a taka, verify, print or enter it manually.',
    keywords: ['taka verify', 'fabric verify', 'physical stock'],
  },
  'production.inquiry': {
    summary: 'Inquiry: dashboard, inquiry form, detail, costing, quotation, notes and authorization — all on one screen.',
    steps: ['Tap New inquiry and fill the form.', 'Open an inquiry for costing, quotation and notes.', 'Send it for authorization.'],
    keywords: ['enquiry', 'lead', 'quotation', 'quote'],
  },
  'production.inquiry_report': {
    summary: 'Inquiry Report: inquiries by status, executive and party, with drill-down.',
    keywords: ['enquiry report', 'lead report'],
  },
  'production.weft_issue': {
    summary: 'Weft Issue: list, header, design items and carton scan to issue weft yarn.',
    keywords: ['weft', 'bana issue', 'yarn issue'],
  },
  'production.weft_issue_return': {
    summary: 'Weft Issue Return: list, new entry, modify and sticker print for weft returned.',
    keywords: ['weft return', 'bana return'],
  },
  'production.weft_carton_issue_new': {
    summary: 'Weft Carton Issue: issue weft cartons to machines.',
    keywords: ['carton issue', 'weft carton'],
  },
  'production.creel_issue_return_new': {
    summary: 'Creel Issue Return: list, new entry, modify and sticker print.',
    keywords: ['creel return'],
  },
  'production.creel_management_new': {
    summary: 'Creel Management System: browse, creel setup, carton scan and finalize.',
    keywords: ['creel', 'creel setup'],
  },
  'production.checking_scanner_new': {
    summary: 'Checking Scanner: QR scan or manual entry, scanner list, faults and print.',
    keywords: ['checking', 'fault', 'inspection', 'qc'],
  },
  'production.beam_gaiting_new': {
    summary: 'Beam Gaiting: machine beam list and new beam gaiting entry.',
    keywords: ['gaiting', 'beam load'],
  },
  'production.beam_close_new': {
    summary: 'Beam Open / Close: close a beam, load a closed beam, open a beam.',
    keywords: ['beam close', 'beam open'],
  },
  'production.doff_entry': {
    summary: 'Doff Entry: enter the doffed (taken off) fabric of a machine.',
    keywords: ['doffing', 'doff'],
  },
  'production.item_authorization': {
    summary: 'Item Authorization: approve or reject new items.',
    keywords: ['item auth', 'approve item'],
  },
  'production.packing_grade_auth': {
    summary: 'Packing Grade Auth: approve or reject packing grade changes.',
    keywords: ['grade auth', 'packing grade'],
  },
  'production.packing_automation': {
    summary: 'Packing Automation: packing and label printing.',
    keywords: ['packing label', 'label print'],
  },
  'production.poy_rate_entry': {
    summary: 'POY Rate Entry: enter POY yarn rates.',
    keywords: ['poy', 'yarn rate'],
  },
  'production.price_list': {
    summary: 'Price List: selling price list of items / designs.',
    keywords: ['rate list', 'selling price'],
  },
  'production.process_complete_auth': {
    summary: 'Process Complete Auth: approve process-complete requests.',
    keywords: ['process complete', 'process auth'],
  },
  'production.processcompleterequest': {
    summary: 'Process Complete Request: raise a process-complete request.',
    keywords: ['process complete'],
  },
  'production.production_merge_auth': {
    summary: 'Production Merge Auth: approve production merge requests.',
    keywords: ['merge auth'],
  },
  'production.sales_order_price_list_auth': {
    summary: 'Sales Order Price List Auth: approve sales-order prices that differ from the price list.',
    keywords: ['price auth', 'rate auth'],
  },
  'production.purchase_rate_auth': {
    summary: 'Purchase Rate Auth: approve purchase rates.',
    keywords: ['rate auth'],
  },
  'production.purchase_import_auth': {
    summary: 'Purchase Import Auth: approve import purchases.',
    keywords: ['import auth'],
  },
  'production.purchase_grade_auth': {
    summary: 'Purchase Grade Auth: approve purchase grade changes.',
    keywords: ['grade auth'],
  },
  'production.monthly_expense_report': {
    summary: 'Monthly Expense Report: expenses of the month, head-wise.',
    keywords: ['expense', 'kharcha', 'monthly expense'],
  },
  'production.visits': {
    summary: 'Visits: gate register for the watchman — new visitor entry with photos, mark OUT, English / Hindi.',
    steps: ['Tap New entry and fill visitor details / photo.', 'When the visitor leaves, tap Mark OUT.'],
    keywords: ['gate', 'visitor entry', 'watchman', 'security'],
  },
  'production.visitors_report': {
    summary: 'Visitors Report: summary, register and photos; edit / delete; Excel / PDF / print.',
    keywords: ['visitor report', 'gate register'],
  },
  'production.new_account_request': {
    summary: 'New Account Request: list of new party requests; edit credit days / limit; accept or reject; PDF.',
    keywords: ['new party', 'account opening', 'party request'],
  },
  'production.outstanding_days_request': {
    summary: 'Outstanding Days Request: requests and history, bills, party history; approve or reject.',
    keywords: ['outstanding days', 'credit days'],
  },
  'production.party_dashboard': {
    summary: 'Party Dashboard: party list with outstanding, ledger, rates and billings. Use Filters → OK to load the list.',
    keywords: ['customer', 'ledger', 'party ledger', 'party history'],
  },
  'production.design_authorization': {
    summary: 'Design Authorization: request / history / verify — accept, reject or keep pending.',
    keywords: ['design auth', 'approve design'],
  },
  'production.production_report': {
    summary: 'Production Report: order vs doff vs packing, with grade-wise packing information.',
    keywords: ['production mis', 'doff report', 'packing report'],
  },
  'production.warehouse': {
    summary: 'Warehouse: locations — assign, transfer and view cartons, with QR scan.',
    keywords: ['godown', 'location', 'transfer', 'carton location'],
  },
  'production.quarter_summary': {
    summary: 'Quarter Summary: quarter-wise order, dispatch and pending.',
    keywords: ['quarter', 'quarterly', 'dispatch summary'],
  },
  'production.feedback': {
    summary: 'Feedback: send feedback and see your history.',
    keywords: ['complaint', 'suggestion'],
  },
  'production.yarn_manufacturing': {
    summary: 'Yarn Manufacturing: company and product information.',
    keywords: ['yarn company', 'manufacturer'],
  },
  'production.yarn_vendors': {
    summary: 'Yarn Vendors: type a yarn item (and city) — AI web search gives a party list, with Excel preview / download.',
    keywords: ['supplier search', 'vendor search', 'find supplier'],
  },
  'production.yarn_sales_order': {
    summary: 'Yarn Sales Order: list, select party, order summary, item → grade → shade → qty / rate, save and print.',
    keywords: ['yarn order', 'yarn so'],
  },
  'production.yarn_hub': {
    summary: 'Yarn Hub: categories → yarns → yarn detail with stock, consumption, designs and price trend.',
    keywords: ['yarn detail', 'yarn consumption', 'yarn price trend'],
  },
  'production.yarn_rates': {
    summary: 'Yarn Rates: rate book per yarn — add / edit / delete rates, price trend with purchases.',
    keywords: ['yarn price', 'rate book'],
  },
  'production.outward_scan_sticker': {
    summary: 'Outward Scan Sticker: scan the fusion sticker → grey job inward; browse / modify / delete.',
    keywords: ['fusion sticker', 'grey inward', 'job inward'],
  },
  'production.taka_history': {
    summary: 'Taka History: full history of a taka (roll).',
    keywords: ['roll history', 'taka'],
  },
  'production.storeitemmaster': {
    summary: 'Store Item Master: store items — add, modify, delete.',
    keywords: ['store item', 'item master', 'stores'],
  },
  'production.Multiprint': {
    summary: 'Multiprint: print several documents in one go.',
    keywords: ['bulk print', 'print'],
  },
  'production.multiprint': {
    summary: 'Multiprint: print several documents in one go.',
    keywords: ['bulk print', 'print'],
  },
  'production.sales_challan_packing_slip': {
    summary: 'Sales Challan Packing Slip: packing slip list — new, view, modify, scan cartons, delete (by your rights).',
    keywords: ['packing slip', 'challan', 'dispatch slip'],
  },
  'production.roll_cut_scanner': {
    summary: 'Roll Cut Scanner: scan rolls at roll cut.',
    keywords: ['roll cut', 'cut scan'],
  },
  'production.roll_cut_analysis': {
    summary: 'Roll Cut Analysis: sticker → roll cut → checking for every taka, and the time from roll cut to checking.',
    keywords: ['roll cut report', 'tat'],
  },
  'production.sampling_hub': {
    summary: 'Sampling Hub: dashboard of samples created / dispatched / in inventory, new sample or split, record movement (scan & move), print QR sticker.',
    keywords: ['samples', 'swatch', 'hanger', 'booklet'],
  },
  'production.merge_master_data': {
    summary: 'Merge Master Data: merge duplicate master records.',
    keywords: ['duplicate', 'merge'],
  },
  'production.taka_order_link': {
    summary: 'Taka ↔ Production Order Link: takas in stock for a design / as-on date — link or unlink their production order.',
    keywords: ['link taka', 'unlink'],
  },
  'production.process_chemicals': {
    summary: 'Yarn Dyeing › Process Chemicals: define the chemical recipe of a process.',
    keywords: ['recipe', 'chemicals'],
  },
  'production.shade_recipe': {
    summary: 'Yarn Dyeing › Shade Recipe: define a recipe for a shade / colour / shade range.',
    keywords: ['colour recipe', 'shade'],
  },
  'production.planning': {
    summary: 'Yarn Dyeing › Planning: production planning entry for dyeing, coning and checking.',
    keywords: ['dyeing plan', 'coning'],
  },
  'production.processing': {
    summary: 'Yarn Dyeing › Processing: processing entries.',
    keywords: ['process entry'],
  },
  'production.material_requisition': {
    summary: 'Yarn Dyeing › Material Requisition: request material from stores.',
    keywords: ['requisition', 'indent', 'store request'],
  },
  grey_packing: {
    summary: 'Grey Packing live scanner: enter the header once, then scan continuously — every green scan is saved — then finish.',
    keywords: ['grey packing', 'packing scan'],
  },
  creel: { summary: 'Creel: browser, entry and scanner.', keywords: ['creel'] },
};

/** Help for Mill Hub pages, keyed by the Mill page key. */
export const MILL_HELP: Record<string, ScreenHelp> = {
  dash: { summary: 'Plant dashboard of the process house: lots, first-pass %, re-dye, dispatch and TAT.', keywords: ['plant', 'home', 'kpi'] },
  inward: { summary: 'Greige Inward: party challan entry, greige weight and metre capture, lot number, process route and TAT commitment.', keywords: ['grey inward', 'challan', 'lot entry'] },
  movement: { summary: 'Outward / Inward Movement Register: lots sent out and received back, date-wise.', keywords: ['register', 'outward', 'inward'] },
  lots: { summary: 'Lot Board: every lot as a card — stage, machine, shade, TAT clock, hold / release and stage advance.', keywords: ['lot', 'stage', 'tat'] },
  machines: { summary: 'Machine Planner: vessel-wise queue, kg-capacity planning, next lot per jet / jigger, stenter schedule, maintenance windows.', keywords: ['jet', 'jigger', 'stenter', 'vessel'] },
  lab: { summary: 'Shade Lab: lab dip register, party approvals with ageing, recipe versions per shade and quality.', keywords: ['lab dip', 'shade approval'] },
  recipe: { summary: 'Recipes & Chemicals: recipe cards (% owf), chemical issue against lot, dye / chemical stock with reorder alerts.', keywords: ['recipe', 'chemical', 'dyes'] },
  dispatch: { summary: 'Dispatch & Billing: finished folding entry, greige vs finished shrinkage, challan and job-work billing per metre.', keywords: ['challan', 'billing', 'folding'] },
  expense: { summary: 'Monthly Expense: coal (boiler + thermopack), electricity, chemicals & dyes, labour and maintenance — open a head for its detail.', keywords: ['cost', 'kharcha'] },
  coal_offers: { summary: 'Coal Supplier Offers: add / edit / delete coal offers and compare them.', keywords: ['coal rate', 'supplier offer'] },
  steam_entry: { summary: 'Daily Steam Entry: enter the daily steam figures.', keywords: ['steam', 'boiler'] },
  elec_entry: { summary: 'Electricity Daily Entry: enter / edit daily meter readings.', keywords: ['meter reading', 'units'] },
  elec_meters: { summary: 'Electricity Meter Setup: configure meters and the unit rate.', keywords: ['meter', 'unit rate'] },
  reports: { summary: 'Reports & KPIs: RFT trend, re-dye pareto, vessel utilisation, colour cost.', keywords: ['kpi', 'colour cost'] },
};
