#!/usr/bin/env python3
"""
Builds src/mill/millHubHtml.ts from the Process House ERP artifact page
(process-house-erp-reference.html) — the SAME page, untouched in look, with a
small bridge so Flownest can:
  • give it the logged-in user (no second login – login is common)
  • give it the user's mill.* rights (sidebar / bottom bar / sub-pages filtered)
  • give it LIVE datasets from apig → Sudamo → Mills (LOTS, MACHINES …);
    anything not given keeps the artifact's sample data
  • receive "logout", "mill_off" (Mills switch) and "refresh" from the page

usage:  python3 build_mill_html.py <reference.html> <out millHubHtml.ts>
Every patch must match exactly once, otherwise the build stops (so a changed
artifact never silently produces a broken clone).
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding="utf-8").read()


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        sys.exit(f"patch '{label}': expected 1 match, found {n}")
    return text.replace(old, new)


# 1. React from CDN → the page already carries a bundled React fallback;
#    dropping the CDN tags makes Mill mode start instantly and work offline.
for lib in ("react", "react-dom"):
    html = once(
        html,
        f'<script src="https://cdnjs.cloudflare.com/ajax/libs/{lib}/18.3.1/umd/{lib}.production.min.js"></script>',
        "",
        f"cdn {lib}",
    )

# 2. bridge config slot (filled at runtime by MillHubFrame) – before every script
html = once(html, "<title>Process House ERP</title>", "<title>Mill Hub</title>\n<!--MILL_BOOT-->", "boot slot")

P = '/* @__PURE__ */ '

# 3. bridge helpers inside the app scope
html = once(
    html,
    "var React = window.React, ReactDOM = window.ReactDOM;",
    """var React = window.React, ReactDOM = window.ReactDOM;
  var __M = window.MILL || {};
  var __D = __M.data || {};
  // strict (Flownest): a dataset Mills did not give is EMPTY, never the sample numbers
  var __EMPTY_MONTH = { dyedLots: 0, firstPass: null, redye: null, dispatchMtr: 0, avgTatDays: null, tatTarget: 7 };
  function __live(k, v) {
    if (Object.prototype.hasOwnProperty.call(__D, k) && __D[k] != null) return __D[k];
    if (!__M.strict) return v;
    return Array.isArray(v) ? [] : (k === "MONTH" ? __EMPTY_MONTH : {});
  }
  function __can(k) { return typeof __M.can === "function" ? !!__M.can(k) : true; }
  function __post(m) { try { if (typeof __M.post === "function") __M.post(m); } catch (e) {} }
  function __millSwitch(compact) {
    return React.createElement("button", { onClick: function () { __post({ type: "mill_off" }); }, title: "Mills mode ON \\u2014 tap to go back to the ERP",
      style: { display: "flex", alignItems: "center", gap: 7, width: compact ? "auto" : "100%", justifyContent: compact ? "center" : "space-between", marginTop: compact ? 0 : 10, padding: compact ? "6px 9px" : "7px 10px", borderRadius: 9, border: "1px solid rgba(94,234,212,.45)", background: "rgba(45,212,191,.12)", color: "#ccfbf1", fontSize: compact ? 10.5 : 11.5, fontWeight: 800, letterSpacing: .6, cursor: "pointer" } },
      React.createElement("span", null, "MILLS"),
      React.createElement("span", { style: { width: 30, height: 16, borderRadius: 99, background: "#2dd4bf", position: "relative", display: "inline-block", flexShrink: 0 } },
        React.createElement("span", { style: { position: "absolute", right: 2, top: 2, width: 12, height: 12, borderRadius: 99, background: "#fff" } })));
  }
  function __dataChip(mobile) {
    var live = !!__M.live;
    var txt = live ? ("LIVE \\u00B7 " + (__M.liveCount || 0) + " of " + (__M.totalCount || 0) + " datasets") : (__M.offline ? "SAMPLE DATA \\u00B7 Mills offline" : "SAMPLE DATA");
    return React.createElement("button", { onClick: function () { __post({ type: "refresh" }); }, title: (__M.note || "") + " \\u2014 tap to refresh",
      style: { position: "fixed", right: 10, bottom: mobile ? 66 : 12, zIndex: 60, border: "none", borderRadius: 99, padding: "5px 10px", fontSize: 9.5, fontWeight: 800, letterSpacing: .8, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
        background: live ? "#ccfbf1" : "#fef3c7", color: live ? "#0f766e" : "#92400e", boxShadow: "0 2px 8px rgba(30,27,75,.15)" } }, (live ? "\\u25CF " : "\\u25CB ") + txt + "  \\u21BB");
  }""",
    "bridge helpers",
)

# 4. live datasets (same shapes as the artifact constants)
for name in ("LOTS", "MACHINES", "LABDIPS", "CHEMS"):
    start = html.find(f"  const {name} = [\n")
    if start < 0 or html.count(f"  const {name} = [\n") != 1:
        sys.exit(f"dataset {name} not found once")
    end = html.find("\n  ];", start)
    html = html[:start] + f'  const {name} = __live("{name}", [\n' + html[start + len(f"  const {name} = [\n"):end] + "\n  ]);" + html[end + len("\n  ];"):]

m = re.search(r"  const MONTH = (\{[^\n]*\});", html)
if not m:
    sys.exit("MONTH not found")
html = html.replace(m.group(0), f'  const MONTH = __live("MONTH", {m.group(1)});', 1)

html = once(html, 'const TODAY = "2026-09-01";', 'const TODAY = ((__M.strict || __D.LOTS) && __M.today) || "2026-09-01";', "TODAY")

html = once(
    html,
    '"Tue \\xB7 01 Sep 2026 \\xB7 live floor position"',
    '((__M.strict || __D.LOTS) ? new Date(TODAY + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(",", "").replace(/ /, " \\xB7 ") : "Tue \\xB7 01 Sep 2026") + " \\xB7 live floor position"',
    "dash date",
)

# 5. rights → sidebar / bottom bar
start = html.find("  const NAV = [\n")
end = html.find("\n  ];", start)
html = html[:start] + "  const NAV = [\n" + html[start + len("  const NAV = [\n"):end] + "\n  ].filter((n) => __can(n.k));" + html[end + len("\n  ];"):]
html = once(
    html,
    '{ k: "expense", label: "Monthly Expense", sl: "Exp", g: "\\u20B9" },',
    '{ k: "expense", label: "Monthly Expense", sl: "Exp", g: "\u20B9" },\n    { k: "coal_offers", label: "Coal Supplier Offers", sl: "Offers", g: "\u25A4" },',
    "coal offers navigation",
)
html = once(
    html,
    'const MOBILE_NAV = ["dash", "lots", "machines", "lab", "expense", "dispatch"];',
    'const MOBILE_NAV = ["dash", "lots", "machines", "lab", "expense", "coal_offers", "dispatch", "inward", "recipe", "reports"].filter((k) => NAV.some((n) => n.k === k)).slice(0, 7);',
    "MOBILE_NAV",
)
html = once(html, 'const initState = { user: null, screen: "dash",', 'const __HOME = (NAV[0] || { k: "dash" }).k;\n  const initState = { user: __M.user || null, screen: __HOME,', "initState")
html = once(html, 'return { ...state, user: a.user, screen: "dash" };', 'return { ...state, user: a.user, screen: __HOME };', "LOGIN")
html = once(html, 'return { ...state, user: null, screen: "dash" };', 'return { ...state, user: null, screen: __HOME };', "LOGOUT")

# 6. logout + Mills switch (sidebar footer and mobile top bar)
html = once(
    html,
    'const nav = (k) => dispatch({ type: "NAV", k });',
    'const nav = (k) => dispatch({ type: "NAV", k });\n    const __logout = () => { if (typeof __M.post === "function") __post({ type: "logout" }); else dispatch({ type: "LOGOUT" }); };',
    "logout fn",
)
n = html.count('onLogout: () => dispatch({ type: "LOGOUT" })')
if n != 2:
    sys.exit(f"onLogout x{n}")
html = html.replace('onLogout: () => dispatch({ type: "LOGOUT" })', "onLogout: __logout")

html = once(
    html,
    P + 'React.createElement("button", { onClick: onLogout, style: { marginTop: 10, width: "100%"',
    "__millSwitch(false), " + P + 'React.createElement("button", { onClick: onLogout, style: { marginTop: 10, width: "100%"',
    "sidebar switch",
)
html = once(
    html,
    P + 'React.createElement("button", { onClick: onLogout, style: { background: "rgba(255,255,255,.12)"',
    'React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, __millSwitch(true), ' + P + 'React.createElement("button", { onClick: onLogout, style: { background: "rgba(255,255,255,.12)"',
    "topbar switch",
)
html = once(html, 'user.name, " \\xB7 Out"));', 'user.name, " \\xB7 Out")));', "topbar close")

# 7. data chip on every screen
html = once(
    html,
    P + "React.createElement(GlobalStyle, null), " + P + 'React.createElement("div", { style: { minHeight: "100vh", background: C.bg',
    P + "React.createElement(GlobalStyle, null), __dataChip(mobile), " + P + 'React.createElement("div", { style: { minHeight: "100vh", background: C.bg',
    "chip",
)

# 8. sub-page rights
html = once(
    html,
    "const cats = EXP_CATS.slice().sort((a, b) => b.cost - a.cost);",
    'const cats = EXP_CATS.filter((x) => __can("expense." + ({ coal: "coal", chem: "chemicals", elec: "electricity", labour: "labour", maint: "maintenance" })[x.k])).sort((a, b) => b.cost - a.cost);',
    "exp cats",
)
html = once(html, "const maxPct = pctBill(cats[0].cost);", "const maxPct = cats.length ? pctBill(cats[0].cost) : 1;", "exp max")
html = once(
    html,
    'onOpt: () => setPage("coal-opt")',
    'onOpt: () => { if (__can("expense.coal_optimiser")) setPage("coal-opt"); else __post({ type: "toast", text: "No rights for Coal Mix Optimiser" }); }',
    "optimiser",
)
html = once(
    html,
    'onClick: () => setRep("cc")',
    'onClick: () => { if (__can("reports.colour_cost")) setRep("cc"); else __post({ type: "toast", text: "No rights for Colour Cost" }); }',
    "colour cost",
)

# 9. KPIs Mills cannot give yet → "—" instead of a made-up number
html = once(
    html,
    'value: D.rft + "%", sub: month.firstPass + " of " + month.dyedLots + " lots first-time right"',
    'value: month.firstPass == null ? "\\u2014" : D.rft + "%", sub: month.firstPass == null ? month.dyedLots + " lots in this month \\u00B7 RFT needs re-dye entries" : month.firstPass + " of " + month.dyedLots + " lots first-time right"',
    "rft",
)
html = once(html, 'value: month.avgTatDays + " d"', 'value: month.avgTatDays == null ? "\\u2014" : month.avgTatDays + " d"', "tat")

html = once(
    html,
    'React.createElement(MachineTile, { key: m.id, m, lot: m.lot ? lots.find((l) => l.id === m.lot) : null }',
    'React.createElement(MachineTile, { key: m.code || m.id, m, lot: m.lot ? lots.find((l) => l.id === m.lot) : (__M.strict && m.status === "Running" ? __planLot(m) : null) }',
    "dash machine tile",
)

# 10. live screens (same look: Section / Chip / Kpi / MachineTile / ShadeSq)
LIVE = open(__file__.replace("build_mill_html.py", "mill_live_screens.js"), encoding="utf-8").read()
html = once(html, "  function App() {", LIVE + "\n  function App() {", "live screens")
html = once(
    html,
    'const body = state.screen === "dash" ? ' + P + 'React.createElement(Dashboard, { state, mobile }) : state.screen === "expense" ? ' + P + 'React.createElement(ExpenseScreen, { mobile }) : state.screen === "reports" ? ' + P + 'React.createElement(ReportsScreen, { mobile }) : ' + P + 'React.createElement(Stub, { item: NAV.find((n) => n.k === state.screen) });',
    'const body = state.screen === "dash" ? React.createElement(Dashboard, { state, mobile })'
    ' : state.screen === "lots" ? React.createElement(LiveLots, { mobile })'
    ' : state.screen === "machines" ? React.createElement(LiveMachines, { mobile })'
    ' : state.screen === "inward" ? React.createElement(LiveInward, { mobile })'
    ' : state.screen === "dispatch" ? React.createElement(LiveDispatch, { mobile })'
    ' : state.screen === "lab" ? React.createElement(LiveShades, { mobile })'
    ' : state.screen === "expense" ? (__M.strict ? React.createElement(LiveExpense, { mobile }) : React.createElement(ExpenseScreen, { mobile }))'
    ' : state.screen === "coal_offers" ? (__M.strict ? React.createElement(LiveCoalOffers, { mobile }) : React.createElement(Stub, { item: NAV.find((n) => n.k === state.screen) }))'
    ' : state.screen === "reports" ? (__M.strict ? React.createElement(LiveReports, { mobile }) : React.createElement(ReportsScreen, { mobile }))'
    ' : React.createElement(Stub, { item: NAV.find((n) => n.k === state.screen) });',
    "body",
)

# 11. Global Search (MillShell) can open a page: window.__millNav('<page key>').
#     Only pages already in NAV (= the user's Mill rights) open; anything else → false.
html = once(
    html,
    'const nav = (k) => dispatch({ type: "NAV", k });',
    'const nav = (k) => dispatch({ type: "NAV", k }); window.__millNav = function (k) { if (!NAV.some(function (n) { return n.k === k; })) return false; nav(k); try { window.scrollTo(0, 0); } catch (e) {} return true; };',
    "global search nav",
)

ts = (
    "// AUTO-GENERATED by tools/build_mill_html.py from the Process House ERP artifact.\n"
    "// Do not edit by hand – change the artifact / the build script and rebuild.\n"
    "/* eslint-disable */\n"
    "export const MILL_HUB_HTML_TEMPLATE: string = " + json.dumps(html, ensure_ascii=True) + ";\n"
)
open(out, "w", encoding="utf-8").write(ts)
print("ok", len(html), "chars →", out)
