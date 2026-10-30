  /* ───────── Flownest: LIVE screens (data from the Mills server, same look as the artifact) ───────── */
  function __demoBanner(what) {
    if (!__M.strict) return null;
    return React.createElement("div", { style: { background: C.amberSoft, border: "1px solid #fcd34d", color: C.amber, borderRadius: 12, padding: "9px 13px", fontSize: 12, fontWeight: 700, marginBottom: 12, lineHeight: 1.5 } },
      "DEMO FIGURES — " + what + " is not connected to the Mills database yet. These numbers are the design sample, not your mill.");
  }
  function __liveHead(title, sub, mobile, right) {
    return React.createElement("div", { style: { display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mobile ? "column" : "row", gap: 8, marginBottom: 14 } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: mobile ? 22 : 26, color: C.ink } }, title),
        React.createElement("div", { style: { fontSize: 12.5, color: C.mut, marginTop: 2 } }, sub)),
      right || null);
  }
  function __noData(name) {
    return React.createElement("div", { style: { background: C.roseSoft, border: "1px solid #fecdd3", color: C.rose, borderRadius: 12, padding: "12px 14px", fontSize: 12.5, fontWeight: 700, lineHeight: 1.5 } },
      "No live " + name + " from Mills" + (__M.note ? " — " + __M.note : "") + ". Tap the chip at the bottom to retry.");
  }
  /* a running machine from Mills has an open planned batch but no lot link → show the plan */
  function __planLot(m) { return { id: m.name || m.code || m.id, party: "Planned batch", shade: { code: m.code || "", hex: "#cbd5e1", light: true } }; }
  function __has(k) { return Object.prototype.hasOwnProperty.call(__D, k) && __D[k] != null; }
  function __search(v, set, ph) {
    return React.createElement("input", { value: v, onChange: function (e) { set(e.target.value); }, placeholder: ph,
      style: { width: "100%", boxSizing: "border-box", border: "1px solid " + C.line, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "DM Sans, sans-serif", marginBottom: 12, background: "#fff", color: C.ink } });
  }
  function __match(q, parts) { q = (q || "").trim().toLowerCase(); if (!q) return true; return parts.join(" ").toLowerCase().indexOf(q) >= 0; }
  function __row(cells, key, mobile) {
    return React.createElement("div", { key: key, style: { display: "flex", flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? "2px 12px" : 14, alignItems: "baseline", padding: "9px 14px", borderTop: "1px solid #f1f4fa" } }, cells);
  }
  function __cell(text, opt) {
    opt = opt || {};
    return React.createElement("span", { key: opt.k, style: { flex: opt.flex || "none", minWidth: opt.w || 0, fontSize: opt.size || 12.5, fontWeight: opt.bold ? 800 : 600, color: opt.color || C.slate, textAlign: opt.right ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, text);
  }

  function LiveLots({ mobile }) {
    const [q, setQ] = useState("");
    const [f, setF] = useState("open");
    if (!__has("LOTS")) return React.createElement("div", null, __liveHead("Lot Board", "Greige lots from Mills", mobile), __noData("lots"));
    const all = LOTS;
    const rows = all.filter(function (l) {
      if (f === "open" && l.status === "Dispatched") return false;
      if (f === "done" && l.status !== "Dispatched") return false;
      return __match(q, [l.id, l.party, l.quality, l.shade && l.shade.code, l.shade && l.shade.name]);
    });
    const open = all.filter(function (l) { return l.status !== "Dispatched"; });
    const late = open.filter(function (l) { return l.due && daysBetween(l.due, TODAY) > 0; });
    const tab = function (k, t) { return React.createElement("button", { key: k, onClick: function () { setF(k); }, style: { border: "1px solid " + (f === k ? C.indigo : C.line), background: f === k ? C.indigoSoft : "#fff", color: f === k ? C.indigoDark : C.slate, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, t); };
    return React.createElement("div", null,
      __liveHead("Lot Board", "Live from Mills · inward of the last " + (__M.lotDays || 45) + " days", mobile,
        React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, tab("open", "In house " + open.length), tab("done", "Dispatched " + (all.length - open.length)), tab("all", "All " + all.length))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 14 } },
        React.createElement(Kpi, { mobile, label: "In-house lots", value: fm(open.length), sub: fm(open.reduce(function (s, l) { return s + (l.greigeMtr || 0); }, 0)) + " m greige", accent: C.indigo }),
        React.createElement(Kpi, { mobile, label: "Past due", value: fm(late.length), sub: "TAT " + (MONTH.tatTarget || 7) + " d from inward", accent: C.rose }),
        React.createElement(Kpi, { mobile, label: "Dispatched", value: fm(all.length - open.length), sub: "in this window", accent: C.green }),
        React.createElement(Kpi, { mobile, label: "Greige in window", value: fm(all.reduce(function (s, l) { return s + (l.greigeMtr || 0); }, 0)), sub: "metres", accent: C.teal })),
      __search(q, setQ, "Search lot, party, quality or shade"),
      React.createElement(Section, { title: rows.length + " lots", pad: false },
        rows.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No lots.") :
        rows.slice(0, 400).map(function (l) {
          const lateBy = l.status !== "Dispatched" && l.due ? daysBetween(l.due, TODAY) : 0;
          const st = stageOf(l.stage);
          return React.createElement("div", { key: l.id + "-" + l.uid, style: { padding: "10px 14px", borderTop: "1px solid #f1f4fa" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" } },
              React.createElement("div", { style: { minWidth: 0 } },
                React.createElement("span", { style: { fontSize: 13, fontWeight: 800, color: C.ink } }, l.id),
                React.createElement("span", { style: { fontSize: 12.5, fontWeight: 600, color: C.slate } }, " · " + l.party)),
              React.createElement("div", { style: { display: "flex", gap: 5, flexShrink: 0 } },
                lateBy > 0 ? React.createElement(Chip, { text: "+" + lateBy + "d LATE", bg: C.roseSoft, fg: C.rose }) : null,
                React.createElement(Chip, { text: l.status === "Dispatched" ? "DISPATCHED" : (st ? st.label : l.stage).toUpperCase(), bg: l.status === "Dispatched" ? C.greenSoft : C.indigoSoft, fg: l.status === "Dispatched" ? C.green : C.indigoDark }))),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 5, alignItems: "center", fontSize: 11.5, color: C.mut } },
              React.createElement("span", null, l.quality),
              React.createElement("span", null, fm(l.greigeMtr) + " m" + (l.greigeKg ? " · " + fm(l.greigeKg) + " kg" : "")),
              l.finishedMtr ? React.createElement("span", null, "delivered " + fm(l.finishedMtr) + " m") : null,
              React.createElement("span", null, "in " + l.inDate + (l.dispDate ? " · out " + l.dispDate : " · due " + l.due)),
              l.shade && l.shade.code && l.shade.code !== "—" ? React.createElement(ShadeSq, { shade: l.shade, size: 11 }) : null));
        })));
  }

  function LiveMachines({ mobile }) {
    if (!__has("MACHINES")) return React.createElement("div", null, __liveHead("Machine Planner", "Machines from Mills", mobile), __noData("machines"));
    const run = MACHINES.filter(function (m) { return m.status === "Running"; }).length;
    const groups = {};
    MACHINES.forEach(function (m) { (groups[m.kind] = groups[m.kind] || []).push(m); });
    return React.createElement("div", null,
      __liveHead("Machine Planner", "Live from Mills · " + run + " of " + MACHINES.length + " with open planned batches", mobile),
      Object.keys(groups).map(function (k) {
        return React.createElement("div", { key: k, style: { marginBottom: 14 } },
          React.createElement(Section, { title: k + " · " + groups[k].length },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 } },
              groups[k].map(function (m) { return React.createElement(MachineTile, { key: m.code || m.id, m: m, lot: m.status === "Running" ? __planLot(m) : null }); }))));
      }));
  }

  function __listScreen(title, key, mobile, q, setQ, cols, rowsOf, totalOf, subLabel) {
    if (!__has(key)) return React.createElement("div", null, __liveHead(title, "From Mills", mobile), __noData(title.toLowerCase()));
    const all = __D[key] || [];
    const rows = all.filter(function (r) { return __match(q, cols.map(function (c) { return String(r[c] == null ? "" : r[c]); })); });
    return React.createElement("div", null,
      __liveHead(title, "Live from Mills · " + (subLabel || __M.rangeLabel || "this month") + " · " + all.length + " entries", mobile, totalOf ? React.createElement(Chip, { text: totalOf(all), bg: C.tealSoft, fg: C.teal }) : null),
      __search(q, setQ, "Search"),
      React.createElement(Section, { title: rows.length + " entries", pad: false },
        rows.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No entries.") :
        rows.slice(0, 500).map(function (r, i) { return __row(rowsOf(r), (r.uid || r.code || "") + "-" + i, mobile); })));
  }

  function LiveInward({ mobile }) {
    const [q, setQ] = useState("");
    return __listScreen("Greige Inward", "INWARD", mobile, q, setQ, ["inwno", "lotno", "party", "chalno", "inwdate"], function (r) {
      return [__cell(r.inwdate, { k: "d", w: 84 }), __cell(r.inwno, { k: "n", bold: true, color: C.ink, w: 70 }), __cell(r.lotno ? "Lot " + r.lotno : "", { k: "l", w: 80 }),
        __cell(r.party || "—", { k: "p", flex: 1, color: C.ink }), __cell(fm(Math.round(r.totmtr || 0)) + " m", { k: "m", right: true, bold: true, w: 80 }), __cell((r.tottaka || 0) + " taka", { k: "t", right: true, w: 64 })];
    }, function (all) { return fm(Math.round(all.reduce(function (s, r) { return s + Number(r.totmtr || 0); }, 0))) + " m"; });
  }

  function LiveDispatch({ mobile }) {
    const [q, setQ] = useState("");
    return __listScreen("Dispatch & Billing", "DISPATCH", mobile, q, setQ, ["outno", "party", "outdate", "remark"], function (r) {
      return [__cell(r.outdate, { k: "d", w: 84 }), __cell(r.outno, { k: "n", bold: true, color: C.ink, w: 70 }), __cell(r.party || "—", { k: "p", flex: 1, color: C.ink }),
        __cell("₹ " + fm(Math.round(r.netamt || 0)), { k: "a", right: true, bold: true, w: 100 })];
    }, function (all) { return "₹ " + fm(Math.round(all.reduce(function (s, r) { return s + Number(r.netamt || 0); }, 0))); });
  }

  function LiveShades({ mobile }) {
    const [q, setQ] = useState("");
    return __listScreen("Shade Lab", "SHADES", mobile, q, setQ, ["code", "name"], function (r) {
      return [__cell(r.code, { k: "c", bold: true, color: C.ink, w: 110 }), __cell(r.name || "", { k: "n", flex: 1 })];
    }, null, "shade master");
  }

  /* ───────── two-way bridge: the page asks Flownest → apig → Sudamo → Mills ───────── */
  var __pend = {}, __seq = 0;
  function __api(action, body) {
    return new Promise(function (resolve) {
      if (typeof __M.post !== "function") { resolve({ success: false, message: "Not inside Flownest." }); return; }
      var id = ++__seq; __pend[id] = resolve;
      __post({ type: "api", id: id, action: action, body: body || {} });
      setTimeout(function () { if (__pend[id]) { delete __pend[id]; resolve({ success: false, message: "Mills did not answer in time." }); } }, 150000);
    });
  }
  window.__millReply = function (m) { var f = m && __pend[m.id]; if (f) { delete __pend[m.id]; f(m.result); } };
  window.addEventListener("message", function (e) { if (e && e.data && e.data.__millReply) window.__millReply(e.data.payload); });

  function __ym(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function __shiftYm(ym, n) { var p = ym.split("-"); var d = new Date(Number(p[0]), Number(p[1]) - 1 + n, 1); return __ym(d); }
  function __errBox(msg) { return React.createElement("div", { style: { background: C.roseSoft, border: "1px solid #fecdd3", color: C.rose, borderRadius: 12, padding: "12px 14px", fontSize: 12.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 12 } }, msg); }
  function __loadingBox(t) { return React.createElement("div", { style: { padding: "28px 0", textAlign: "center", color: C.mut, fontSize: 12.5 } }, t || "Loading from Mills…"); }
  function __rowBtn(key, onClick, left, right, sub, pct, color) {
    return React.createElement("div", { key: key, onClick: onClick, style: { padding: "10px 14px", borderTop: "1px solid " + C.line, cursor: onClick ? "pointer" : "default" } },
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr auto 14px", gap: 10, alignItems: "baseline" } },
        React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
          color ? React.createElement("span", { style: { width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 } }) : null,
          React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, left)),
        React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: C.ink, whiteSpace: "nowrap" } }, right),
        React.createElement("span", { style: { color: C.mut } }, onClick ? "›" : "")),
      sub ? React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 2 } }, sub) : null,
      pct != null ? React.createElement("div", { style: { height: 5, background: "#eef1f8", borderRadius: 99, overflow: "hidden", marginTop: 6 } },
        React.createElement("div", { style: { width: Math.max(1, Math.min(100, pct)) + "%", height: "100%", background: color || C.indigo } })) : null);
  }
  var __CATC = { coal: "#d97706", chem: "#0d9488", elec: "#4f46e5", labour: "#7c3aed", maint: "#64748b", other: "#94a3b8" };

  function LiveExpense({ mobile }) {
    /* Monthly Expense — live from the Mills STORE ISSUES (MDMS<FY>: FAMIss + FAMIssD1, value = Qty × Rate)
       billing = process invoices (MDAP<FY>: DAPOutI).  General (categories) → items → issue entries. */
    const [ym, setYm] = useState(__ym(new Date((__M.today || TODAY) + "T00:00:00")));
    const [d, setD] = useState(null);
    const [busy, setBusy] = useState(true);
    const [cat, setCat] = useState(null);
    const [itm, setItm] = useState(null);
    const [iss, setIss] = useState(null);
    const [design, setDesign] = useState(false);
    const [page, setPage] = useState(null);       // null | 'coal' | 'elec'  (live coal / steam / optimiser, electricity)
    useEffect(() => {
      let alive = true; setBusy(true); setCat(null); setItm(null);
      __api("expense/summary", { month: ym, trend: 6 }).then(function (r) { if (alive) { setD(r); setBusy(false); } });
      return () => { alive = false; };
    }, [ym]);
    useEffect(() => {
      if (!itm) { setIss(null); return; }
      let alive = true; setIss({ loading: true });
      __api("expense/issues", { month: ym, itmcode: itm.itmcode }).then(function (r) { if (alive) setIss(r); });
      return () => { alive = false; };
    }, [itm, ym]);

    if (page === "coal") return React.createElement(LiveCoalHub, { mobile, ym, onBack: () => setPage(null), bill: d && d.success && d.data && d.data.billing ? d.data.billing.amount : 0 });
    if (page === "elec") return React.createElement(LiveElectricity, { mobile, ym, onBack: () => setPage(null), bill: d && d.success && d.data && d.data.billing ? d.data.billing.amount : 0 });
    if (design) return React.createElement("div", null, React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setDesign(false), label: "LIVE EXPENSE" })), __demoBanner("This coal / FBC / electricity detail"), React.createElement(ExpenseScreen, { mobile }));

    const data = d && d.success ? d.data : null;
    const bill = data && data.billing ? data.billing.amount : null;
    const pct = (x) => (bill ? (x / bill * 100) : null);
    const qty = (x, u) => (Math.round(Number(x || 0) * 100) / 100).toLocaleString("en-IN") + (u ? " " + u : "");
    const monthNav = React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, -1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "‹"),
      React.createElement(Chip, { text: (data ? data.month + " · " + data.days + " DAYS" : ym) }),
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, 1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "›"),
      bill != null ? React.createElement(Chip, { text: "BILLING " + inr(bill), bg: C.greenSoft, fg: C.green }) : null);
    const head = __liveHead("Monthly Expense", "Live from Mills — billing = process invoices (MDM DAPOutI + DAPOutID1), expense = store issues qty × rate (coal ex-GST) + electricity meter entries. Tap a line to go deeper.", mobile, monthNav);

    if (busy) return React.createElement("div", null, head, __loadingBox());
    if (!data) return React.createElement("div", null, head, __errBox("Monthly expense could not be read from Mills — " + ((d && (d.message || "")) + (d && d.data && d.data.errors ? " · " + d.data.errors.join(" | ") : ""))));
    const errs = (data.errors || []).length ? __errBox("Notes from Mills: " + data.errors.join(" | ")) : null;

    // ── detail: issue entries of one item ──
    if (cat && itm) {
      const rows = iss && iss.success && iss.data ? (iss.data.rows || []) : null;
      return React.createElement("div", null,
        React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setItm(null), label: cat.label.toUpperCase() })),
        __liveHead(itm.itmname, data.month + " · " + qty(itm.qty, itm.uom) + " · " + inr(itm.amount) + (itm.group ? " · " + itm.group : ""), mobile),
        !iss || iss.loading ? __loadingBox() : !rows ? __errBox("Issue entries could not be read — " + (iss.message || "")) :
        React.createElement(Section, { title: rows.length + " issue entries", pad: false },
          rows.map(function (r, i) {
            const sub = [r.maccode ? "machine " + r.maccode : "", r.issto ? "to " + r.issto : "", r.dptcode ? "dept " + r.dptcode : "", r.batchno ? "batch " + r.batchno : "", Number(r.meters) ? fm(Math.round(Number(r.meters))) + " m" : "", r.remark || ""].filter(Boolean).join(" · ");
            return __rowBtn(i, null, (r.issdate || "") + "  No. " + (r.issno || r.uid) + "  ·  " + qty(r.qty, itm.uom), inr(Number(r.amount || 0)), sub, null, null);
          })));
    }
    // ── specific: items of one category ──
    if (cat) {
      return React.createElement("div", null,
        React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setCat(null) })),
        __liveHead(cat.label, data.month + " · " + inr(cat.amount) + (bill ? " · " + pct(cat.amount).toFixed(1) + "% of billing" : ""), mobile),
        React.createElement(Section, { title: cat.items.length + " items issued", pad: false },
          cat.items.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "Nothing issued in this month.") :
          cat.items.map(function (it) {
            return __rowBtn(it.itmcode, () => setItm(it), it.itmname, inr(it.amount), qty(it.qty, it.uom) + " · " + it.issues + " issues" + (it.group ? " · " + it.group : "") + (it.subgroup ? " / " + it.subgroup : ""), cat.amount ? it.amount / cat.amount * 100 : null, __CATC[cat.key]);
          })));
    }
    // ── general ──
    const cats = (data.categories || []).filter(function (c) { return c.amount !== 0 || c.items.length || (c.key === "coal" && __can("expense.coal")) || (c.key === "elec" && __can("expense.electricity")); }).sort(function (a, b) { return b.amount - a.amount; });
    const openCat = function (c) {
      if (c.key === "coal" && __can("expense.coal")) setPage("coal");
      else if (c.key === "elec" && __can("expense.electricity")) setPage("elec");
      else setCat(c);
    };
    const catSub = function (c) {
      if (c.key === "coal" && __can("expense.coal")) return c.items.length + " coal / fuel items · ex-GST · FBC steam, thermopack, optimiser ›";
      if (c.key === "elec" && __can("expense.electricity")) return data.power && data.power.kwh ? fm(Math.round(data.power.kwh)) + " kWh (" + data.power.basis + ") × ₹" + data.power.rate + " · meter entry ›" : "no meter readings yet — tap to enter";
      return c.items.length + " items";
    };
    const trend = data.trend || [];
    const maxT = Math.max.apply(null, trend.map(function (t) { return t.billing ? t.expense / t.billing * 100 : t.expense; }).concat([1]));
    return React.createElement("div", null, head, errs,
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 14 } },
        React.createElement(Kpi, { mobile, label: "Billing", value: bill != null ? inr(bill) : "—", sub: data.billing ? data.billing.invoices + " process invoices" + (data.billing.mtr ? " · " + fm(Math.round(data.billing.mtr)) + " m" : "") : "process invoices not found", accent: C.green }),
        React.createElement(Kpi, { mobile, label: "Total expense", value: inr(data.total), sub: "store issues · qty × rate", accent: C.ink }),
        React.createElement(Kpi, { mobile, label: "Expense of billing", value: bill ? pct(data.total).toFixed(1) + "%" : "—", sub: "billing = 100%", accent: C.amber }),
        React.createElement(Kpi, { mobile, label: "Balance", value: bill != null ? inr(bill - data.total) : "—", sub: bill ? (100 - pct(data.total)).toFixed(1) + "% of billing" : "", accent: C.teal })),
      React.createElement(Section, { title: "Where the billing goes", pad: false, right: React.createElement(Chip, { text: "TAP FOR DETAIL" }) },
        cats.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No store issues in this month.") :
        cats.map(function (c) { return __rowBtn(c.key, () => openCat(c), c.label, inr(c.amount) + (bill ? "  " + pct(c.amount).toFixed(1) + "%" : ""), catSub(c), bill ? pct(c.amount) : (data.total ? c.amount / data.total * 100 : null), __CATC[c.key]); })),
      React.createElement("div", { style: { marginTop: 14 } },
        React.createElement(Section, { title: "Expense vs billing — " + trend.length + " months" },
          React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: mobile ? 8 : 16, height: 120 } },
            trend.map(function (t, i) {
              const p = t.billing ? t.expense / t.billing * 100 : null;
              const v = p != null ? p : t.expense;
              const last = i === trend.length - 1;
              return React.createElement("div", { key: t.ym, onClick: () => setYm(t.ym.slice(0, 4) + "-" + t.ym.slice(4, 6)), style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", cursor: "pointer" } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: last ? C.ink : C.mut, marginBottom: 3 } }, p != null ? p.toFixed(1) + "%" : inr(t.expense)),
                React.createElement("div", { style: { width: "70%", height: Math.max(4, v / maxT * 80) + "px", borderRadius: 5, background: last ? C.indigo : "#c7d2fe" } }),
                React.createElement("div", { style: { fontSize: 10, color: C.mut, marginTop: 4, fontWeight: 700 } }, t.month));
            })),
          React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 6 } }, "Expense as a percent of that month's billing. Tap a month to open it."))),
      React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 14, lineHeight: 1.6 } },
        "Source: store issues (FAMIss + FAMIssD1) in ", (data.source && data.source.issues) || "?", ", billing (DAPOutI + DAPOutID1) in ", (data.source && data.source.billing) || "not found",
        ". Category comes from the item group / item name — every item is listed under its category so you can check it. ", data.coal_rule ? "Coal: " + data.coal_rule + ". " : "",
        React.createElement("span", { onClick: () => setDesign(true), style: { color: C.indigo, fontWeight: 700, cursor: "pointer" } }, "Chemicals / labour / maintenance design pages (not connected) ›")));
  }

  /* Reports & KPIs — live from the dyeing & processing DB (MDAP<FY>):
       party-wise business (DAPOutI), quality / shade-wise inward (DAPInw), TAT distribution (lots).
     Colour Cost needs dye + chemical consumption per lot → stays DEMO until that table is known. */
  function __monthBounds(ym) { var p = ym.split("-"); var y = Number(p[0]), m = Number(p[1]); var last = new Date(y, m, 0).getDate(); return [ym + "-01", ym + "-" + String(last).padStart(2, "0")]; }
  function LiveReports({ mobile }) {
    const [ym, setYm] = useState(__ym(new Date((__M.today || TODAY) + "T00:00:00")));
    const [d, setD] = useState(null);
    const [view, setView] = useState(null);      // null | 'party' | 'quality' | 'shade' | 'tat' | 'colour'
    const [party, setParty] = useState(null);
    const [inv, setInv] = useState(null);
    const [f, setF] = useState(null);
    const range = __monthBounds(ym);
    useEffect(() => {
      let alive = true; setD(null); setParty(null);
      __api("reports/summary", { fromdate: range[0], todate: range[1] }).then(function (r) { if (alive) setD(r); });
      return () => { alive = false; };
    }, [ym]);
    useEffect(() => {
      if (!party) { setInv(null); return; }
      let alive = true; setInv({ loading: true });
      __api("reports/party", { fromdate: range[0], todate: range[1], parcode: party.parcode }).then(function (r) { if (alive) setInv(r); });
      return () => { alive = false; };
    }, [party, ym]);

    const nav = React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, -1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "‹"),
      React.createElement(Chip, { text: new Date(range[0] + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase() }),
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, 1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "›"));
    const back = (label) => React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => { setView(null); setParty(null); }, label: label || "REPORTS" }));

    if (view === "colour") return React.createElement("div", null, back(), __demoBanner("Colour Cost Analysis"), React.createElement(ColorCost, { mobile, onBack: () => setView(null) }));

    const data = d && d.success ? d.data : null;
    const head = __liveHead("Reports & KPIs", "Live from Mills — dyeing & processing DB" + (data && (data.party_db || data.inward_db) ? " (" + (data.party_db || data.inward_db) + ")" : "") + ". General first, detail on tap.", mobile, nav);
    if (!d) return React.createElement("div", null, head, __loadingBox());
    if (!data) return React.createElement("div", null, head, __errBox("Reports could not be read from Mills — " + (d.message || "") + (d.data && d.data.errors ? " · " + d.data.errors.join(" | ") : "")));
    const errs = (data.errors || []).length ? __errBox("Notes from Mills: " + data.errors.join(" | ")) : null;

    if (view === "party" && party) {
      const rows = inv && inv.success && inv.data ? inv.data.rows || [] : null;
      return React.createElement("div", null, back("PARTY-WISE BUSINESS"),
        __liveHead(party.party, inr(Number(party.amount)) + " · " + party.invoices + " invoices", mobile),
        !inv || inv.loading ? __loadingBox() : !rows ? __errBox("Invoices could not be read — " + (inv.message || "")) :
        React.createElement(Section, { title: rows.length + " invoices", pad: false },
          rows.map(function (r, i) { return __rowBtn(i, null, r.voudate + "  " + r.vouno, inr(Number(r.netamt)), Number(r.balamt) ? "balance " + inr(Number(r.balamt)) : (r.remark || ""), null, null); })));
    }
    if (view === "party") {
      const rows = data.party || [];
      const tot = rows.reduce(function (a, r) { return a + Number(r.amount || 0); }, 0);
      return React.createElement("div", null, back(), __liveHead("Party-wise business", inr(tot) + " · process invoices", mobile),
        React.createElement(Section, { title: rows.length + " parties", pad: false },
          rows.map(function (r) { return __rowBtn(r.parcode, () => setParty(r), r.party, inr(Number(r.amount)), r.invoices + " invoices", tot ? Number(r.amount) / tot * 100 : null, C.indigo); })));
    }
    if (view === "quality" || view === "shade") {
      const rows = data[view] || [];
      const tot = rows.reduce(function (a, r) { return a + Number(r.mtr || 0); }, 0);
      return React.createElement("div", null, back(), __liveHead(view === "quality" ? "Quality-wise inward" : "Shade-wise inward", fm(Math.round(tot)) + " m greige", mobile),
        React.createElement(Section, { title: rows.length + (view === "quality" ? " qualities" : " shades"), pad: false },
          rows.map(function (r) { return __rowBtn(r.code, null, (r.name || r.code || "—"), fm(Math.round(Number(r.mtr || 0))) + " m", r.lots + " lots", tot ? Number(r.mtr) / tot * 100 : null, view === "quality" ? C.teal : "#7c3aed"); })));
    }
    if (view === "tat") {
      const t = data.tat || { buckets: {} };
      const keys = Object.keys(t.buckets || {});
      const max = Math.max.apply(null, keys.map(function (k) { return t.buckets[k]; }).concat([1]));
      return React.createElement("div", null, back(), __liveHead("TAT distribution", (t.lots || 0) + " lots dispatched · avg " + (t.avg == null ? "—" : t.avg + " d") + " · target " + t.target + " d", mobile),
        React.createElement(Section, { title: "Days from greige inward to dispatch" },
          keys.map(function (k) { return __rowBtn(k, null, k, t.buckets[k] + " lots", null, t.buckets[k] / max * 100, C.amber); })));
    }

    const card = (key, title, sub, chip, onClick, accent) => React.createElement("div", { key: key, onClick: onClick, style: { marginTop: 12, background: C.card, border: "1px solid " + C.line, borderLeft: "4px solid " + (accent || C.indigo), borderRadius: 14, padding: "13px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 17, color: C.ink } }, title),
        React.createElement("div", { style: { fontSize: 11.5, color: C.mut, marginTop: 2 } }, sub),
        chip ? React.createElement("div", { style: { marginTop: 7 } }, chip) : null),
      React.createElement("span", { style: { color: C.mut } }, "›"));
    const pt = (data.party || []).reduce(function (a, r) { return a + Number(r.amount || 0); }, 0);
    const qm = (data.quality || []).reduce(function (a, r) { return a + Number(r.mtr || 0); }, 0);
    const run = () => { setF({ loading: true }); __api("discover", {}).then(function (r) { setF(r); }); };
    const runMdap = () => { setF({ loading: true }); __api("schema", { prefix: "MDAP", all_columns: 1 }).then(function (r) { setF(r); }); };
    const text = f && f.success ? JSON.stringify(f.data, null, 1) : "";
    return React.createElement("div", null, head, errs,
      card("party", "Party-wise business", "Process invoices of the month per party — tap a party for its invoices", data.party ? React.createElement(Chip, { text: inr(pt) + " · " + (data.party || []).length + " PARTIES", bg: C.greenSoft, fg: C.green }) : React.createElement(Chip, { text: "NOT FOUND", bg: C.roseSoft, fg: C.rose }), () => setView("party"), C.green),
      card("quality", "Quality-wise inward", "Greige inward metres per quality", data.quality ? React.createElement(Chip, { text: fm(Math.round(qm)) + " m" }) : React.createElement(Chip, { text: "NOT FOUND", bg: C.roseSoft, fg: C.rose }), () => setView("quality"), C.teal),
      card("shade", "Shade-wise inward", "Greige inward metres per shade", data.shade ? React.createElement(Chip, { text: (data.shade || []).length + " SHADES" }) : React.createElement(Chip, { text: "NOT FOUND", bg: C.roseSoft, fg: C.rose }), () => setView("shade"), "#7c3aed"),
      card("tat", "TAT distribution", "Days from greige inward to dispatch, lots dispatched in the month", data.tat ? React.createElement(Chip, { text: "AVG " + (data.tat.avg == null ? "—" : data.tat.avg + " d") + " · " + data.tat.lots + " LOTS", bg: C.amberSoft, fg: C.amber }) : React.createElement(Chip, { text: "NOT FOUND", bg: C.roseSoft, fg: C.rose }), () => setView("tat"), C.amber),
      card("colour", "Colour Cost Analysis", "Light · Medium · Dark — dyeing cost by shade depth", React.createElement(Chip, { text: "DEMO — needs the dye / chemical consumption table", bg: C.amberSoft, fg: C.amber }), () => setView("colour"), C.indigo),
      React.createElement("div", { style: { marginTop: 14 } },
        React.createElement(Section, { title: "Connect more Mills data", right: React.createElement(Chip, { text: "ADMIN" }) },
          React.createElement("div", { style: { fontSize: 12, color: C.slate, lineHeight: 1.6 } }, "Colour Cost needs the table where dyes and chemicals are issued / consumed per lot or batch. Share the MDAP structure (all tables and columns of the dyeing DB) or run the finder on every Mills database."),
          React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" } },
            React.createElement("button", { onClick: runMdap, style: { border: "none", background: C.indigo, color: "#fff", borderRadius: 9, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" } }, f && f.loading ? "Reading…" : "Read MDAP structure"),
            React.createElement("button", { onClick: run, style: { border: "1px solid " + C.indigo, background: "#fff", color: C.indigo, borderRadius: 9, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" } }, "Find in all Mills DBs"),
            text ? React.createElement("button", { onClick: () => __post({ type: "share", text: text }), style: { border: "1px solid " + C.teal, background: "#fff", color: C.teal, borderRadius: 9, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" } }, "Share / copy result") : null),
          f && !f.loading && !f.success ? __errBox(f.message || "Failed.") : null,
          text ? React.createElement("pre", { style: { marginTop: 10, maxHeight: 360, overflow: "auto", background: "#0f172a", color: "#c7d2fe", borderRadius: 10, padding: 10, fontSize: 10.5, whiteSpace: "pre-wrap" } }, text.slice(0, 80000)) : null)));
  }

  /* ═════════ COAL · FBC STEAM · THERMOPACK · OPTIMISER — live (Mills store issues + daily steam entry) ═════════
     Same pages and formulas as the artifact (ExpCoalSummary / FbcBoiler / ExpCoalDetail / CoalOptimiser),
     data from  expense/coal  (coal issues by main item + make, FBC vs Thermopack by machine / department,
     amount = qty × rate ÷ 1.18, steam entries, dyeing production FAMMR → DAPProcess 1 / 16). */
  var __h = React.createElement;
  var __QC = ["#f59e0b", "#b45309", "#78716c", "#0d9488", "#7c3aed", "#be123c", "#4f46e5", "#0891b2", "#65a30d", "#db2777"];
  var __MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function __dates(f, t) { var out = []; if (!f || !t) return out; var d = new Date(f + "T00:00:00"), e = new Date(t + "T00:00:00"); var g = 0; while (d <= e && g++ < 400) { out.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")); d.setDate(d.getDate() + 1); } return out; }
  function __dl(dt) { if (!dt) return "—"; return dt.slice(8, 10) + " " + __MON[Number(dt.slice(5, 7)) - 1]; }
  function __ticks(ds) { if (!ds.length) return ["—", "", "", "", ""]; var p = function (f) { return ds[Math.round(f * (ds.length - 1))].slice(8, 10); }; return [p(0), p(0.25), p(0.5), p(0.75), p(1)]; }
  function __n(x) { var v = Number(x); return isFinite(v) ? v : 0; }
  function __t1(kg) { return (__n(kg) / 1000).toFixed(1); }
  function __rs(x, d) { return "₹" + __n(x).toFixed(d == null ? 2 : d); }
  function __btn(text, onClick, kind, busy) {
    var solid = kind !== "line";
    return __h("button", { onClick: busy ? undefined : onClick, disabled: !!busy, style: { border: solid ? "none" : "1px solid " + (kind === "rose" ? C.rose : C.teal), background: solid ? (kind === "rose" ? C.rose : kind === "indigo" ? C.indigo : C.teal) : "#fff", color: solid ? "#fff" : (kind === "rose" ? C.rose : C.teal), borderRadius: 999, padding: "7px 16px", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap" } }, busy ? "SAVING…" : text);
  }
  function __inp(v, set, ph, w, type) {
    return __h("input", { type: type || "number", value: v == null ? "" : v, placeholder: ph, onChange: function (e) { set(e.target.value); },
      style: { width: w || 90, padding: "7px 9px", border: "1px solid " + C.line, borderRadius: 9, fontSize: 12, fontFamily: "inherit", color: C.ink, background: "#fff", boxSizing: "border-box" } });
  }
  function __sel(v, set, opts, st) {
    return __h("select", { value: v, onChange: function (e) { set(e.target.value); }, style: Object.assign({ padding: "7px 10px", border: "1px solid " + C.line, borderRadius: 10, fontSize: 12, fontWeight: 700, color: C.ink, background: "#fff", fontFamily: "inherit", maxWidth: "100%" }, st || {}) },
      opts.map(function (o) { return __h("option", { key: o[0], value: o[0] }, o[1]); }));
  }
  function __msg(m) { if (!m) return null; return __h("div", { style: { fontSize: 11.5, fontWeight: 700, marginTop: 8, color: m.ok ? C.green : C.rose, lineHeight: 1.5 } }, m.text); }
  function __title(t, mobile, right) {
    return __h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 12 } },
      __h("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: mobile ? 21 : 25, color: C.ink } }, t), right || null);
  }
  function __grid4(mobile, kids) { return __h("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginTop: 12 } }, kids); }
  function __gap(k) { return __h("div", { style: { marginTop: 14 } }, k); }
  function __note(t) { return __h("div", { style: { fontSize: 11, color: C.mut, marginTop: 12, lineHeight: 1.6 } }, t); }
  function __legend(items) { return __h("div", { style: { display: "flex", gap: 12, marginTop: 8, fontSize: 10.5, fontWeight: 700, color: C.mut, flexWrap: "wrap" } }, items.map(function (x, i) { return __h("span", { key: i, style: { display: "inline-flex", alignItems: "center", gap: 5 } }, __h("span", { style: { width: 9, height: 9, borderRadius: 2, background: x[1] } }), " " + x[0]); })); }

  /** everything the coal pages compute, from one expense/coal answer */
  function __coalModel(d) {
    var gst = d.gst || 1.18;
    var qs = (d.qualities || []).map(function (q, i) { return Object.assign({}, q, { c: __QC[i % __QC.length] }); });
    var qmap = {}; qs.forEach(function (q) { qmap[q.id] = q; });
    var reg = {}; (d.register || []).forEach(function (r) { reg[r.date] = r; });
    var prod = d.production || {};
    var M = {
      gst: gst, qs: qs, reg: reg, steam: d.steam || {}, dyeP: prod.dye || {}, stnP: prod.stn || {},
      mdays: __dates(d.month_from, d.to), all: __dates(d.from, d.to), today: d.today || TODAY,
      q: function (id) { return qmap[id] || { id: id, label: String(id).replace("|", " · "), c: "#94a3b8", eff: 5 }; },
      side: function (dt, s) { var r = reg[dt]; return r ? (r[s] || []) : []; },
    };
    M.kg = function (dt, s) { return M.side(dt, s).reduce(function (a, m) { return a + __n(m.kg); }, 0); };
    M.cost = function (dt, s) { return M.side(dt, s).reduce(function (a, m) { return a + __n(m.amount); }, 0); };
    M.st = function (dt) { var e = M.steam[dt]; return e && __n(e.kg) > 0 ? __n(e.kg) : null; };
    M.dye = function (dt) { var p = M.dyeP[dt]; return p ? __n(p.mtr) : 0; };
    M.stn = function (dt) { return __n(M.stnP[dt]); };
    M.mix = function (dt) {   // FBC day mix in the FbcMixTable shape (rates ex-GST so t × rate = cost)
      return M.side(dt, "fbc").map(function (m) { var q = M.q(m.q); return { id: m.q, label: q.label, c: q.c, sup: "", lot: "", t: __n(m.kg) / 1000, rate: Math.round(__n(m.rate_t) / gst), cost: __n(m.amount) }; });
    };
    M.sum = function (days, s) { var t = 0, c = 0; days.forEach(function (dt) { t += M.kg(dt, s); c += M.cost(dt, s); }); return { kg: t, cost: c }; };
    return M;
  }

  function LiveCoalHub({ mobile, ym, onBack, bill }) {
    const [page, setPage] = useState("sum");
    const [d, setD] = useState(null);
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let alive = true; setD(null);
      __api("expense/coal", { month: ym, history: 60 }).then(function (r) { if (alive) setD(r); });
      return () => { alive = false; };
    }, [ym, tick]);
    const back = React.createElement("div", { style: { marginBottom: 2 } }, React.createElement(ExpBack, { onBack }));
    if (!d) return React.createElement("div", null, back, __title("Coal — Boiler + Thermopack", mobile), __loadingBox());
    if (!d.success || !d.data) return React.createElement("div", null, back, __title("Coal — Boiler + Thermopack", mobile), __errBox("Coal could not be read from Mills — " + (d.message || "") + (d.data && d.data.errors ? " · " + d.data.errors.join(" | ") : "")));
    const data = d.data;
    const M = __coalModel(data);
    const billAmt = data.billing ? __n(data.billing.amount) : (bill || 0);
    const patchSteam = (dt, entry) => { const nd = JSON.parse(JSON.stringify(d)); if (!nd.data.steam || Array.isArray(nd.data.steam)) nd.data.steam = {}; if (entry) nd.data.steam[dt] = entry; else delete nd.data.steam[dt]; setD(nd); };
    const props = { mobile, data, M, bill: billAmt, go: setPage, reload: () => setTick(tick + 1), patchSteam };
    if (page === "fbc") return React.createElement(LiveFbc, Object.assign({ onBack: () => setPage("sum") }, props));
    if (page === "tpk") return React.createElement(LiveTpk, Object.assign({ onBack: () => setPage("sum") }, props));
    if (page === "opt") return React.createElement(LiveOptimiser, Object.assign({ onBack: () => setPage("fbc") }, props));
    return React.createElement(LiveCoalSum, Object.assign({ onBack }, props));
  }

  function LiveCoalSum({ mobile, data, M, bill, go, onBack, reload }) {
    const [sel, setSel] = useState(null);
    const [mode, setMode] = useState("t");
    const [busy, setBusy] = useState(null);
    const [msg, setMsg] = useState(null);
    const days = M.mdays;
    const nDays = days.length || 1;
    const fbcT = days.map((dt) => M.kg(dt, "fbc") / 1000), tpkT = days.map((dt) => M.kg(dt, "tpk") / 1000);
    const fbcC = days.map((dt) => M.cost(dt, "fbc")), tpkC = days.map((dt) => M.cost(dt, "tpk"));
    const F = M.sum(days, "fbc"), T = M.sum(days, "tpk");
    const tot = F.cost + T.cost, totT = (F.kg + T.kg) / 1000;
    const ent = days.filter((dt) => M.st(dt) != null);
    const eKg = ent.reduce((a, dt) => a + M.st(dt), 0), eCost = ent.reduce((a, dt) => a + M.cost(dt, "fbc"), 0);
    const pct = (x) => (bill ? (x / bill * 100).toFixed(1) + "% OF BILLING" : "BILLING NOT FOUND");
    const tons = mode === "t";
    const canSplit = __can("expense.coal_steam_entry:edit");
    const goCard = (label, sub, chips, page, accent, ok) => React.createElement("div", { onClick: () => { if (ok === false) __post({ type: "toast", text: "No rights for " + label }); else go(page); }, style: { background: C.card, border: "1px solid " + C.line, borderLeft: "4px solid " + accent, borderRadius: 14, padding: "12px 14px", cursor: "pointer" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, React.createElement("span", { style: { fontFamily: "DM Serif Display, serif", fontSize: 15.5, color: C.ink } }, label), React.createElement("span", { style: { color: C.mut, fontSize: 15 } }, "›")),
      React.createElement("div", { style: { fontSize: 11.5, color: C.mut, marginTop: 2 } }, sub),
      React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 } }, chips));
    const flip = (s) => {
      setBusy(s.key); setMsg(null);
      __api("expense/coal/split/save", { split: { [s.key]: s.side === "fbc" ? "tpk" : "fbc" } }).then(function (r) {
        setBusy(null);
        if (r && r.success) reload(); else setMsg({ ok: false, text: (r && r.message) || "Could not save." });
      });
    };
    const qrows = M.qs.map((q) => { let kg = 0, c = 0, fk = 0, tk = 0; days.forEach((dt) => { ["fbc", "tpk"].forEach((s) => M.side(dt, s).forEach((m) => { if (m.q === q.id) { kg += __n(m.kg); c += __n(m.amount); if (s === "fbc") fk += __n(m.kg); else tk += __n(m.kg); } })); }); return { q, kg, c, fk, tk }; }).filter((x) => x.kg > 0);
    return React.createElement("div", null, React.createElement(ExpBack, { onBack }),
      __title("Coal — Boiler + Thermopack", mobile, React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, React.createElement(Chip, { text: data.month + " · " + data.days + " DAYS" }), React.createElement(Chip, { text: pct(tot), bg: C.amberSoft, fg: C.amber }))),
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: "Combined Coal", value: inr(tot), sub: totT.toFixed(1) + " t this month · ex-GST", accent: C.ink }),
        React.createElement(Kpi, { key: "b", mobile, label: "Boiler / Day", value: (F.kg / 1000 / nDays).toFixed(1) + " t", sub: inr(F.cost / nDays) + " per day", accent: C.amber }),
        React.createElement(Kpi, { key: "c", mobile, label: "Thermopack / Day", value: (T.kg / 1000 / nDays).toFixed(1) + " t", sub: inr(T.cost / nDays) + " per day", accent: "#fb923c" }),
        React.createElement(Kpi, { key: "d", mobile, label: "Combined / Day", value: (totT / nDays).toFixed(1) + " t", sub: inr(tot / nDays) + " per day", accent: C.teal })]),
      __gap(React.createElement(Section, { title: "Daily coal — combined", right: React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" } }, React.createElement(ExpTab, { text: "TONS", act: tons, onClick: () => setMode("t") }), React.createElement(ExpTab, { text: "₹ / DAY", act: !tons, onClick: () => setMode("c") })) },
        tot > 0 ? React.createElement(ExpStack, { a: tons ? fbcT : fbcC, b: tons ? tpkT : tpkC, sel, onPick: setSel, ca: "#f59e0b", cb: "#fb923c", h: 110, mobile, labels: __ticks(days),
          fmtv: (i) => __dl(days[i]) + " — " + (tons ? (fbcT[i] + tpkT[i]).toFixed(1) + " t · boiler " + fbcT[i].toFixed(1) + " + thermopack " + tpkT[i].toFixed(1) : inr(fbcC[i] + tpkC[i]) + " · boiler " + inr(fbcC[i]) + " + thermopack " + inr(tpkC[i])) })
          : React.createElement("div", { style: { fontSize: 12, color: C.mut } }, "No coal issued from the store in this month."),
        __legend([["FBC BOILER", "#f59e0b"], ["THERMOPACK", "#fb923c"]]))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 12 } },
        goCard("FBC Boiler — steam raising", "Serves jet dyeing · daily steam entry · coal to steam costing", [
          React.createElement(Chip, { key: "a", text: (F.kg / 1000).toFixed(1) + " T", bg: C.amberSoft, fg: C.amber }), React.createElement(Chip, { key: "b", text: inr(F.cost), bg: C.amberSoft, fg: C.amber }),
          React.createElement(Chip, { key: "c", text: eKg ? "STEAM ₹" + (eCost / eKg).toFixed(2) + "/KG" : "STEAM PENDING", bg: C.tealSoft, fg: C.teal })], "fbc", "#f59e0b"),
        goCard("Thermopack — thermic oil", "Serves stenter range · day-wise coal and cost", [
          React.createElement(Chip, { key: "a", text: (T.kg / 1000).toFixed(1) + " T", bg: C.amberSoft, fg: C.amber }), React.createElement(Chip, { key: "b", text: inr(T.cost), bg: C.amberSoft, fg: C.amber })], "tpk", "#fb923c")),
      React.createElement("div", { onClick: () => { if (__can("expense.coal_optimiser")) go("opt"); else __post({ type: "toast", text: "No rights for Coal Mix Optimiser" }); }, style: { marginTop: 12, background: C.tealSoft, border: "1px solid #99f6e4", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } },
        React.createElement("div", null, React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 15.5, color: C.teal } }, "Coal Mix Optimiser"), React.createElement("div", { style: { fontSize: 11.5, color: C.slate, marginTop: 2 } }, "Lowest-cost mixes from day-wise offers, ranked on measured steam per ton — not price per ton")),
        React.createElement("span", { style: { color: C.teal, fontSize: 18 } }, "›")),
      __gap(React.createElement(Section, { title: "By main item + make", right: React.createElement(Chip, { text: qrows.length + " COALS" }), pad: false },
        qrows.length ? qrows.map((x) => __rowBtn(x.q.id, null, x.q.label, inr(x.c) + "  " + (x.kg / 1000).toFixed(1) + " t",
          "FBC " + (x.fk / 1000).toFixed(1) + " t · Thermopack " + (x.tk / 1000).toFixed(1) + " t · avg ₹" + fm(Math.round(x.kg ? x.c / (x.kg / 1000) : 0)) + "/t ex-GST" + (x.q.gar ? " · " + x.q.gar + " GAR" : ""), tot ? x.c / tot * 100 : null, x.q.c))
          : React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No coal items issued."))),
      __gap(React.createElement(Section, { title: "FBC ↔ Thermopack — by machine / department", right: React.createElement(Chip, { text: canSplit ? "TAP TO SWITCH" : "FROM ISSUES", bg: C.indigoSoft, fg: C.indigoDark }), pad: false },
        (data.split || []).length ? (data.split || []).map((s) => {
          const lbl = [s.mac ? "M/c " + s.mac + (s.mac_name ? " " + s.mac_name : "") : "", s.dpt ? "Dept " + s.dpt + (s.dpt_name ? " " + s.dpt_name : "") : "", s.issto ? "to " + s.issto : ""].filter(Boolean).join(" · ") || "No machine / department on the issue";
          return React.createElement("div", { key: s.key, onClick: canSplit ? () => flip(s) : undefined, style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 14px", borderTop: "1px solid " + C.line, cursor: canSplit ? "pointer" : "default" } },
            React.createElement("div", { style: { minWidth: 0 } }, React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink } }, lbl), React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 2 } }, __t1(s.kg) + " t · " + s.issues + " issues · " + (s.basis === "set" ? "set by you" : s.basis === "name" ? "from the name" : "no boiler word → FBC"))),
            React.createElement(Chip, { text: busy === s.key ? "…" : s.side === "tpk" ? "THERMOPACK" : "FBC BOILER", bg: s.side === "tpk" ? "#fff7ed" : C.amberSoft, fg: s.side === "tpk" ? "#c2410c" : C.amber }));
        }) : React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No coal issues in this month."),
        msg ? React.createElement("div", { style: { padding: "0 14px 10px" } }, __msg(msg)) : null)),
      __note("Source: " + (data.source || "store issues") + ". " + (data.rule || "") + (data.billing ? " · Billing " + inr(__n(data.billing.amount)) + " from " + (data.billing.source || "DAPOutI") : "") + "."));
  }

  function LiveFbc({ mobile, data, M, bill, go, onBack, patchSteam }) {
    const days = M.mdays;
    const lastOk = days.filter((dt) => dt <= M.today);
    const defDay = (() => { const y = new Date(M.today + "T00:00:00"); y.setDate(y.getDate() - 1); const ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0"); return lastOk.indexOf(ys) >= 0 ? ys : (lastOk[lastOk.length - 1] || days[0]); })();
    const [sel, setSel] = useState(null);
    const [mode, setMode] = useState("perkg");
    const [eDay, setEDay] = useState(defDay);
    const e0 = M.steam[defDay] || {};
    const [kgIn, setKgIn] = useState(e0.kg != null ? String(e0.kg) : "");
    const [condIn, setCondIn] = useState(e0.cond != null ? String(e0.cond) : "");
    const [tempIn, setTempIn] = useState(e0.temp != null ? String(e0.temp) : "");
    const [rmIn, setRmIn] = useState(e0.remark || "");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const canSee = __can("expense.coal_steam_entry"), canEdit = __can("expense.coal_steam_entry:edit");
    const pick = (dt) => { const e = M.steam[dt] || {}; setEDay(dt); setKgIn(e.kg != null ? String(e.kg) : ""); setCondIn(e.cond != null ? String(e.cond) : ""); setTempIn(e.temp != null ? String(e.temp) : ""); setRmIn(e.remark || ""); setMsg(null); };
    const save = () => {
      const kg = Number(kgIn);
      if (!(kg > 0)) { setMsg({ ok: false, text: "Enter the steam generated in kg." }); return; }
      setBusy(true); setMsg(null);
      __api("expense/coal/steam/save", { date: eDay, steam_kg: kg, cond_l: condIn === "" ? null : Number(condIn), feed_temp: tempIn === "" ? null : Number(tempIn), remark: rmIn }).then(function (r) {
        setBusy(false);
        if (r && r.success && r.data) { patchSteam(eDay, r.data.entry || { kg: kg, cond: condIn === "" ? null : Number(condIn), temp: tempIn === "" ? null : Number(tempIn), remark: rmIn }); setMsg({ ok: true, text: (r.message || "Saved") + " — costing, performance and optimiser updated." }); }
        else setMsg({ ok: false, text: (r && r.message) || "Could not save." });
      });
    };
    const del = () => { setBusy(true); __api("expense/coal/steam/delete", { date: eDay }).then(function (r) { setBusy(false); if (r && r.success) { patchSteam(eDay, null); pick(eDay); setKgIn(""); setMsg({ ok: true, text: "Entry removed." }); } else setMsg({ ok: false, text: (r && r.message) || "Could not remove." }); }); };

    const ent = days.filter((dt) => M.st(dt) != null);
    const F = M.sum(days, "fbc");
    const eCoal = ent.reduce((a, dt) => a + M.kg(dt, "fbc"), 0) / 1000;
    const eCost = ent.reduce((a, dt) => a + M.cost(dt, "fbc"), 0);
    const eKg = ent.reduce((a, dt) => a + M.st(dt), 0);
    const steamT = eKg / 1000, perKgM = eKg ? eCost / eKg : 0, effM = eCoal ? steamT / eCoal : 0;
    const qAgg = M.qs.map((q) => { let t = 0, cost = 0, rMin = Infinity, rMax = 0; ent.forEach((dt) => M.mix(dt).forEach((m) => { if (m.id === q.id) { t += m.t; cost += m.cost; rMin = Math.min(rMin, m.rate); rMax = Math.max(rMax, m.rate); } })); return { id: q.id, label: q.label, c: q.c, t, cost, rAvg: t ? cost / t : 0, rMin: t ? rMin : 0, rMax }; }).filter((x) => x.t > 0);
    const perKgD = ent.map((dt) => M.cost(dt, "fbc") / M.st(dt)), steamD = ent.map((dt) => M.st(dt) / 1000);
    const lineCfg = { perkg: { vals: perKgD, ix: ent, color: C.indigo, f: (v) => "₹" + v.toFixed(2) + " / kg steam" }, steam: { vals: steamD, ix: ent, color: C.teal, f: (v) => v.toFixed(1) + " t steam" },
      coal: { vals: days.map((dt) => M.kg(dt, "fbc") / 1000), ix: days, color: "#f59e0b", f: (v) => v.toFixed(1) + " t coal" }, cost: { vals: days.map((dt) => M.cost(dt, "fbc")), ix: days, color: C.rose, f: (v) => inr(v) + " coal cost" } }[mode];
    const chartSel = sel == null ? null : lineCfg.ix.indexOf(sel) >= 0 ? lineCfg.ix.indexOf(sel) : null;
    const usedQ = M.qs.filter((q) => days.some((dt) => M.side(dt, "fbc").some((m) => m.q === q.id)));
    const mixSeries = usedQ.map((q) => ({ c: q.c, vals: days.map((dt) => M.side(dt, "fbc").filter((m) => m.q === q.id).reduce((a, m) => a + __n(m.kg) / 1000, 0)) }));
    // the daily report coal / steam block for the entry day
    const eMix = M.mix(eDay), eT = M.kg(eDay, "fbc"), eC = M.cost(eDay, "fbc");
    const kgNum = Number(kgIn), saved = M.st(eDay) != null;
    const tilKg = days.filter((dt) => dt <= eDay && M.st(dt) != null).reduce((a, dt) => a + M.st(dt), 0), tilC = days.filter((dt) => dt <= eDay && M.st(dt) != null).reduce((a, dt) => a + M.cost(dt, "fbc"), 0);
    const effect = (kg, cond, temp) => {
      const rows = [];
      rows.push(React.createElement(ExpKV, { key: "a", k: "Coal (FBC) — from store", v: fm(Math.round(eT)) + " kg = " + (eT / 1000).toFixed(2) + " t" }));
      rows.push(React.createElement(ExpKV, { key: "b", k: "Coal amount (÷ " + M.gst + " GST)", v: inr(eC), strong: true }));
      if (M.dye(eDay)) rows.push(React.createElement(ExpKV, { key: "c", k: "Coal cost / m (dyeing " + fm(Math.round(M.dye(eDay))) + " m)", v: "₹" + (eC / M.dye(eDay)).toFixed(2) }));
      if (kg > 0) {
        rows.push(React.createElement(ExpKV, { key: "d", k: "Steam generation", v: fm(Math.round(kg)) + " kg = " + (kg / 1000).toFixed(1) + " t" }));
        rows.push(React.createElement(ExpKV, { key: "e", k: "Ratio (kg steam / kg coal)", v: eT ? (kg / eT).toFixed(2) : "—" }));
        rows.push(React.createElement(ExpKV, { key: "f", k: "Steam cost (coal ÷ steam)", v: eT ? "₹" + (eC / kg).toFixed(2) + " / kg" : "—", strong: true, accent: C.teal }));
        if (cond > 0) rows.push(React.createElement(ExpKV, { key: "g", k: "Condensate recovery", v: fm(Math.round(cond)) + " L · " + (cond / kg * 100).toFixed(1) + "% of steam" }));
        if (temp > 0) rows.push(React.createElement(ExpKV, { key: "h", k: "Feed-water tank temp.", v: temp + " °C" }));
        const tk = tilKg + (saved ? 0 : kg), tc = tilC + (saved ? 0 : eC);
        if (tk) rows.push(React.createElement(ExpKV, { key: "i", k: "Average steam cost till date", v: "₹" + (tc / tk).toFixed(2) + " / kg" }));
      }
      if (M.kg(eDay, "tpk")) rows.push(React.createElement(ExpKV, { key: "j", k: "Thermopack coal (same day)", v: fm(Math.round(M.kg(eDay, "tpk"))) + " kg · " + inr(M.cost(eDay, "tpk")) }));
      const gars = eMix.map((m) => M.q(m.id).gar).filter(Boolean);
      if (gars.length) rows.push(React.createElement(ExpKV, { key: "k", k: "Coal type GAR", v: gars.join(", ") }));
      return React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", columnGap: 26, marginTop: 8 } }, rows);
    };
    const dayOpts = (lastOk.length ? lastOk : days).slice().reverse().map((dt) => [dt, __dl(dt) + (M.st(dt) != null ? " ✓" : "")]);
    return React.createElement("div", null, React.createElement(ExpBack, { onBack, label: "COAL" }),
      __title("FBC Boiler — Steam", mobile, React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, React.createElement(Chip, { text: "COAL AUTO FROM STORE", bg: C.indigoSoft, fg: C.indigoDark }), React.createElement(Chip, { text: "ONLY STEAM IS MANUAL", bg: C.amberSoft, fg: C.amber }))),
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: "Coal Cost", value: inr(F.cost), sub: (F.kg / 1000).toFixed(1) + " t · " + (bill ? (F.cost / bill * 100).toFixed(1) + "% of billing" : "billing not found"), accent: C.amber }),
        React.createElement(Kpi, { key: "b", mobile, label: "Steam Raised", value: fm(Math.round(steamT)) + " t", sub: ent.length + " of " + days.length + " days entered", accent: C.teal }),
        React.createElement(Kpi, { key: "c", mobile, label: "Steam Cost", value: eKg ? "₹" + perKgM.toFixed(2) + "/kg" : "—", sub: "on entered days", accent: C.ink }),
        React.createElement(Kpi, { key: "d", mobile, label: "Efficiency", value: eKg ? effM.toFixed(2) : "—", sub: "kg steam per kg coal", accent: C.indigo })]),
      canSee ? __gap(React.createElement(Section, { title: "Daily steam entry", right: React.createElement(Chip, { text: "THE ONLY MANUAL INPUT", bg: C.amberSoft, fg: C.amber }) },
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
          __sel(eDay, pick, dayOpts),
          canEdit ? [__h("span", { key: "l1", style: { fontSize: 11, color: C.mut } }, "STEAM"), __h("span", { key: "i1" }, __inp(kgIn, setKgIn, "Steam kg", 110)),
            __h("span", { key: "u1", style: { fontSize: 12, color: C.mut } }, kgNum > 0 ? "= " + (kgNum / 1000).toFixed(1) + " t" : "kg")] : null),
        canEdit ? React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 } },
          __h("span", { style: { fontSize: 11, color: C.mut } }, "CONDENSATE"), __inp(condIn, setCondIn, "Litres", 96),
          __h("span", { style: { fontSize: 11, color: C.mut } }, "FEED WATER"), __inp(tempIn, setTempIn, "°C", 64),
          __inp(rmIn, setRmIn, "Remark", mobile ? 140 : 200, "text"),
          __btn(saved ? "UPDATE" : "SAVE", save, null, busy), saved ? __btn("REMOVE", del, "line", false) : null) : null,
        React.createElement("div", { style: { marginTop: 10, background: "#fbfcff", border: "1px solid " + C.line, borderRadius: 10, padding: "9px 12px" } },
          React.createElement("div", { style: { fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: C.mut } }, "COAL ISSUED " + __dl(eDay).toUpperCase() + " — PULLED FROM STORE ISSUES"),
          eMix.length ? eMix.map((m, mi) => React.createElement("div", { key: mi, style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: C.slate, padding: "4px 0", borderBottom: mi < eMix.length - 1 ? "1px dashed " + C.line : "none", flexWrap: "wrap" } },
            React.createElement("span", null, React.createElement("span", { style: { display: "inline-block", width: 7, height: 7, borderRadius: 2, background: m.c, marginRight: 6 } }), m.label),
            React.createElement("span", { style: { fontWeight: 700, color: C.ink } }, m.t.toFixed(2) + " t @ ₹" + fm(m.rate) + " = " + inr(m.cost))))
            : React.createElement("div", { style: { fontSize: 11.5, color: C.amber, padding: "4px 0", fontWeight: 700 } }, "No FBC coal issued on this day."),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 800, color: C.ink, marginTop: 5 } }, React.createElement("span", null, "Total issued"), React.createElement("span", null, (eT / 1000).toFixed(2) + " t · " + inr(eC)))),
        effect(saved && !canEdit ? M.st(eDay) : kgNum, condIn === "" ? __n((M.steam[eDay] || {}).cond) : Number(condIn), tempIn === "" ? __n((M.steam[eDay] || {}).temp) : Number(tempIn)),
        saved ? React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: C.green, marginTop: 8 } }, "Entered " + fm(M.st(eDay)) + " kg" + (eT ? " → " + (M.st(eDay) / eT).toFixed(2) + " kg steam / kg coal · ₹" + (eC / M.st(eDay)).toFixed(2) + "/kg" : "") + ((M.steam[eDay] || {}).at ? " · saved " + M.steam[eDay].at : ""))
          : React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: C.amber, marginTop: 8 } }, canEdit ? "Steam not yet entered for this day — costing stays pending until it is." : "Steam not entered for this day (no right to enter steam)."),
        __msg(msg))) : null,
      React.createElement("div", { onClick: () => { if (__can("expense.coal_optimiser")) go("opt"); else __post({ type: "toast", text: "No rights for Coal Mix Optimiser" }); }, style: { marginTop: 12, background: C.tealSoft, border: "1px solid #99f6e4", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } },
        React.createElement("div", null, React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: 15.5, color: C.teal } }, "Coal Mix Optimiser"), React.createElement("div", { style: { fontSize: 11.5, color: C.slate, marginTop: 2 } }, "5 lowest-cost mixes from day-wise offers, ranked on measured steam per ton — not price per ton")),
        React.createElement("span", { style: { color: C.teal, fontSize: 18 } }, "›")),
      __gap(React.createElement(Section, { title: "Month coal mix — by main item + make", right: React.createElement(Chip, { text: "ENTERED DAYS", bg: C.indigoSoft, fg: C.indigoDark }) },
        qAgg.length ? React.createElement(FbcMixTable, { entries: qAgg, tot: { t: eCoal, cost: eCost, steam: steamT || null, perKg: perKgM }, mobile }) : React.createElement("div", { style: { fontSize: 12, color: C.mut } }, "Enter daily steam — the mix table uses the days that have steam."))),
      __gap(React.createElement(Section, { title: "Daily trend", right: React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" } }, React.createElement(ExpTab, { text: "₹/KG", act: mode === "perkg", onClick: () => setMode("perkg") }), React.createElement(ExpTab, { text: "STEAM", act: mode === "steam", onClick: () => setMode("steam") }), React.createElement(ExpTab, { text: "COAL", act: mode === "coal", onClick: () => setMode("coal") }), React.createElement(ExpTab, { text: "COST", act: mode === "cost", onClick: () => setMode("cost") })) },
        lineCfg.vals.length ? React.createElement(ExpLine, { vals: lineCfg.vals, sel: chartSel, onPick: (k) => setSel(chartSel === k ? null : lineCfg.ix[k]), color: lineCfg.color, h: 116, mobile, fmtv: lineCfg.f, labels: __ticks(lineCfg.ix), lblOf: (k) => __dl(lineCfg.ix[k]) })
          : React.createElement("div", { style: { fontSize: 12, color: C.mut } }, "No steam entered yet in this month."))),
      mixSeries.length ? __gap(React.createElement(Section, { title: "Daily coal mix" },
        React.createElement(ExpStackN, { series: mixSeries, sel: sel == null ? null : days.indexOf(sel), onPick: (i) => setSel(i == null ? null : days[i]), h: 100, mobile, labels: __ticks(days), fmtv: (i) => __dl(days[i]) + " — " + (M.kg(days[i], "fbc") / 1000).toFixed(1) + " t · " + M.mix(days[i]).map((m) => m.label + " " + m.t.toFixed(1)).join(" + ") }),
        __legend(usedQ.map((q) => [q.label.toUpperCase(), q.c])))) : null,
      __gap(React.createElement(Section, { title: "Day-wise register", right: React.createElement(Chip, { text: "TAP A DAY", bg: C.indigoSoft, fg: C.indigoDark }), pad: false },
        React.createElement("div", { style: { padding: "0 4px" } }, days.filter((dt) => M.kg(dt, "fbc") > 0 || M.st(dt) != null).map((dt) => React.createElement(LiveFbcDay, { key: dt, dt, M, mobile, open: sel === dt, onToggle: () => setSel(sel === dt ? null : dt) }))))),
      __note("Workflow: the store issues coal against the boiler (date, main item, make, qty, rate) → you enter one number a day, the steam from the boiler software (plus condensate and feed-water temperature) → costing, performance and the optimiser update on their own. Rates shown ex-GST (store rate ÷ " + M.gst + "). Dyeing production: " + (data.production && data.production.dye_basis ? data.production.dye_basis.database + " " + data.production.dye_basis.metres + " (" + data.production.dye_basis.process + ")" : "not found") + "."));
  }

  function LiveFbcDay({ dt, M, mobile, open, onToggle }) {
    const t = M.kg(dt, "fbc") / 1000, cost = M.cost(dt, "fbc"), kg = M.st(dt), e = M.steam[dt] || {};
    const steamT = kg != null ? kg / 1000 : null, perKg = kg ? cost / kg : null, mix = M.mix(dt), dye = M.dye(dt);
    return React.createElement("div", { style: { borderTop: "1px solid " + C.line } },
      React.createElement("div", { onClick: onToggle, style: { display: "grid", gridTemplateColumns: mobile ? "52px 1fr 1fr 62px 16px" : "70px 1fr 1fr 90px 16px", gap: 8, alignItems: "center", padding: "9px 4px", cursor: "pointer", background: open ? "#fbfcff" : "transparent" } },
        React.createElement("span", { style: { fontSize: 11.5, fontWeight: 800, color: C.ink } }, __dl(dt)),
        React.createElement("span", { style: { fontSize: 12, color: C.slate } }, t.toFixed(1) + " t · " + mix.length + " " + (mix.length > 1 ? "coals" : "coal")),
        steamT != null ? React.createElement("span", { style: { fontSize: 12, color: C.slate } }, steamT.toFixed(1) + " t steam") : React.createElement("span", { style: { fontSize: 11.5, fontWeight: 800, color: C.amber } }, "steam pending"),
        React.createElement("span", { style: { fontSize: 12, fontWeight: 800, color: perKg != null && t ? C.teal : C.mut, textAlign: "right" } }, perKg != null && t ? "₹" + perKg.toFixed(2) + "/kg" : "—"),
        React.createElement("span", { style: { color: C.mut, fontSize: 12, textAlign: "right" } }, open ? "▾" : "▸")),
      open ? React.createElement("div", { style: { padding: "2px 8px 12px", background: "#fbfcff" } },
        mix.length ? React.createElement(FbcMixTable, { entries: mix, tot: { t, cost, steam: steamT, perKg: perKg || 0 }, mobile, dateLbl: __dl(dt) }) : null,
        steamT != null ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", columnGap: 26, marginTop: 8 } },
          React.createElement(ExpKV, { k: "Steam generated (entered)", v: fm(kg) + " kg = " + steamT.toFixed(1) + " t", strong: true }),
          React.createElement(ExpKV, { k: "Steam generation efficiency", v: t ? (steamT / t).toFixed(2) + " kg steam / kg coal" : "—" }),
          React.createElement(ExpKV, { k: "Condensate recovered", v: e.cond != null ? fm(Math.round(e.cond)) + " L · " + (e.cond / kg * 100).toFixed(1) + "%" : "—" }),
          React.createElement(ExpKV, { k: "Feed-water temperature", v: e.temp != null ? e.temp + " °C" : "—" }),
          React.createElement(ExpKV, { k: "Steam cost per m (day)", v: dye ? permM(cost, dye) + " on " + fm(Math.round(dye)) + " m dyed" : "dyeing production not found" }),
          e.remark ? React.createElement(ExpKV, { k: "Remark", v: e.remark }) : null)
          : React.createElement("div", { style: { fontSize: 11.5, color: C.amber, fontWeight: 700, marginTop: 8 } }, "Coal issues are in from the store — enter the day steam in Daily steam entry above to complete the costing.")) : null);
  }

  function LiveTpk({ mobile, data, M, bill, onBack }) {
    const [sel, setSel] = useState(null);
    const days = M.mdays, n = days.length || 1;
    const T = M.sum(days, "tpk");
    const vals = days.map((dt) => M.kg(dt, "tpk") / 1000);
    const stnM = days.reduce((a, dt) => a + M.stn(dt), 0);
    const billM = data.billing && data.billing.mtr ? __n(data.billing.mtr) : 0;
    const heat = stnM ? permM(T.cost, stnM) : billM ? permM(T.cost, billM) : "—";
    return React.createElement("div", null, React.createElement(ExpBack, { onBack, label: "COAL" }),
      __title("Thermopack — Thermic Oil", mobile, React.createElement(Chip, { text: data.month })),
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: "Coal Cost", value: inr(T.cost), sub: (T.kg / 1000).toFixed(1) + " t this month · " + (bill ? (T.cost / bill * 100).toFixed(1) + "% of billing" : "ex-GST"), accent: C.amber }),
        React.createElement(Kpi, { key: "b", mobile, label: "Coal / Day", value: (T.kg / 1000 / n).toFixed(1) + " t", sub: inr(T.cost / n) + " per day", accent: "#fb923c" }),
        React.createElement(Kpi, { key: "c", mobile, label: "Heat Cost", value: heat, sub: stnM ? "per stenter m (" + fm(Math.round(stnM)) + " m)" : billM ? "per billed m" : "enter stenter production", accent: C.teal }),
        React.createElement(Kpi, { key: "d", mobile, label: "Serves", value: "Stenters", sub: "thermic oil for the finishing range", accent: C.indigo })]),
      __gap(React.createElement(Section, { title: "Daily thermopack coal", right: React.createElement(Chip, { text: "TAP A DAY", bg: C.indigoSoft, fg: C.indigoDark }) },
        T.kg > 0 ? [
          sel != null ? React.createElement("div", { key: "s", style: { fontSize: 11.5, fontWeight: 700, color: C.slate, marginBottom: 6 } }, __dl(days[sel]) + " — " + vals[sel].toFixed(2) + " t coal · " + inr(M.cost(days[sel], "tpk"))) : null,
          React.createElement(ExpBars, { key: "b", vals, sel, onPick: (i) => setSel(sel === i ? null : i), color: "#fb923c", h: 110, mobile, labels: __ticks(days) })]
          : React.createElement("div", { style: { fontSize: 12, color: C.mut } }, "No coal issued to the thermopack in this month — check the machine / department split on the Coal page."),
        React.createElement("div", { style: { marginTop: 6 } }, days.filter((dt) => M.kg(dt, "tpk") > 0).map((dt) => {
          const c = M.cost(dt, "tpk"), sp = M.stn(dt), i = days.indexOf(dt), mix = M.side(dt, "tpk");
          return React.createElement("div", { key: dt, style: { borderTop: "1px solid " + C.line } },
            React.createElement("div", { onClick: () => setSel(sel === i ? null : i), style: { display: "grid", gridTemplateColumns: "56px 1fr 1fr 16px", gap: 8, alignItems: "center", padding: "9px 4px", cursor: "pointer", background: sel === i ? "#fbfcff" : "transparent" } },
              React.createElement("span", { style: { fontSize: 11.5, fontWeight: 800, color: C.ink } }, __dl(dt)), React.createElement("span", { style: { fontSize: 12, color: C.slate } }, (M.kg(dt, "tpk") / 1000).toFixed(2) + " t coal"),
              React.createElement("span", { style: { fontSize: 12, color: C.slate } }, inr(c)), React.createElement("span", { style: { color: C.mut, fontSize: 12, textAlign: "right" } }, sel === i ? "▾" : "▸")),
            sel === i ? React.createElement("div", { style: { padding: "4px 8px 12px", background: "#fbfcff" } },
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", columnGap: 26 } },
                mix.map((m, k) => React.createElement(ExpKV, { key: k, k: M.q(m.q).label, v: __t1(m.kg) + " t @ ₹" + fm(Math.round(__n(m.rate_t) / M.gst)) + "/t = " + inr(m.amount) })),
                React.createElement(ExpKV, { k: "Coal cost", v: inr(c), strong: true }),
                React.createElement(ExpKV, { k: "Serves", v: "Thermic oil — stenter range" }),
                React.createElement(ExpKV, { k: "Heat cost per m (day)", v: sp ? permM(c, sp) + " on " + fm(Math.round(sp)) + " m" : "stenter production not entered" }))) : null);
        })))),
      __note("Stenter production comes from the Electricity → Daily entry (production m on the stenter meters)."));
  }

  /* ───────── Coal Mix Optimiser — measured performance from steam entries + live offers ───────── */
  function LiveOptimiser({ mobile, data, M, onBack }) {
    const days = M.mdays;
    const defDay = days.indexOf(M.today) >= 0 ? M.today : days[days.length - 1];
    const [day, setDay] = useState(defDay);
    const [o, setO] = useState(null);
    const [cons, setCons] = useState(null);
    const [target, setTarget] = useState("");
    const [eff, setEff] = useState({});
    const [form, setForm] = useState({ q: "", s: "", r: "", a: "" });
    const [addingSup, setAddingSup] = useState(false);
    const [newSup, setNewSup] = useState("");
    const [openR, setOpenR] = useState(null);
    const [openP, setOpenP] = useState(null);
    const [busy, setBusy] = useState(null);
    const [msg, setMsg] = useState(null);
    const [tick, setTick] = useState(0);
    const canEdit = __can("expense.coal_optimiser:edit");
    useEffect(() => {
      let alive = true; setO(null);
      __api("expense/coal/offers", { date: day }).then(function (r) {
        if (!alive) return;
        setO(r);
        if (r && r.success && r.data) {
          if (cons == null) setCons(r.data.constraints && !Array.isArray(r.data.constraints) ? r.data.constraints : {});
          if (target === "" && r.data.target_t != null) setTarget(String(r.data.target_t));
          if (r.data.eff && !Array.isArray(r.data.eff)) setEff(r.data.eff);
        }
      });
      return () => { alive = false; };
    }, [day, tick]);

    // qualities = coals seen in the history (FBC side) + coals named in offers
    const offers = o && o.success && o.data ? (o.data.offers || []).filter((x) => x.date === day) : [];
    const Q = M.qs.filter((q) => __n(q.fbc_kg) > 0 || offers.some((x) => x.q === q.id)).map((q) => Object.assign({}, q));
    offers.forEach((x) => { if (!Q.some((q) => q.id === x.q)) Q.push(Object.assign({}, M.q(x.q))); });
    Q.forEach((q) => { if (eff[q.id] > 0) q.eff = Number(eff[q.id]); });
    const qOf = (id) => Q.find((q) => q.id === id) || M.q(id);
    const consOf = (id) => { const c = (cons || {})[id]; return c ? { min: __n(c.min), max: c.max == null ? 100 : __n(c.max) } : { min: 0, max: 100 }; };
    const suppliers = (() => { const s = (o && o.data && o.data.suppliers) || []; const all = s.slice(); M.qs.forEach((q) => { if (q.make && all.indexOf(q.make) < 0) all.push(q.make); }); offers.forEach((x) => { if (all.indexOf(x.s) < 0) all.push(x.s); }); return all; })();
    // measured performance per coal (main item + make): day steam allocated pro-rata to tons × quality factor, half-life 14 days
    const ref = new Date(day + "T00:00:00").getTime();
    const PERF = (() => {
      const map = {};
      M.all.forEach((dt) => {
        if (dt > day) return;
        const sk = M.st(dt); if (sk == null) return;
        const mix = M.side(dt, "fbc"); if (!mix.length) return;
        const base = mix.reduce((a, m) => a + __n(m.kg) / 1000 * qOf(m.q).eff, 0); if (!base) return;
        const age = (ref - new Date(dt + "T00:00:00").getTime()) / 864e5;
        const w = Math.pow(0.5, age / 14);
        mix.forEach((m) => {
          const t = __n(m.kg) / 1000, alloc = sk / 1000 * (t * qOf(m.q).eff / base), rate = __n(m.rate_t) / M.gst;
          const g = map[m.q] || (map[m.q] = { rows: [], wT: 0, wS: 0, wC: 0, n: 0, rT: 0, rS: 0, pT: 0, pS: 0 });
          g.rows.push({ dt, t, alloc, rate }); g.wT += w * t; g.wS += w * alloc; g.wC += w * t * rate; g.n++;
          if (age <= 14) { g.rT += t; g.rS += alloc; } else { g.pT += t; g.pS += alloc; }
        });
      });
      Object.keys(map).forEach((k) => { const g = map[k]; g.eff = g.wS / g.wT; g.perKgAct = g.wC / (g.wS * 1e3); const rc = g.rT ? g.rS / g.rT : null, pr = g.pT ? g.pS / g.pT : null; g.trend = rc != null && pr != null ? (rc - pr) / pr * 100 : 0; g.rows.sort((a, b) => (a.dt < b.dt ? 1 : -1)); });
      return map;
    })();
    const perfOf = (q) => (PERF[q] ? { eff: PERF[q].eff, hist: true } : { eff: qOf(q).eff, hist: false });
    const tgt = Number(target) > 0 ? Number(target) : 0;
    const solve = () => {
      if (!tgt) return { list: [], reason: "Enter the steam required for the day." };
      const missing = Q.filter((q) => consOf(q.id).min > 0 && offers.every((x) => x.q !== q.id));
      if (missing.length) return { list: [], reason: "No offer entered for " + missing.map((q) => q.label).join(", ") + " on this date — its minimum is above 0%. Add an offer or set the minimum to 0." };
      const QS = Q.filter((q) => offers.some((x) => x.q === q.id));
      if (!QS.length) return { list: [], reason: "No offers entered for this date — add supplier offers below." };
      const ladder = {};
      QS.forEach((q) => { ladder[q.id] = offers.filter((x) => x.q === q.id).map((x) => { const p = perfOf(q.id); return { o: x, eff: p.eff, hist: p.hist, perKgSteam: x.rate / (p.eff * 1e3), steamCap: x.a * p.eff }; }).sort((a, b) => a.perKgSteam - b.perKgSteam); });
      const step = QS.length > 5 ? 10 : 5;
      const cands = [];
      const rec = (i, left, shares) => {
        if (i === QS.length - 1) { shares[QS[i].id] = left; evalMix(Object.assign({}, shares)); return; }
        for (let s = 0; s <= left; s += step) { shares[QS[i].id] = s; rec(i + 1, left - s, shares); }
      };
      const evalMix = (shares) => {
        const per = []; let cost = 0, coalT = 0;
        for (const q of QS) {
          const sh = shares[q.id]; if (!sh) continue;
          let need = tgt * sh / 100; const draws = [];
          for (const rung of ladder[q.id]) { if (need <= 1e-6) break; const st = Math.min(need, rung.steamCap), tq = st / rung.eff; draws.push({ sup: rung.o.s, rate: rung.o.rate, eff: rung.eff, hist: rung.hist, t: tq, steam: st, cost: tq * rung.o.rate }); cost += tq * rung.o.rate; coalT += tq; need -= st; }
          if (need > 1e-6) return;
          per.push({ q, sh, draws });
        }
        const massPct = {};
        for (const q of Q) {
          const p = per.find((x) => x.q.id === q.id); const mp = p ? p.draws.reduce((a, b) => a + b.t, 0) / coalT * 100 : 0; massPct[q.id] = mp; const c = consOf(q.id);
          if (mp === 0) { if (c.min > 0) return; continue; }
          if (mp < c.min - 1e-3 || mp > c.max + 1e-3) return;
        }
        cands.push({ shares, massPct, per, cost, coalT, perKg: cost / (tgt * 1e3), sig: QS.filter((q) => shares[q.id] > 0).map((q) => q.id).join("+") });
      };
      rec(0, 100, {});
      if (!cands.length) return { list: [], reason: "Offers run short of the steam target within the limits — add quantity, add a supplier, or relax the min/max bands." };
      cands.sort((a, b) => a.perKg - b.perKg);
      const list = [];
      for (const c of cands) { if (list.length >= 5) break; if (!list.some((l) => l.sig === c.sig && QS.every((q) => Math.abs((l.shares[q.id] || 0) - (c.shares[q.id] || 0)) < 15))) list.push(c); }
      return { list, reason: null };
    };
    const { list, reason } = solve();
    const actualKg = M.st(day), actualPerKg = actualKg && M.kg(day, "fbc") ? M.cost(day, "fbc") / actualKg : null;
    const best = list[0];
    const saveDay = best && actualPerKg != null ? (actualPerKg - best.perKg) * tgt * 1e3 : null;
    const mixLbl = (c) => Q.filter((q) => c.shares[q.id] > 0).map((q) => q.label).join(" + ");
    const massLbl = (c) => Q.filter((q) => c.shares[q.id] > 0).map((q) => c.massPct[q.id].toFixed(0) + "%").join(" + ");
    const setC = (qid, k, v) => { const n = Math.max(0, Math.min(100, Number(v) || 0)); const cur = consOf(qid); setCons(Object.assign({}, cons || {}, { [qid]: Object.assign({}, cur, { [k]: n }) })); };
    const call = (key, action, body, after) => { setBusy(key); setMsg(null); __api(action, body).then(function (r) { setBusy(null); if (r && r.success) { setMsg({ ok: true, text: r.message || "Saved." }); if (after) after(r); } else setMsg({ ok: false, text: (r && r.message) || "Could not save." }); }); };
    const addOffer = () => { const r = Number(form.r), a = Number(form.a), q = form.q || (Q[0] && Q[0].id), s = form.s || suppliers[0]; if (!q || !s || !(r > 0) || !(a > 0)) { setMsg({ ok: false, text: "Pick coal and supplier, enter ₹/ton and available tons." }); return; } call("add", "expense/coal/offers/save", { date: day, q, s, rate: r, a }, () => { setForm({ q, s, r: "", a: "" }); setTick(tick + 1); }); };
    const delOffer = (x) => call("del" + x.id, "expense/coal/offers/delete", { id: x.id, date: day }, () => setTick(tick + 1));
    const saveLimits = () => { const c = {}; Q.forEach((q) => { c[q.id] = consOf(q.id); }); const e = {}; Q.forEach((q) => { if (eff[q.id] != null && eff[q.id] !== "") e[q.id] = eff[q.id]; }); call("lim", "expense/coal/constraints/save", { cons: c, target_t: tgt || null, eff: e }); };
    const saveSupplier = () => { const nm = newSup.trim(); if (!nm) return; const list2 = ((o && o.data && o.data.suppliers) || []).concat(suppliers.indexOf(nm) < 0 ? [nm] : []); call("sup", "expense/coal/suppliers/save", { suppliers: list2 }, () => { setForm(Object.assign({}, form, { s: nm })); setNewSup(""); setAddingSup(false); setTick(tick + 1); }); };
    const perfList = Object.keys(PERF).map((k) => Object.assign({ key: k, q: qOf(k) }, PERF[k])).sort((a, b) => b.eff - a.eff);
    const modelRows = M.all.filter((dt) => dt <= day && M.st(dt) != null && M.kg(dt, "fbc") > 0).slice(-5).reverse().map((dt) => { const cost = M.cost(dt, "fbc"); const pred = M.side(dt, "fbc").reduce((a, m) => a + __n(m.kg) / 1000 * perfOf(m.q).eff * 1e3, 0); return { dt, pred: cost / pred, act: cost / M.st(dt) }; });
    const selStyle = { padding: "6px 8px", border: "1px solid " + C.line, borderRadius: 8, fontSize: 12, fontWeight: 700, color: C.ink, background: "#fff", fontFamily: "inherit" };
    const allDays = days;
    return React.createElement("div", null, React.createElement(ExpBack, { onBack, label: "BOILER" }),
      React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 12 } },
        React.createElement("div", null, React.createElement("div", { style: { fontFamily: "DM Serif Display, serif", fontSize: mobile ? 21 : 25, color: C.ink } }, "Coal Mix Optimiser"), React.createElement("div", { style: { fontSize: 12, color: C.mut, marginTop: 2 } }, "Ranks on measured steam performance from your own entries — formula-based throughout")),
        __sel(day, (v) => { setDay(v); setOpenR(null); }, allDays.map((dt) => [dt, __dl(dt) + (M.st(dt) != null ? " ✓" : "")]))),
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: "Best Feasible Mix", value: best ? "₹" + best.perKg.toFixed(2) + "/kg" : "—", sub: best ? mixLbl(best) + " · " + massLbl(best) : "no feasible mix", accent: C.teal }),
        React.createElement(Kpi, { key: "b", mobile, label: "Actual This Day", value: actualPerKg != null ? "₹" + actualPerKg.toFixed(2) + "/kg" : "—", sub: actualKg != null ? (actualKg / 1e3).toFixed(0) + " t steam entered" : "steam pending for this day", accent: C.ink }),
        React.createElement(Kpi, { key: "c", mobile, label: "Possible Saving", value: saveDay != null && saveDay >= 0 ? inr(saveDay) : "—", sub: saveDay != null && saveDay >= 0 ? "per day at " + tgt + " t steam" : actualPerKg == null ? "enter steam to compare" : "actual already at par", accent: C.green }),
        React.createElement(Kpi, { key: "d", mobile, label: "Offers Today", value: o ? String(offers.length) : "…", sub: offers.length ? "only entered offers count" : "add offers below", accent: C.amber })]),
      o && !o.success ? __gap(__errBox("Offers could not be read — " + (o.message || ""))) : null,
      __gap(React.createElement(Section, { title: "Supplier offers — " + __dl(day), right: React.createElement(Chip, { text: "RATE PER DATE · PER SUPPLIER", bg: C.amberSoft, fg: C.amber }), pad: false },
        !o ? __loadingBox("Loading offers…") : offers.length ? offers.map((x) => { const p = perfOf(x.q); const q = qOf(x.q);
          return React.createElement("div", { key: x.id, style: { display: "grid", gridTemplateColumns: mobile ? "1fr auto auto 24px" : "1.35fr 1fr auto auto auto 24px", gap: 8, alignItems: "center", padding: "8px 14px", borderTop: "1px solid " + C.line } },
            React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } }, React.createElement("span", { style: { width: 8, height: 8, borderRadius: 2, background: q.c, flexShrink: 0 } }), React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, q.label + (mobile ? " · " + x.s : ""))),
            !mobile ? React.createElement("span", { style: { fontSize: 12, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, x.s) : null,
            React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" } }, "₹" + fm(x.rate) + "/t"),
            React.createElement("span", { style: { fontSize: 12, color: C.slate, whiteSpace: "nowrap" } }, x.a + " t"),
            !mobile ? React.createElement("span", { style: { fontSize: 11.5, fontWeight: 800, color: p.hist ? C.teal : C.mut, whiteSpace: "nowrap" } }, "₹" + (x.rate / (p.eff * 1e3)).toFixed(2) + "/kg stm") : null,
            canEdit ? React.createElement("button", { onClick: () => delOffer(x), style: { border: "none", background: "transparent", color: C.rose, fontSize: 14, cursor: "pointer", padding: 2 } }, busy === "del" + x.id ? "…" : "✕") : React.createElement("span", null));
        }) : React.createElement("div", { style: { padding: "12px 14px", fontSize: 12, color: C.mut } }, "No offers entered for this date — only entered offers are used, nothing is assumed."),
        canEdit ? React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 14px", borderTop: "1px solid " + C.line, background: "#fbfcff" } },
          React.createElement("select", { value: form.q || (Q[0] && Q[0].id) || "", onChange: (e) => setForm(Object.assign({}, form, { q: e.target.value })), style: Object.assign({}, selStyle, { maxWidth: mobile ? 170 : 240 }) }, Q.map((q) => React.createElement("option", { key: q.id, value: q.id }, q.label))),
          React.createElement("select", { value: form.s || suppliers[0] || "", onChange: (e) => setForm(Object.assign({}, form, { s: e.target.value })), style: Object.assign({}, selStyle, { maxWidth: mobile ? 150 : 210 }) }, suppliers.map((s) => React.createElement("option", { key: s, value: s }, s))),
          React.createElement("button", { onClick: () => setAddingSup(!addingSup), style: { border: "1px solid " + C.teal, background: "#fff", color: C.teal, borderRadius: 999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" } }, "+ SUPPLIER"),
          React.createElement(OptInput, { v: form.r, set: (v) => setForm(Object.assign({}, form, { r: v })), ph: "₹ / ton", w: 78 }),
          React.createElement(OptInput, { v: form.a, set: (v) => setForm(Object.assign({}, form, { a: v })), ph: "Avail t", w: 64 }),
          __btn("ADD", addOffer, null, busy === "add")) : null,
        canEdit && addingSup ? React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderTop: "1px dashed " + C.line, background: "#f0fdfa" } },
          React.createElement("input", { value: newSup, placeholder: "New supplier name", onChange: (e) => setNewSup(e.target.value), style: { flex: 1, minWidth: 140, padding: "6px 8px", border: "1px solid " + C.line, borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: C.ink } }),
          __btn("SAVE", saveSupplier, null, busy === "sup")) : null,
        msg ? React.createElement("div", { style: { padding: "0 14px 10px" } }, __msg(msg)) : null)),
      __gap(React.createElement(Section, { title: "Boiler constraints", right: React.createElement(Chip, { text: canEdit ? "EDITABLE" : "READ ONLY", bg: C.indigoSoft, fg: C.indigoDark }) },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 8, borderBottom: "1px dashed " + C.line } },
          React.createElement("span", { style: { fontSize: 12, color: C.slate, fontWeight: 700 } }, "Steam required for the day"), React.createElement(OptInput, { v: target, set: setTarget, w: 70 }), React.createElement("span", { style: { fontSize: 12, color: C.mut } }, "tons"),
          actualKg ? React.createElement("span", { style: { fontSize: 11, color: C.mut } }, "· entered " + (actualKg / 1000).toFixed(1) + " t on this day") : null),
        Q.map((q) => React.createElement("div", { key: q.id, style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderBottom: "1px dashed " + C.line } },
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, minWidth: mobile ? 0 : 200, flex: mobile ? "1 1 100%" : "none" } }, React.createElement("span", { style: { width: 8, height: 8, borderRadius: 2, background: q.c } }), React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink } }, q.label)),
          React.createElement("span", { style: { fontSize: 11, color: C.mut } }, "MIN"), React.createElement(OptInput, { v: consOf(q.id).min, set: (v) => setC(q.id, "min", v), w: 58 }),
          React.createElement("span", { style: { fontSize: 11, color: C.mut } }, "MAX"), React.createElement(OptInput, { v: consOf(q.id).max, set: (v) => setC(q.id, "max", v), w: 58 }),
          React.createElement("span", { style: { fontSize: 11, color: C.mut } }, "% of coal fed · base"), React.createElement(OptInput, { v: eff[q.id] != null ? eff[q.id] : q.eff, set: (v) => setEff(Object.assign({}, eff, { [q.id]: v })), w: 58 }), React.createElement("span", { style: { fontSize: 11, color: C.mut } }, "kg/kg"))),
        React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 8 } }, "The cheapest coal is not always usable at 100% — lignite alone cannot hold steam pressure. Bands apply to the coal-mass mix the boiler is actually fed. Base kg/kg (GAR ÷ 800 until set) is used only for a coal with no steam history."),
        canEdit ? React.createElement("div", { style: { marginTop: 10 } }, __btn("SAVE LIMITS", saveLimits, "indigo", busy === "lim")) : null)),
      __gap(React.createElement(Section, { title: "Best 5 combinations", right: React.createElement(Chip, { text: "TARGET " + tgt + " T STEAM", bg: C.tealSoft, fg: C.teal }), pad: false },
        list.length ? list.map((c, ix) => { const open = openR === ix;
          return React.createElement("div", { key: ix, style: { borderTop: "1px solid " + C.line, borderLeft: ix === 0 ? "4px solid " + C.teal : "4px solid transparent" } },
            React.createElement("div", { onClick: () => setOpenR(open ? null : ix), style: { padding: "10px 14px", cursor: "pointer", background: open ? "#fbfcff" : "transparent" } },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
                React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, React.createElement("span", { style: { fontSize: 11, fontWeight: 800, color: ix === 0 ? C.teal : C.mut, flexShrink: 0 } }, "#" + (ix + 1)), React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, mixLbl(c)), ix === 0 ? React.createElement(Chip, { text: "RECOMMENDED", bg: C.tealSoft, fg: C.teal }) : null),
                React.createElement("span", { style: { fontSize: 13, fontWeight: 800, color: ix === 0 ? C.teal : C.ink, whiteSpace: "nowrap" } }, "₹" + c.perKg.toFixed(2) + "/kg " + (open ? "▾" : "▸"))),
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: C.slate, marginTop: 3, gap: 8, flexWrap: "wrap" } }, React.createElement("span", null, massLbl(c) + " of " + c.coalT.toFixed(1) + " t coal"), React.createElement("span", null, "total " + inr(c.cost)))),
            open ? React.createElement("div", { style: { padding: "0 14px 12px", background: "#fbfcff" } },
              c.per.map((p) => p.draws.map((dr, dx) => React.createElement("div", { key: p.q.id + dx, style: { padding: "7px 0", borderTop: "1px dashed " + C.line } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" } }, React.createElement("span", { style: { fontSize: 12, fontWeight: 800, color: C.ink } }, React.createElement("span", { style: { display: "inline-block", width: 8, height: 8, borderRadius: 2, background: p.q.c, marginRight: 6 } }), p.q.label + " · " + dr.sup), React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.ink } }, dr.t.toFixed(1) + " t · " + inr(dr.cost))),
                React.createElement("div", { style: { fontSize: 11, color: C.slate, marginTop: 2, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" } }, React.createElement("span", null, "₹" + fm(dr.rate) + "/t → " + dr.steam.toFixed(1) + " t steam at " + dr.eff.toFixed(2) + " kg/kg"), React.createElement("span", { style: { fontWeight: 800, color: dr.hist ? C.teal : C.mut } }, (dr.hist ? "MEASURED" : "QUALITY BASE") + " · ₹" + (dr.rate / (dr.eff * 1e3)).toFixed(2) + "/kg"))))),
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "8px 0 0", borderTop: "2px solid " + C.ink, marginTop: 4 } }, React.createElement("span", { style: { fontSize: 12, fontWeight: 800, color: C.ink } }, "Total · " + c.coalT.toFixed(1) + " t coal → " + tgt + " t steam"), React.createElement("span", { style: { fontSize: 12, fontWeight: 800, color: C.teal } }, inr(c.cost) + " · ₹" + c.perKg.toFixed(2) + "/kg")),
              actualPerKg != null ? React.createElement("div", { style: { fontSize: 11, color: actualPerKg - c.perKg >= 0 ? C.green : C.rose, fontWeight: 700, marginTop: 6 } }, actualPerKg - c.perKg >= 0 ? "Saves ₹" + (actualPerKg - c.perKg).toFixed(2) + "/kg vs the actual mix — " + inr((actualPerKg - c.perKg) * tgt * 1e3) + " on the day" : "Costs ₹" + (c.perKg - actualPerKg).toFixed(2) + "/kg more than the actual mix") : null) : null);
        }) : React.createElement("div", { style: { padding: "12px 14px", fontSize: 12, color: C.rose, fontWeight: 600 } }, reason))),
      __gap(React.createElement(Section, { title: "Coal performance — measured", right: React.createElement(Chip, { text: "FROM ERP ISSUES + STEAM ENTRIES", bg: C.tealSoft, fg: C.teal }), pad: false },
        perfList.length ? perfList.map((p) => { const open = openP === p.key;
          return React.createElement("div", { key: p.key, style: { borderTop: "1px solid " + C.line } },
            React.createElement("div", { onClick: () => setOpenP(open ? null : p.key), style: { display: "grid", gridTemplateColumns: mobile ? "1fr auto 16px" : "1.5fr auto auto auto 16px", gap: 8, alignItems: "center", padding: "9px 14px", cursor: "pointer", background: open ? "#fbfcff" : "transparent" } },
              React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } }, React.createElement("span", { style: { width: 8, height: 8, borderRadius: 2, background: p.q.c, flexShrink: 0 } }), React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.q.label)),
              !mobile ? React.createElement("span", { style: { fontSize: 12, color: C.slate, whiteSpace: "nowrap" } }, p.eff.toFixed(2) + " kg stm / kg") : null,
              !mobile ? React.createElement("span", { style: { fontSize: 12, color: C.slate, whiteSpace: "nowrap" } }, (1 / p.eff).toFixed(2) + " kg coal / kg") : null,
              React.createElement("span", { style: { fontSize: 12, fontWeight: 800, color: p.trend >= 1 ? C.green : p.trend <= -1 ? C.rose : C.slate, whiteSpace: "nowrap" } }, (mobile ? p.eff.toFixed(2) + " kg/kg · " : "") + (p.trend >= 1 ? "▲" : p.trend <= -1 ? "▼" : "—") + " " + Math.abs(p.trend).toFixed(1) + "%"),
              React.createElement("span", { style: { color: C.mut, fontSize: 12 } }, open ? "▾" : "▸")),
            open ? React.createElement("div", { style: { padding: "0 14px 12px", background: "#fbfcff" } },
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", columnGap: 20 } },
                React.createElement(ExpKV, { k: "Steam per ton coal", v: (p.eff * 1e3).toFixed(0) + " kg" }), React.createElement(ExpKV, { k: "Coal per kg steam", v: (1 / p.eff).toFixed(3) + " kg" }),
                React.createElement(ExpKV, { k: "Actual ₹/kg steam (wtd)", v: "₹" + p.perKgAct.toFixed(2), strong: true, accent: C.teal }), React.createElement(ExpKV, { k: "Feed days recorded", v: p.n + " days" })),
              React.createElement("div", { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: C.mut, margin: "8px 0 4px" } }, "RECENT FEEDS"),
              p.rows.slice(0, 5).map((e, ex) => React.createElement("div", { key: ex, style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, color: C.slate, padding: "3px 0", borderTop: "1px dashed " + C.line, flexWrap: "wrap" } }, React.createElement("span", null, __dl(e.dt) + " · " + e.t.toFixed(1) + " t @ ₹" + fm(Math.round(e.rate))), React.createElement("span", null, e.alloc.toFixed(1) + " t steam (alloc) · " + (e.alloc / e.t).toFixed(2) + " kg/kg"))),
              React.createElement("div", { style: { fontSize: 10.5, color: C.mut, marginTop: 6 } }, "Day steam is allocated across that day coal pro-rata to tons × quality factor, then recency-weighted (half-life 14 days). New entries shift this automatically.")) : null);
        }) : React.createElement("div", { style: { padding: "12px 14px", fontSize: 12, color: C.mut } }, "No performance yet — enter daily steam on the Boiler page and it builds itself."))),
      modelRows.length ? __gap(React.createElement(Section, { title: "Model check — predicted vs actual", pad: false },
        modelRows.map((m) => { const dp = (m.act - m.pred) / m.pred * 100;
          return React.createElement("div", { key: m.dt, style: { display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 14px", borderTop: "1px solid " + C.line, flexWrap: "wrap" } }, React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.ink } }, __dl(m.dt)), React.createElement("span", { style: { fontSize: 12, color: C.slate } }, "predicted ₹" + m.pred.toFixed(2) + " · actual ₹" + m.act.toFixed(2) + " · ", React.createElement("span", { style: { fontWeight: 800, color: Math.abs(dp) <= 2 ? C.green : C.amber } }, (dp >= 0 ? "+" : "") + dp.toFixed(1) + "%"))); }),
        React.createElement("div", { style: { padding: "8px 14px", fontSize: 10.5, color: C.mut, borderTop: "1px solid " + C.line } }, "Every steam entry tightens the match between predicted and actual steam cost."))) : null,
      __note("Transparent formula, no black box: coal issues come from the ERP store issues (main item + make, ₹ ex-GST), steam from your daily entry · day steam is allocated to each coal pro-rata to tons × quality factor · performance = recency-weighted allocated steam ÷ tons (half-life 14 days, last 60 days) · steam shares searched in 5% steps · suppliers drawn in order of day rate ÷ measured kg-steam per kg, capped by offered quantity · min/max bands checked on the coal-mass mix · ₹/kg steam = total cost ÷ steam target."));
  }

  /* ═════════ ELECTRICITY — live (daily meter entry → monthly / daily, like the daily power report) ═════════
     expense/electricity { month } → meters (groups), reads { date: { code: {r, k, p, h, rm} } }, rate, dyeing production.
     ₹/m rules (as the power sheet): jets + FBC on dyeing production (FAMMR → DAPProcess 1/16), thermopack on stenter
     production, stenters / Pengda on their own production, Torrent on dyeing + stenter + digital; monthly plant ₹/m on billed metres. */
  var __PG = [
    { k: "jet", t: "DYEING — JET MACHINES", c: "#4f46e5" }, { k: "stn", t: "STENTER MACHINES", c: "#0d9488" }, { k: "blr", t: "BOILER HOUSE — ELECTRICAL", c: "#d97706" },
    { k: "wtr", t: "WATER & UTILITIES", c: "#0891b2" }, { k: "util", t: "COMPRESSORS", c: "#64748b" }, { k: "digi", t: "DIGITAL PRINT (SEPARATE)", c: "#db2777" }, { k: "other", t: "OTHER METERS", c: "#94a3b8" }];
  var __GRP_OPTS = [["jet", "Jet"], ["stn", "Stenter"], ["blr", "Boiler house"], ["wtr", "Water & utilities"], ["util", "Compressor / utility"], ["digi", "Digital"], ["main", "Main supply (Torrent)"], ["other", "Other"]];
  var __PROD_OPTS = [["dye", "dyeing prod."], ["stn", "stenter prod."], ["own", "own prod. (entered)"], ["all", "dye + stenter + digital"], ["none", "no ₹/m"]];

  function __powerModel(d) {
    var meters = (d.meters || []).filter(function (m) { return m.active !== false; });
    var reads = d.reads || {};
    var days = __dates(d.from, d.to);
    var main = meters.filter(function (m) { return m.grp === "main"; });
    var P = { rate: d.rate || 9.57, meters: meters, main: main, subs: meters.filter(function (m) { return m.grp !== "main"; }), reads: reads, days: days, dyeP: d.dye || {} };
    P.k = function (dt, code) { var r = reads[dt] && reads[dt][code]; return r && r.k != null ? __n(r.k) : null; };
    P.p = function (dt, code) { var r = reads[dt] && reads[dt][code]; return r && r.p != null ? __n(r.p) : null; };
    P.dye = function (dt) { var x = P.dyeP[dt]; return x ? __n(x.mtr) : 0; };
    P.grpProd = function (dt, g) { return meters.filter(function (m) { return m.grp === g; }).reduce(function (a, m) { return a + __n(P.p(dt, m.code)); }, 0); };
    P.prodOf = function (m, dt) {
      if (m.prod === "dye") return P.dye(dt);
      if (m.prod === "stn") return P.grpProd(dt, "stn");
      if (m.prod === "own") return __n(P.p(dt, m.code));
      if (m.prod === "all") return P.dye(dt) + P.grpProd(dt, "stn") + P.grpProd(dt, "digi");
      return 0;
    };
    P.subKwh = function (dt) { return P.subs.reduce(function (a, m) { return a + __n(P.k(dt, m.code)); }, 0); };
    P.mainKwh = function (dt) { var v = main.reduce(function (a, m) { var x = P.k(dt, m.code); return x == null ? a : (a == null ? 0 : a) + x; }, null); return v; };
    P.supply = function (dt) { var v = P.mainKwh(dt); return v != null ? v : P.subKwh(dt); };
    P.entered = days.filter(function (dt) { return reads[dt] && Object.keys(reads[dt]).some(function (c) { return reads[dt][c].k != null; }); });
    return P;
  }

  function LiveElectricity({ mobile, ym, onBack, bill }) {
    const [d, setD] = useState(null);
    const [tick, setTick] = useState(0);
    const [tab, setTab] = useState("month");
    useEffect(() => {
      let alive = true; setD(null);
      __api("expense/electricity", { month: ym }).then(function (r) { if (alive) setD(r); });
      return () => { alive = false; };
    }, [ym, tick]);
    const head = (right) => React.createElement("div", null, React.createElement(ExpBack, { onBack }), __title("Electricity — Utilities", mobile, right));
    if (!d) return React.createElement("div", null, head(), __loadingBox());
    if (!d.success || !d.data) return React.createElement("div", null, head(), __errBox("Electricity could not be read from Mills — " + (d.message || "") + (d.data && d.data.errors ? " · " + d.data.errors.join(" | ") : "")));
    const data = d.data;
    const P = __powerModel(data);
    const canEdit = __can("expense.electricity:edit");
    const billAmt = data.billing ? __n(data.billing.amount) : (bill || 0);
    const supplyM = P.days.reduce((a, dt) => a + P.supply(dt), 0);
    const cost = supplyM * P.rate;
    const tabs = React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 } },
      React.createElement(ExpTab, { text: "MONTHLY", act: tab === "month", onClick: () => setTab("month") }),
      React.createElement(ExpTab, { text: "DAILY REPORT", act: tab === "day", onClick: () => setTab("day") }),
      React.createElement(ExpTab, { text: canEdit ? "DAILY ENTRY" : "READINGS", act: tab === "entry", onClick: () => setTab("entry") }),
      canEdit ? React.createElement(ExpTab, { text: "METERS", act: tab === "meters", onClick: () => setTab("meters") }) : null);
    const right = React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
      React.createElement(Chip, { text: data.month }),
      billAmt && cost ? React.createElement(Chip, { text: (cost / billAmt * 100).toFixed(1) + "% OF BILLING", bg: C.amberSoft, fg: C.amber }) : null,
      React.createElement(Chip, { text: "₹" + P.rate + " / kWh" }));
    const errs = (data.errors || []).length ? __errBox("Notes from Mills: " + data.errors.join(" | ")) : null;
    let body;
    if (tab === "entry") body = React.createElement(LivePowerEntry, { mobile, data, P, canEdit, onSaved: () => setTick(tick + 1) });
    else if (tab === "meters") body = React.createElement(LivePowerMeters, { mobile, data, onSaved: () => setTick(tick + 1) });
    else if (tab === "day") body = React.createElement(LivePowerDay, { mobile, data, P, ym });
    else body = React.createElement(LivePowerMonth, { mobile, data, P, bill: billAmt });
    return React.createElement("div", null, head(right), tabs, errs ? __gap(errs) : null, body);
  }

  function LivePowerMonth({ mobile, data, P, bill }) {
    const [sel, setSel] = useState(null);
    const [mode, setMode] = useState("kwh");
    const [open, setOpen] = useState(null);
    const days = P.days, n = P.entered.length;
    if (!n) return __gap(React.createElement(Section, { title: "No meter entries yet" }, React.createElement("div", { style: { fontSize: 12.5, color: C.slate, lineHeight: 1.6 } }, "No electricity readings are entered for " + data.month + ". Open DAILY ENTRY and enter the day's meter readings (or kWh) — the month, the daily report and the Monthly Expense pick them up on their own.")));
    const mainM = days.reduce((a, dt) => a + __n(P.mainKwh(dt)), 0);
    const subM = days.reduce((a, dt) => a + P.subKwh(dt), 0);
    const supplyM = mainM > 0 ? mainM : subM;
    const cost = supplyM * P.rate;
    const billMtr = data.billing && data.billing.mtr ? __n(data.billing.mtr) : 0;
    const daily = days.map((dt) => P.supply(dt));
    const permD = days.map((dt) => { const pr = P.dye(dt) + P.grpProd(dt, "stn") + P.grpProd(dt, "digi"); return pr ? P.supply(dt) * P.rate / pr : 0; });
    const vals = mode === "kwh" ? daily : permD;
    const mRow = (m) => {
      const kwh = days.reduce((a, dt) => a + __n(P.k(dt, m.code)), 0);
      const prod = days.reduce((a, dt) => a + (P.k(dt, m.code) != null ? P.prodOf(m, dt) : 0), 0);
      const dn = days.filter((dt) => P.k(dt, m.code) != null).length;
      return { m, kwh, prod, dn, cost: kwh * P.rate };
    };
    const groups = __PG.map((g) => ({ g, rows: P.subs.filter((m) => (__PG.some((x) => x.k === m.grp) ? m.grp : "other") === g.k).map(mRow) })).filter((x) => x.rows.length);
    return React.createElement("div", null,
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: mainM > 0 ? "Torrent Supply" : "Sub-meters", value: fm(Math.round(supplyM)) + " kWh", sub: inr(cost) + " · " + n + " of " + days.length + " days entered", accent: C.indigo }),
        React.createElement(Kpi, { key: "b", mobile, label: "Cost per Metre", value: billMtr ? "₹" + (cost / billMtr).toFixed(2) : "—", sub: billMtr ? "on " + fm(Math.round(billMtr)) + " billed m" : "billed metres not found", accent: C.teal }),
        React.createElement(Kpi, { key: "c", mobile, label: "Units per Metre", value: billMtr ? (supplyM / billMtr).toFixed(3) : "—", sub: "kWh per billed m", accent: C.amber }),
        React.createElement(Kpi, { key: "d", mobile, label: "Avg per Day", value: fm(Math.round(supplyM / n)) + " kWh", sub: inr(cost / n) + " · " + fm(Math.round(supplyM / n / 24)) + " kW avg load", accent: C.ink })]),
      __gap(React.createElement(Section, { title: "Plant daily supply", right: React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" } }, React.createElement(ExpTab, { text: "kWh / DAY", act: mode === "kwh", onClick: () => setMode("kwh") }), React.createElement(ExpTab, { text: "₹ / METER", act: mode === "perm", onClick: () => setMode("perm") })) },
        sel != null ? React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: C.slate, marginBottom: 6 } }, __dl(days[sel]) + " — " + (mode === "kwh" ? fm(Math.round(vals[sel])) + " kWh" : vals[sel] ? "₹" + vals[sel].toFixed(2) + " / m" : "production not found")) : null,
        React.createElement(ExpBars, { vals, sel, onPick: (i) => setSel(sel === i ? null : i), color: C.indigo, h: 110, mobile, labels: __ticks(days) }),
        React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 8 } }, "Daily ₹/m works on machine production of that day (dyeing + stenter + digital), exactly like the daily power sheet."))),
      groups.map((G) => { const tk = G.rows.reduce((a, r) => a + r.kwh, 0);
        return __gap(React.createElement(Section, { key: G.g.k, title: G.g.t, right: React.createElement(Chip, { text: fm(Math.round(tk)) + " kWh · " + inr(tk * P.rate) }), pad: false },
          G.rows.map((r) => { const op = open === r.m.code; const perM = r.prod ? r.cost / r.prod : null;
            return React.createElement("div", { key: r.m.code, style: { borderTop: "1px solid " + C.line } },
              React.createElement("div", { onClick: () => setOpen(op ? null : r.m.code), style: { display: "grid", gridTemplateColumns: mobile ? "1fr auto 14px" : "1.4fr auto auto auto 14px", gap: 10, alignItems: "baseline", padding: "10px 14px", cursor: "pointer", background: op ? "#fbfcff" : "transparent" } },
                React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, React.createElement("span", { style: { width: 8, height: 8, borderRadius: 99, background: G.g.c, flexShrink: 0 } }), React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, r.m.name)),
                !mobile ? React.createElement("span", { style: { fontSize: 12, color: C.slate } }, fm(Math.round(r.kwh)) + " kWh") : null,
                !mobile ? React.createElement("span", { style: { fontSize: 12, color: C.slate } }, perM != null ? "₹" + perM.toFixed(3) + "/m" : "—") : null,
                React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: C.ink } }, inr(r.cost)),
                React.createElement("span", { style: { color: C.mut } }, op ? "▾" : "▸")),
              op ? React.createElement("div", { style: { padding: "2px 14px 12px", background: "#fbfcff", display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", columnGap: 26 } },
                React.createElement(ExpKV, { k: "Units", v: fm(Math.round(r.kwh)) + " kWh" }), React.createElement(ExpKV, { k: "Cost", v: inr(r.cost), strong: true }),
                React.createElement(ExpKV, { k: "Avg units / day", v: r.dn ? fm(Math.round(r.kwh / r.dn)) + " kWh · " + (r.kwh / r.dn / 24).toFixed(1) + " kW" : "—" }),
                React.createElement(ExpKV, { k: "Machines on meter", v: r.m.machines ? String(r.m.machines) : "—" }),
                React.createElement(ExpKV, { k: "Production (" + (__PROD_OPTS.find((x) => x[0] === r.m.prod) || ["", "—"])[1] + ")", v: r.prod ? fm(Math.round(r.prod)) + " m" : "—" }),
                React.createElement(ExpKV, { k: "Units per m", v: r.prod ? (r.kwh / r.prod).toFixed(4) : "—" }),
                React.createElement(ExpKV, { k: "₹ per m", v: perM != null ? "₹" + perM.toFixed(3) : "—", strong: true, accent: C.teal }),
                React.createElement(ExpKV, { k: "Days entered", v: r.dn + " of " + days.length })) : null);
          })));
      }),
      mainM > 0 ? __gap(React.createElement(Section, { title: "Torrent supply vs sub-meters" },
        React.createElement(ExpKV, { k: "Torrent supply", v: fm(Math.round(mainM)) + " kWh · " + inr(mainM * P.rate), strong: true }),
        React.createElement(ExpKV, { k: "Σ sub-meters", v: fm(Math.round(subM)) + " kWh · " + inr(subM * P.rate) }),
        React.createElement(ExpKV, { k: "Unmetered (supply − sub-meters)", v: fm(Math.round(mainM - subM)) + " kWh · " + (mainM ? ((mainM - subM) / mainM * 100).toFixed(1) : "0") + "%", accent: mainM - subM < 0 ? C.rose : C.amber }))) : null,
      __note("Monthly ₹/m works on billing metres" + (billMtr ? " (" + fm(Math.round(billMtr)) + " m from " + ((data.billing && data.billing.source) || "DAPOutI") + ")" : "") + "; daily ₹/m works on machine metres. Digital print is separate — never added into dyeing or stenter metres. Dyeing production: " + (data.dye_basis ? data.dye_basis.database + " " + data.dye_basis.metres : "not found") + "."));
  }

  function LivePowerDay({ mobile, data, P, ym }) {
    const ds = P.days.filter((dt) => dt <= (data.today || TODAY));
    const def = P.entered.length ? P.entered[P.entered.length - 1] : (ds[ds.length - 1] || P.days[0]);
    const [dt, setDt] = useState(def);
    const [coal, setCoal] = useState(null);
    useEffect(() => {
      if (!__can("expense.coal")) return;
      let alive = true;
      __api("expense/coal", { month: ym }).then(function (r) { if (alive) setCoal(r); });
      return () => { alive = false; };
    }, [ym]);
    const prevDt = P.days[P.days.indexOf(dt) - 1] || null;
    const row = (m, day) => { const k = P.k(day, m.code); const pr = k != null ? P.prodOf(m, day) : 0; return { k, kw: k != null ? k / (__n((P.reads[day] || {})[m.code] && P.reads[day][m.code].h) || 24) : null, pr, perM: k != null && pr ? k * P.rate / pr : null }; };
    const cell = (v, bold) => React.createElement("span", { style: { fontSize: 12, fontWeight: bold ? 800 : 600, color: bold ? C.ink : C.slate, textAlign: "right", whiteSpace: "nowrap" } }, v);
    const head = React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1.3fr 70px 64px" : "1.6fr 90px 70px 90px 80px 90px", gap: 8, padding: "6px 14px", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: C.mut } },
      React.createElement("span", null, "METER"), React.createElement("span", { style: { textAlign: "right" } }, "KWH"), React.createElement("span", { style: { textAlign: "right" } }, mobile ? "₹/M" : "AVG KW"),
      !mobile ? React.createElement("span", { style: { textAlign: "right" } }, "PRODUCTION") : null, !mobile ? React.createElement("span", { style: { textAlign: "right" } }, "₹ / M") : null, !mobile ? React.createElement("span", { style: { textAlign: "right" } }, "PREV DAY") : null);
    const groups = __PG.map((g) => ({ g, ms: P.subs.filter((m) => (__PG.some((x) => x.k === m.grp) ? m.grp : "other") === g.k) })).filter((x) => x.ms.length);
    const sup = P.supply(dt), supPrev = prevDt ? P.supply(prevDt) : null;
    const prodAll = P.dye(dt) + P.grpProd(dt, "stn") + P.grpProd(dt, "digi");
    // coal & steam block of the daily report (needs the Coal right)
    let coalBlock = null;
    if (coal && coal.success && coal.data) {
      const M = __coalModel(coal.data);
      const fk = M.kg(dt, "fbc"), fc = M.cost(dt, "fbc"), sk = M.st(dt), e = M.steam[dt] || {};
      const gars = M.side(dt, "fbc").map((m) => M.q(m.q).gar).filter(Boolean);
      coalBlock = __gap(React.createElement(Section, { title: "Coal & steam — " + __dl(dt), right: React.createElement(Chip, { text: "FBC + THERMOPACK", bg: C.amberSoft, fg: C.amber }) },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", columnGap: 26 } },
          React.createElement(ExpKV, { k: "Coal (FBC)", v: fm(Math.round(fk)) + " kg" }), React.createElement(ExpKV, { k: "Coal amount", v: inr(fc), strong: true }),
          React.createElement(ExpKV, { k: "Coal cost / m (dyeing)", v: P.dye(dt) && fc ? "₹" + (fc / P.dye(dt)).toFixed(2) : "—" }),
          React.createElement(ExpKV, { k: "Steam generation", v: sk ? fm(Math.round(sk)) + " kg" : "steam pending", accent: sk ? null : C.amber }),
          React.createElement(ExpKV, { k: "Steam cost (coal / steam)", v: sk && fc ? "₹" + (fc / sk).toFixed(2) + " / kg" : "—", strong: true, accent: C.teal }),
          React.createElement(ExpKV, { k: "Ratio (steam / coal)", v: sk && fk ? (sk / fk).toFixed(2) : "—" }),
          React.createElement(ExpKV, { k: "Condensate recovery", v: e.cond != null ? fm(Math.round(e.cond)) + " L" : "—" }),
          React.createElement(ExpKV, { k: "Feed-water tank temp.", v: e.temp != null ? e.temp + " °C" : "—" }),
          React.createElement(ExpKV, { k: "Coal type GAR", v: gars.length ? gars.join(", ") : "—" }),
          React.createElement(ExpKV, { k: "Thermopack coal", v: fm(Math.round(M.kg(dt, "tpk"))) + " kg · " + inr(M.cost(dt, "tpk")) }))));
    } else if (coal && !coal.success) coalBlock = __gap(__errBox("Coal & steam could not be read — " + (coal.message || "")));
    const down = (data.downtime || []).filter((x) => x.date === dt);
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 } },
        __sel(dt, setDt, ds.slice().reverse().map((x) => [x, __dl(x) + (P.entered.indexOf(x) >= 0 ? " ✓" : "")])),
        React.createElement("span", { style: { fontSize: 11.5, color: C.mut } }, "Daily power consumption report · previous day " + (prevDt ? __dl(prevDt) : "—"))),
      __grid4(mobile, [
        React.createElement(Kpi, { key: "a", mobile, label: P.main.length && P.mainKwh(dt) != null ? "Torrent kWh" : "Σ Sub-meters", value: fm(Math.round(sup)), sub: supPrev != null ? "prev day " + fm(Math.round(supPrev)) : "", accent: C.indigo }),
        React.createElement(Kpi, { key: "b", mobile, label: "Cost", value: inr(sup * P.rate), sub: "@ ₹" + P.rate + " / kWh", accent: C.ink }),
        React.createElement(Kpi, { key: "c", mobile, label: "Production", value: fm(Math.round(prodAll)) + " m", sub: "dye " + fm(Math.round(P.dye(dt))) + " · stenter " + fm(Math.round(P.grpProd(dt, "stn"))) + " · digital " + fm(Math.round(P.grpProd(dt, "digi"))), accent: C.teal }),
        React.createElement(Kpi, { key: "d", mobile, label: "₹ per Metre", value: prodAll && sup ? "₹" + (sup * P.rate / prodAll).toFixed(3) : "—", sub: "Torrent on machine production", accent: C.amber })]),
      groups.map((G) => { const tot = G.ms.reduce((a, m) => a + __n(row(m, dt).k), 0), totP = prevDt ? G.ms.reduce((a, m) => a + __n(row(m, prevDt).k), 0) : null;
        const gp = G.ms.length ? (G.g.k === "jet" || G.g.k === "blr" ? P.dye(dt) : G.g.k === "stn" ? P.grpProd(dt, "stn") : G.g.k === "digi" ? P.grpProd(dt, "digi") : 0) : 0;
        return __gap(React.createElement(Section, { key: G.g.k, title: G.g.t, right: React.createElement(Chip, { text: fm(Math.round(tot)) + " kWh" + (gp && G.g.k !== "blr" ? " · ₹" + (tot * P.rate / gp).toFixed(3) + "/m" : "") }), pad: false }, head,
          G.ms.map((m) => { const r = row(m, dt), rp = prevDt ? row(m, prevDt) : null;
            return React.createElement("div", { key: m.code, style: { display: "grid", gridTemplateColumns: mobile ? "1.3fr 70px 64px" : "1.6fr 90px 70px 90px 80px 90px", gap: 8, padding: "8px 14px", borderTop: "1px solid " + C.line, alignItems: "baseline" } },
              React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, m.name),
              cell(r.k != null ? fm(Math.round(r.k * 10) / 10) : "—", true),
              mobile ? cell(r.perM != null ? r.perM.toFixed(3) : "—") : cell(r.kw != null ? r.kw.toFixed(1) : "—"),
              !mobile ? cell(r.pr ? fm(Math.round(r.pr)) : "—") : null, !mobile ? cell(r.perM != null ? "₹" + r.perM.toFixed(3) : "—") : null,
              !mobile ? cell(rp && rp.k != null ? fm(Math.round(rp.k * 10) / 10) : "—") : null);
          }),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "2px solid " + C.ink, fontSize: 12, fontWeight: 800, color: C.ink, flexWrap: "wrap", gap: 8 } },
            React.createElement("span", null, "Total kWh and units"), React.createElement("span", null, fm(Math.round(tot)) + " kWh · " + (tot / 24).toFixed(1) + " kW" + (totP != null ? " · prev " + fm(Math.round(totP)) : "")))));
      }),
      coalBlock,
      down.length ? __gap(React.createElement(Section, { title: "Remarks — machine down time", pad: false }, down.map((x) => __rowBtn(x.id, null, (x.machine || "—") + (x.shift ? " · " + x.shift + " shift" : ""), x.mins != null ? fm(x.mins) + " min" : "", x.remark, null, C.rose)))) : null,
      __note("Avg kW = kWh ÷ 24 h (or the hours entered). ₹/m = kWh × ₹" + P.rate + " ÷ production of that day — jets and FBC on dyeing, thermopack on stenter, stenters and Pengda on their own production, Torrent on dyeing + stenter + digital."));
  }

  function LivePowerEntry({ mobile, data, P, canEdit, onSaved }) {
    const ds = P.days.filter((dt) => dt <= (data.today || TODAY));
    const firstOpen = ds.slice().reverse().find((dt) => P.entered.indexOf(dt) < 0);
    const [dt, setDt] = useState(firstOpen || ds[ds.length - 1] || P.days[0]);
    const init = (day) => { const o = {}; P.meters.forEach((m) => { const r = (P.reads[day] || {})[m.code] || {}; o[m.code] = { reading: r.r != null ? String(r.r) : "", kwh: r.k != null ? String(r.k) : "", prod: r.p != null ? String(r.p) : "", hrs: r.h != null ? String(r.h) : "", remark: r.rm || "", auto: r.k != null && r.r != null }; }); return o; };
    const [rows, setRows] = useState(() => init(dt));
    const [down, setDown] = useState(() => (data.downtime || []).filter((x) => x.date === dt).map((x) => ({ machine: x.machine, shift: x.shift, mins: x.mins == null ? "" : String(x.mins), remark: x.remark })));
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const pick = (day) => { setDt(day); setRows(init(day)); setDown((data.downtime || []).filter((x) => x.date === day).map((x) => ({ machine: x.machine, shift: x.shift, mins: x.mins == null ? "" : String(x.mins), remark: x.remark }))); setMsg(null); };
    // last reading before the day (this month's entries, else the reading before the month)
    const lastBefore = (code) => { for (let i = P.days.indexOf(dt) - 1; i >= 0; i--) { const r = (P.reads[P.days[i]] || {})[code]; if (r && r.r != null) return { r: r.r, dt: P.days[i] }; } const pv = (data.prev || {})[code]; return pv ? { r: pv.reading, dt: pv.date } : null; };
    const set = (code, k, v) => { const cur = Object.assign({}, rows[code], { [k]: v }); if (k === "reading") { const lb = lastBefore(code); const m = P.meters.find((x) => x.code === code); if (lb && v !== "" && (cur.auto || cur.kwh === "")) { const kw = (Number(v) - lb.r) * __n(m.mf || 1); cur.kwh = kw >= 0 ? String(Math.round(kw * 1000) / 1000) : ""; cur.auto = true; } } if (k === "kwh") cur.auto = false; setRows(Object.assign({}, rows, { [code]: cur })); };
    const save = () => {
      setBusy(true); setMsg(null);
      const body = { date: dt, rows: P.meters.map((m) => { const r = rows[m.code] || {}; return { code: m.code, reading: r.reading === "" ? null : Number(r.reading), kwh: r.kwh === "" ? null : Number(r.kwh), prod: r.prod === "" ? null : Number(r.prod), hrs: r.hrs === "" ? null : Number(r.hrs), remark: r.remark || "" }; }),
        downtime: down.filter((x) => (x.machine || "").trim() || (x.remark || "").trim()).map((x) => ({ machine: x.machine, shift: x.shift, mins: x.mins === "" ? null : Number(x.mins), remark: x.remark })) };
      __api("expense/electricity/save", body).then(function (r) { setBusy(false); if (r && r.success) { setMsg({ ok: true, text: r.message || "Saved." }); onSaved(); } else setMsg({ ok: false, text: (r && r.message) || "Could not save." }); });
    };
    const groups = __PG.concat([{ k: "main", t: "MAIN SUPPLY — TORRENT", c: C.ink }]).map((g) => ({ g, ms: P.meters.filter((m) => (m.grp === "main" ? "main" : __PG.some((x) => x.k === m.grp) ? m.grp : "other") === g.k) })).filter((x) => x.ms.length);
    const ro = !canEdit;
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 } },
        __sel(dt, pick, ds.slice().reverse().map((x) => [x, __dl(x) + (P.entered.indexOf(x) >= 0 ? " ✓" : "")])),
        React.createElement("span", { style: { fontSize: 11.5, color: C.mut } }, ro ? "Read only — you have no right to enter meter readings." : "Enter the closing reading — kWh = (reading − last reading) × MF is filled in; or type the kWh directly.")),
      groups.map((G) => __gap(React.createElement(Section, { key: G.g.k, title: G.g.t, pad: false },
        G.ms.map((m) => { const r = rows[m.code] || {}; const lb = lastBefore(m.code); const needProd = m.prod === "own";
          return React.createElement("div", { key: m.code, style: { padding: "9px 14px", borderTop: "1px solid " + C.line } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" } },
              React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.ink } }, m.name, React.createElement("span", { style: { fontSize: 10.5, color: C.mut, fontWeight: 600 } }, "  " + m.code + (m.mf && m.mf !== 1 ? " · MF " + m.mf : ""))),
              React.createElement("span", { style: { fontSize: 11, color: C.mut } }, lb ? "last " + fm(lb.r) + " on " + __dl(lb.dt) : "no earlier reading")),
            ro ? React.createElement("div", { style: { fontSize: 12, color: C.slate, marginTop: 4 } }, [r.reading ? "reading " + r.reading : "", r.kwh ? r.kwh + " kWh" : "", r.prod ? r.prod + " m" : "", r.remark].filter(Boolean).join(" · ") || "—")
              : React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 } },
                __inp(r.reading, (v) => set(m.code, "reading", v), "Reading", 104), __inp(r.kwh, (v) => set(m.code, "kwh", v), "kWh", 84),
                r.auto && r.kwh !== "" ? React.createElement("span", { style: { fontSize: 10, fontWeight: 800, color: C.teal } }, "AUTO") : null,
                needProd ? __inp(r.prod, (v) => set(m.code, "prod", v), "Prod. m", 84) : null,
                __inp(r.hrs, (v) => set(m.code, "hrs", v), "Hrs", 56),
                __inp(r.remark, (v) => set(m.code, "remark", v), "Remark", mobile ? 120 : 160, "text")));
        })))),
      __gap(React.createElement(Section, { title: "Remarks — machine down time", pad: false },
        down.map((x, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 14px", borderTop: "1px solid " + C.line } },
          ro ? React.createElement("span", { style: { fontSize: 12, color: C.slate } }, [x.machine, x.shift, x.mins ? x.mins + " min" : "", x.remark].filter(Boolean).join(" · "))
            : [__h("span", { key: "a" }, __inp(x.machine, (v) => setDown(down.map((y, j) => (j === i ? Object.assign({}, y, { machine: v }) : y))), "Machine", 100, "text")),
              __h("span", { key: "b" }, __inp(x.shift, (v) => setDown(down.map((y, j) => (j === i ? Object.assign({}, y, { shift: v }) : y))), "Shift", 60, "text")),
              __h("span", { key: "c" }, __inp(x.mins, (v) => setDown(down.map((y, j) => (j === i ? Object.assign({}, y, { mins: v }) : y))), "Min", 60)),
              __h("span", { key: "d" }, __inp(x.remark, (v) => setDown(down.map((y, j) => (j === i ? Object.assign({}, y, { remark: v }) : y))), "Remark", mobile ? 140 : 220, "text")),
              __h("button", { key: "e", onClick: () => setDown(down.filter((y, j) => j !== i)), style: { border: "none", background: "transparent", color: C.rose, fontSize: 14, cursor: "pointer" } }, "✕")])),
        !down.length ? React.createElement("div", { style: { padding: "10px 14px", fontSize: 12, color: C.mut } }, "No down time noted for this day.") : null,
        !ro ? React.createElement("div", { style: { padding: "8px 14px", borderTop: "1px solid " + C.line } }, __btn("+ REMARK", () => setDown(down.concat([{ machine: "", shift: "", mins: "", remark: "" }])), "line")) : null)),
      !ro ? React.createElement("div", { style: { marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, __btn("SAVE " + __dl(dt).toUpperCase(), save, null, busy), __msg(msg)) : null);
  }

  function LivePowerMeters({ mobile, data, onSaved }) {
    const [list, setList] = useState(() => (data.meters || []).map((m) => Object.assign({}, m, { mf: String(m.mf), machines: String(m.machines), sort: String(m.sort) })));
    const [rate, setRate] = useState(String(data.rate || 9.57));
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const upd = (i, k, v) => setList(list.map((m, j) => (j === i ? Object.assign({}, m, { [k]: v }) : m)));
    const save = () => { setBusy(true); setMsg(null);
      __api("expense/electricity/meters/save", { rate: Number(rate), meters: list.map((m) => ({ code: m.code, name: m.name, grp: m.grp, mf: Number(m.mf) || 1, machines: Number(m.machines) || 0, prod: m.prod, sort: Number(m.sort) || 99, active: m.active !== false })) })
        .then(function (r) { setBusy(false); if (r && r.success) { setMsg({ ok: true, text: "Meters saved." }); onSaved(); } else setMsg({ ok: false, text: (r && r.message) || "Could not save." }); }); };
    return React.createElement("div", null,
      !data.meters_saved ? __gap(React.createElement("div", { style: { background: C.indigoSoft, color: C.indigoDark, borderRadius: 12, padding: "10px 13px", fontSize: 12, fontWeight: 700, lineHeight: 1.5 } }, "These meter groups are the default list from the daily power report (jets, stenters, borings, R.O., FBC, thermopack, compressors, Pengda, Torrent). Check them and SAVE once — then they are yours.")) : null,
      __gap(React.createElement(Section, { title: "Unit rate", pad: true }, React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, __inp(rate, setRate, "₹/kWh", 80), React.createElement("span", { style: { fontSize: 12, color: C.mut } }, "₹ per kWh (Torrent unit charge)")))),
      __gap(React.createElement(Section, { title: list.length + " meter groups", pad: false },
        list.map((m, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 14px", borderTop: "1px solid " + C.line, opacity: m.active === false ? 0.5 : 1 } },
          __inp(m.code, (v) => upd(i, "code", v.toUpperCase()), "Code", 72, "text"), __inp(m.name, (v) => upd(i, "name", v), "Name", mobile ? 150 : 190, "text"),
          __sel(m.grp, (v) => upd(i, "grp", v), __GRP_OPTS), __sel(m.prod, (v) => upd(i, "prod", v), __PROD_OPTS),
          React.createElement("span", { style: { fontSize: 10.5, color: C.mut } }, "MF"), __inp(m.mf, (v) => upd(i, "mf", v), "MF", 58),
          React.createElement("span", { style: { fontSize: 10.5, color: C.mut } }, "M/C"), __inp(m.machines, (v) => upd(i, "machines", v), "#", 48),
          React.createElement("span", { style: { fontSize: 10.5, color: C.mut } }, "ORDER"), __inp(m.sort, (v) => upd(i, "sort", v), "#", 52),
          React.createElement("label", { style: { fontSize: 11, color: C.slate, display: "inline-flex", alignItems: "center", gap: 4 } }, React.createElement("input", { type: "checkbox", checked: m.active !== false, onChange: (e) => upd(i, "active", e.target.checked) }), "active"))),
        React.createElement("div", { style: { padding: "8px 14px", borderTop: "1px solid " + C.line } }, __btn("+ METER", () => setList(list.concat([{ code: "", name: "", grp: "other", prod: "none", mf: "1", machines: "0", sort: "99", active: true }])), "line")))),
      React.createElement("div", { style: { marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, __btn("SAVE METERS", save, "indigo", busy), __msg(msg)),
      __note("MF = multiplying factor of the meter (kWh = reading difference × MF). Production basis decides the ₹/m of the meter. Switch a meter off instead of deleting it — its old readings stay."));
  }
