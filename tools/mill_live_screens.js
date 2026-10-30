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
    const [ym, setYm] = useState(__ym(new Date((__M.today || TODAY) + "T00:00:00")));
    const [d, setD] = useState(null);
    const [busy, setBusy] = useState(true);
    const [cat, setCat] = useState(null);
    const [acc, setAcc] = useState(null);
    const [vou, setVou] = useState(null);
    const [design, setDesign] = useState(false);
    useEffect(() => {
      let alive = true; setBusy(true); setCat(null); setAcc(null);
      __api("expense/summary", { month: ym, trend: 6 }).then(function (r) { if (alive) { setD(r); setBusy(false); } });
      return () => { alive = false; };
    }, [ym]);
    useEffect(() => {
      if (!acc) { setVou(null); return; }
      let alive = true; setVou({ loading: true });
      __api("expense/ledger", { month: ym, acccode: acc.acccode }).then(function (r) { if (alive) setVou(r); });
      return () => { alive = false; };
    }, [acc, ym]);

    if (design) return React.createElement("div", null, React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setDesign(false), label: "LIVE EXPENSE" })), __demoBanner("This coal / FBC / electricity detail"), React.createElement(ExpenseScreen, { mobile }));

    const data = d && d.success ? d.data : null;
    const bill = data && data.billing ? data.billing.amount : null;
    const pct = (x) => (bill ? (x / bill * 100) : null);
    const monthNav = React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, -1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "‹"),
      React.createElement(Chip, { text: (data ? data.month + " · " + data.days + " DAYS" : ym) }),
      React.createElement("button", { onClick: () => setYm(__shiftYm(ym, 1)), style: { border: "1px solid " + C.line, background: "#fff", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontWeight: 800, color: C.indigoDark } }, "›"),
      bill != null ? React.createElement(Chip, { text: "BILLING " + inr(bill), bg: C.greenSoft, fg: C.green }) : null);
    const head = __liveHead("Monthly Expense", "Live from Mills accounts — billing = process invoices, expense = ledger of the expense heads. Tap a line to go deeper.", mobile, monthNav);

    if (busy) return React.createElement("div", null, head, __loadingBox());
    if (!data) return React.createElement("div", null, head, __errBox("Monthly expense could not be read from Mills — " + ((d && (d.message || "")) + (d && d.data && d.data.errors ? " · " + d.data.errors.join(" | ") : ""))));

    const errs = (data.errors || []).length ? __errBox("Notes from Mills: " + data.errors.join(" | ")) : null;

    // ── detail: one account's vouchers ──
    if (cat && acc) {
      const rows = vou && vou.success && vou.data ? (vou.data.rows || []) : null;
      return React.createElement("div", null,
        React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setAcc(null), label: cat.label.toUpperCase() })),
        __liveHead(acc.accname, data.month + " · " + (acc.shead || acc.mhead) + " · " + inr(acc.amount), mobile),
        !vou || vou.loading ? __loadingBox() : !rows ? __errBox("Vouchers could not be read — " + (vou.message || "")) :
        React.createElement(Section, { title: rows.length + " entries", pad: false },
          rows.map(function (r, i) {
            const amt = Number(r.dramt || 0) - Number(r.cramt || 0);
            return __rowBtn(i, null, (r.date || r.trandate) + "  " + (r.type || "") + " " + (r.vouno || ""), inr(amt), [r.ptcl, r.narr, r.docno].filter(Boolean).join(" · "), null, null);
          })));
    }
    // ── specific: accounts of one category ──
    if (cat) {
      return React.createElement("div", null,
        React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(ExpBack, { onBack: () => setCat(null) })),
        __liveHead(cat.label, data.month + " · " + inr(cat.amount) + (bill ? " · " + pct(cat.amount).toFixed(1) + "% of billing" : ""), mobile),
        React.createElement(Section, { title: cat.accounts.length + " ledger accounts", pad: false },
          cat.accounts.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No entries in this month.") :
          cat.accounts.map(function (a) {
            return __rowBtn(a.acccode, () => setAcc(a), a.accname, inr(a.amount), (a.shead || "") + (a.mhead ? " · " + a.mhead : "") + (a.type ? " · " + (a.type === "DE" ? "direct" : "indirect") : ""), cat.amount ? a.amount / cat.amount * 100 : null, __CATC[cat.key]);
          })));
    }
    // ── general ──
    const cats = (data.categories || []).filter(function (c) { return c.amount !== 0 || c.accounts.length; }).sort(function (a, b) { return b.amount - a.amount; });
    const trend = data.trend || [];
    const maxT = Math.max.apply(null, trend.map(function (t) { return t.billing ? t.expense / t.billing * 100 : 0; }).concat([1]));
    return React.createElement("div", null, head, errs,
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 14 } },
        React.createElement(Kpi, { mobile, label: "Billing", value: bill != null ? inr(bill) : "—", sub: data.billing ? data.billing.invoices + " process invoices" : "process invoices not found", accent: C.green }),
        React.createElement(Kpi, { mobile, label: "Total expense", value: inr(data.total), sub: "ledger · expense heads", accent: C.ink }),
        React.createElement(Kpi, { mobile, label: "Expense of billing", value: bill ? pct(data.total).toFixed(1) + "%" : "—", sub: "billing = 100%", accent: C.amber }),
        React.createElement(Kpi, { mobile, label: "Balance", value: bill != null ? inr(bill - data.total) : "—", sub: bill ? (100 - pct(data.total)).toFixed(1) + "% of billing" : "", accent: C.teal })),
      React.createElement(Section, { title: "Where the billing goes", pad: false, right: React.createElement(Chip, { text: "TAP FOR DETAIL" }) },
        cats.length === 0 ? React.createElement("div", { style: { padding: 14, fontSize: 12.5, color: C.mut } }, "No expense entries in this month.") :
        cats.map(function (c) { return __rowBtn(c.key, () => setCat(c), c.label, inr(c.amount) + (bill ? "  " + pct(c.amount).toFixed(1) + "%" : ""), c.accounts.length + " accounts", bill ? pct(c.amount) : null, __CATC[c.key]); })),
      React.createElement("div", { style: { marginTop: 14 } },
        React.createElement(Section, { title: "Expense vs billing — " + trend.length + " months" },
          React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: mobile ? 8 : 16, height: 120 } },
            trend.map(function (t, i) {
              const p = t.billing ? t.expense / t.billing * 100 : null;
              const last = i === trend.length - 1;
              return React.createElement("div", { key: t.ym, onClick: () => setYm(t.ym.slice(0, 4) + "-" + t.ym.slice(4, 6)), style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", cursor: "pointer" } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: last ? C.ink : C.mut, marginBottom: 3 } }, p != null ? p.toFixed(1) + "%" : inr(t.expense)),
                React.createElement("div", { style: { width: "70%", height: (p != null ? Math.max(4, p / maxT * 80) : 6) + "px", borderRadius: 5, background: last ? C.indigo : "#c7d2fe" } }),
                React.createElement("div", { style: { fontSize: 10, color: C.mut, marginTop: 4, fontWeight: 700 } }, t.month));
            })),
          React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 6 } }, "Expense as a percent of that month's billing. Tap a month to open it."))),
      React.createElement("div", { style: { fontSize: 11, color: C.mut, marginTop: 14, lineHeight: 1.6 } },
        "Source: ledger in ", (data.source && data.source.ledger) || "?", ", billing in ", (data.source && data.source.billing) || "not found",
        ". Categories come from the account / head names — every account is listed under its category so you can check it. ",
        React.createElement("span", { onClick: () => setDesign(true), style: { color: C.indigo, fontWeight: 700, cursor: "pointer" } }, "Coal FBC / optimiser / electricity design pages (not connected) ›")));
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
