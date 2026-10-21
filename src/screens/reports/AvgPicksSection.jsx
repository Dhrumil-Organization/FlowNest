import { ConversionText as Text, ensureConversionWebFonts } from '../production/ConversionTypography';
ensureConversionWebFonts();
import AppAlert from '@/common/utils/appAlert';
// AvgPicksSection.js — React Native
// Ports the web "Avg Picks" module (Salary.js + AvgPicksCalendar.jsx) into a
// thin accordion that drops straight into ExpenseScreen.jsx, right below the
// month tabs. Same API, same payload shape, same validation/status logic.
//
// USAGE (inside ExpenseScreen.jsx):
//   import AvgPicksSection, { AvgPicksTab } from "./AvgPicksSection";
//   const [avgPicksOpen, setAvgPicksOpen] = useState(false);
//   ...
//   <AvgPicksTab expanded={avgPicksOpen} onPress={() => setAvgPicksOpen(o => !o)} />
//   <AvgPicksSection token={token} apiBase={apiBase} month={m} expanded={avgPicksOpen} />
//
// `month` must be one of the entries produced by buildSixMonths() in
// useExpenseData.js — it already carries { yearno, monthno, key, fullLabel }
// which is exactly what exp_costing_crud expects (prptype/yearno/monthno),
// so Avg Picks always stays in sync with whichever month tab is selected on
// the Expense screen — no separate month/year picker needed here.

import axios from "axios";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ── Theme (kept identical to ExpenseScreen.jsx's `C`) ─────────────
const C = {
  bg: "#F5F1EA",
  card: "#FFFFFF",
  soft: "#F8F4EE",
  soft2: "#FBF8F3",
  border: "#E5DED4",
  borderSoft: "#EFE8DE",
  ink: "#111827",
  text: "#1F2937",
  muted: "#8A8177",
  muted2: "#A69C91",
  copper: "#B77932",
  copperDark: "#9E6324",
  green: "#2F855A",
  amber: "#B7791F",
  red: "#C53030",
  blue: "#185FA5",
  blueBg: "#EAF2FA",
};

// ── Shared helpers (same behaviour as the web version) ────────────
const SKIP_KEYS = new Set([
  "prptype",
  "yearno",
  "txntype",
  "expdate",
  "monthno",
  "datenm",
  "action",
  "date",
]);

function parseNumericValue(val) {
  if (val === null || typeof val === "undefined" || val === "") return 0;
  const s = String(val).trim().replace(/,/g, "");
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return Math.abs(n % 1) < 1e-9 ? Math.trunc(n) : n;
}

function formatDateKeyFromApi(dateStr) {
  if (!dateStr) return dateStr;
  const s = String(dateStr).trim();
  if (/^\d{8}$/.test(s)) {
    const mm = s.slice(4, 6);
    const dd = s.slice(6, 8);
    const shortMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mIndex = parseInt(mm, 10) - 1;
    const short = shortMonths[mIndex] || mm;
    return `${String(parseInt(dd, 10))}-${short}`;
  }
  if (s.includes("-")) {
    const parts = s.split("-").map((p) => p.trim());
    let day = parts[0];
    let mon = parts[1] || parts[0];
    if (!/^\d{1,2}$/.test(day)) {
      if (/^\d{1,2}$/.test(parts[1])) {
        day = parts[1];
        mon = parts[0];
      } else {
        return s;
      }
    }
    day = String(day);
    mon = mon.slice(0, 3);
    mon = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
    return `${day}-${mon}`;
  }
  return s;
}

function isEmptyValue(v) {
  return v === "" || v === null || v === undefined || v === 0 || v === "0";
}

function prettyLabel(s) {
  if (!s) return s;
  return s
    .split("_")
    .map((part) => {
      if (part === part.toUpperCase() && part.length <= 4) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

// ── Single day card (view + expandable edit form) ─────────────────
function DayCard({
  row,
  groups,
  editable,
  isExpanded,
  onToggle,
  onChange,
  onClear,
  status,
}) {
  const dynamicAcronyms = useMemo(() => {
    const s = new Set();
    (groups || []).forEach((g) =>
      (g.children || []).forEach((key) => {
        const p = key.split("_")[0];
        if (p && p.length <= 6) s.add(p.toUpperCase());
      })
    );
    return s;
  }, [groups]);

  const titleCasePart = (p) => {
    const up = p.toUpperCase();
    if (dynamicAcronyms.has(up)) return up;
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  };

  const getLabels = (key) => {
    const parts = key.split("_").filter(Boolean);
    const lastRaw = parts[parts.length - 1] || key;
    const last =
      lastRaw.charAt(0).toUpperCase() + lastRaw.slice(1).toLowerCase();
    const lower = lastRaw.toLowerCase();
    const isLastOnly = lower === "looms" || lower === "luwa";
    const fullLabel = parts.map((p) => titleCasePart(p)).join(" ");
    return { isLastOnly, last, fullLabel };
  };

  const totals = useMemo(() => {
    const t = [];
    (groups || []).forEach((g) =>
      (g.children || []).forEach((key) => {
        const parts = key.split("_").filter(Boolean);
        const last = parts[parts.length - 1] || "";
        if (last.toLowerCase() === "total") {
          const label = parts.map((p) => titleCasePart(p)).join(" ");
          const raw = row && row[key] !== undefined ? row[key] : "";
          t.push({ key, label, value: isEmptyValue(raw) ? "" : raw });
        }
      })
    );
    return t;
  }, [groups, row]);

  const counts = useMemo(() => {
    const allKeys = [];
    (groups || []).forEach((g) =>
      (g.children || []).forEach((k) => allKeys.push(k))
    );
    const total = allKeys.length;
    const filled = allKeys.filter((k) => !isEmptyValue(row && row[k])).length;
    return { filled, total };
  }, [groups, row]);

  const borderByStatus = { complete: C.green, edited: C.amber, error: C.red };

  return (
    <View
      style={[
        avp.dayCard,
        status
          ? { borderColor: borderByStatus[status], borderWidth: 1.5 }
          : null,
      ]}
    >
      <TouchableOpacity
        style={avp.dayHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
          }}
        >
          <Text style={avp.dayDate}>{row.Date?.replace(/^0+/, "")}</Text>
          <View style={avp.badge}>
            <Text style={avp.badgeText}>
              {counts.filled}/{counts.total}
            </Text>
          </View>
          {editable && (
            <TouchableOpacity
              onPress={() => onClear(row.Date)}
              style={{ marginLeft: "auto", paddingHorizontal: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: C.red, fontSize: 12, fontWeight: "600" }}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text
          style={[
            avp.chevron,
            isExpanded && { transform: [{ rotate: "180deg" }] },
          ]}
        >
          ▾
        </Text>
      </TouchableOpacity>

      {totals.length > 0 && (
        <View style={avp.totalsRow}>
          {totals.map((t) => (
            <View key={t.key} style={avp.totalChip}>
              <Text style={avp.totalLabel}>{t.label}</Text>
              <Text style={avp.totalValue}>
                {t.value === "" ? "-" : String(t.value)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isExpanded && (
        <View style={avp.dayBody}>
          {(groups || []).map((g) => {
            const hasMultiple = g.children && g.children.length > 1;
            const hasLoomsChild = (g.children || []).some((k) => {
              const last = k.split("_").filter(Boolean).slice(-1)[0] || "";
              const ll = last.toLowerCase();
              return ll === "looms" || ll === "luwa";
            });
            const showGroupHeader = hasMultiple || hasLoomsChild;
            const groupHeader = g.group
              .split("_")
              .map((p) => titleCasePart(p))
              .join(" ");

            return (
              <View key={g.group} style={{ marginBottom: 10 }}>
                <View style={avp.groupBox}>
                  {showGroupHeader && (
                    <Text style={avp.groupHeaderText}>{groupHeader}</Text>
                  )}
                  <View style={avp.fieldGrid}>
                    {g.children.map((child) => {
                      const { isLastOnly, last, fullLabel } = getLabels(child);
                      return (
                        <View key={child} style={avp.fieldItem}>
                          <Text style={avp.fieldLabel}>
                            {isLastOnly ? last : fullLabel}
                          </Text>
                          <TextInput
                            style={[
                              avp.fieldInput,
                              !editable && avp.fieldInputDisabled,
                            ]}
                            editable={!!editable}
                            keyboardType="numeric"
                            value={
                              row[child] === undefined || row[child] === null
                                ? ""
                                : String(row[child])
                            }
                            onChangeText={(v) => onChange(row.Date, child, v)}
                            placeholder="0"
                            placeholderTextColor={C.muted2}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Main Avg Picks accordion body ──────────────────────────────────
export default function AvgPicksSection({
  token,
  apiBase,
  month,
  expanded,
  context,
  refresh
}) {
  const [mode, setMode] = useState("view"); // 'view' | 'edit'  (mirrors web's route type)
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [groups, setGroups] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [mainResponse, setMainResponse] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedDate, setExpandedDate] = useState(null);
  const [editedDates, setEditedDates] = useState(new Set());
  const [initialCompleteMap, setInitialCompleteMap] = useState({});
  const [initialRowMap, setInitialRowMap] = useState({});
  const lastFetchedKey = useRef(null);

  console.log("AvgPicksSection - context:", context);

  const currentKeys = useMemo(() => {
    const keys = [];
    (groups || []).forEach((g) =>
      (g.children || []).forEach((k) => keys.push(k))
    );
    return keys;
  }, [groups]);

  const filtered = useMemo(() => {
    if (!search) return tableData;
    const s = search.toLowerCase();
    return tableData.filter((r) => r.Date && r.Date.toLowerCase().includes(s));
  }, [search, tableData]);

  // ── Load (action:'view', txntype:'exp_costing_picks') — same payload as web ──
  const fetchMonthData = useCallback(async () => {
    if (!month || !token || !apiBase) return;
    setLoading(true);
    setLoaded(false);
    try {
      const payload = {
        prptype: context.prp_group,
        yearno: month.yearno,
        monthno: month.monthno,
        action: "view",
        txntype: "exp_costing_picks",
      };

      const res = await axios.post(`${apiBase}/api/exp_costing_crud`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        timeout: 60000,
      });

      const apiData = res.data?.data?.data || res.data?.data || [];

      const transformed = (apiData || [])
        .map((item) => {
          const out = {};
          const rawDate = item.datenm || item.Date || "";
          out.Date = formatDateKeyFromApi(rawDate);
          Object.keys(item).forEach((k) => {
            const keyLower = k.toLowerCase();
            if (SKIP_KEYS.has(keyLower)) return;
            const val = item[k];
            if (keyLower === "isempty") {
              out.isEmpty = String(val ?? "0");
              return;
            }
            out[k] = parseNumericValue(val);
          });
          return out;
        })
        .filter((it) => it && it.Date);

      // ── dynamic groups from whatever keys the API returned ──
      const allKeys = new Set();
      transformed.forEach((r) =>
        Object.keys(r).forEach((k) => {
          if (k === "Date" || k === "isEmpty") return;
          allKeys.add(k);
        })
      );
      const keysArr = Array.from(allKeys);
      const groupMap = {};
      keysArr.forEach((k) => {
        const parts = k.split("_");
        const grp = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : parts[0];
        if (!groupMap[grp]) groupMap[grp] = [];
        groupMap[grp].push(k);
      });
      const groupArray = Object.keys(groupMap).map((g) => ({
        group: g,
        children: groupMap[g],
      }));

      const rows = transformed.map((src) => {
        const row = { Date: src.Date };
        keysArr.forEach((k) => {
          row[k] = src[k] !== undefined && src[k] !== null ? src[k] : "";
        });
        if (src.isEmpty !== undefined) row.isEmpty = String(src.isEmpty);
        return row;
      });

      const getDay = (r) => {
        if (!r || !r.Date) return 0;
        const p = String(r.Date).split("-")[0];
        return Number.isNaN(Number(p)) ? 0 : Number(p);
      };
      rows.sort((a, b) => getDay(a) - getDay(b));

      const initMap = {};
      const initRowSnap = {};
      rows.forEach((row) => {
        const wasMarkedEmpty = row.isEmpty === "1" || row.isEmpty === 1;
        const complete = wasMarkedEmpty
          ? false
          : keysArr.every(
              (k) => row[k] !== "" && row[k] !== null && row[k] !== undefined
            );
        initMap[row.Date] = !!complete;

        const vals = {};
        keysArr.forEach((k) => {
          vals[k] = row[k] !== undefined && row[k] !== null ? row[k] : "";
        });
        initRowSnap[row.Date] = {
          isEmpty:
            row.isEmpty !== undefined
              ? String(row.isEmpty)
              : Object.values(vals).every((v) => isEmptyValue(v))
              ? "1"
              : "0",
          values: vals,
        };
      });

      setGroups(groupArray);
      setTableData(rows);
      setMainResponse(apiData);
      setEditedDates(new Set());
      setInitialCompleteMap(initMap);
      setInitialRowMap(initRowSnap);
      setExpandedDate(null);
      setLoaded(true);
    } catch (err) {
      console.error("[AvgPicks] fetch error:", err?.message || err);
      AppAlert.alert("Error", "Could not load Avg Picks data for this month.");
    } finally {
      setLoading(false);
    }
  }, [month, token, apiBase]);

  // Auto-load the first time the accordion is opened, and again whenever the
  // selected Expense-screen month tab changes while it's open.
  useEffect(() => {
    if (!expanded || !month) return;
    const fetchKey = month.key;
    if (lastFetchedKey.current !== fetchKey) {
      lastFetchedKey.current = fetchKey;
      setMode("view");
      fetchMonthData();
    }
  }, [expanded, month, fetchMonthData]);

  // ── status: complete / edited / error / '' — identical rules to web ──
  const computeStatusForRow = useCallback(
    (row) => {
      if (!row) return "";
      const keys = currentKeys;
      if (!keys.length) return "";
      const emptyKeys = keys.filter((k) => isEmptyValue(row[k]));
      const wasInitiallyComplete = !!initialCompleteMap[row.Date];

      if (emptyKeys.length === keys.length) return "";
      if (emptyKeys.length > 0) {
        if (editedDates.has(row.Date)) return "error";
        return "";
      }
      if (editedDates.has(row.Date)) return "edited";
      if (wasInitiallyComplete) return "complete";
      return "";
    },
    [currentKeys, editedDates, initialCompleteMap]
  );

  const statusMap = useMemo(() => {
    const map = {};
    tableData.forEach((r) => {
      map[r.Date] = computeStatusForRow(r);
    });
    return map;
  }, [tableData, computeStatusForRow]);

  const handleChange = useCallback((date, key, val) => {
    setTableData((prev) =>
      prev.map((r) => (r.Date === date ? { ...r, [key]: val } : r))
    );
    setEditedDates((prev) => {
      const s = new Set(prev);
      s.add(date);
      return s;
    });
  }, []);

  const handleClearRow = useCallback((date) => {
    AppAlert.alert(`Clear ${date}?`, "This will wipe all values for this date.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setTableData((prev) =>
            prev.map((r) => {
              if (!r || r.Date !== date) return r;
              const rowKeys = Object.keys(r).filter(
                (k) => k !== "Date" && k !== "isEmpty"
              );
              const newRow = { ...r };
              rowKeys.forEach((k) => {
                newRow[k] = "";
              });
              newRow.isEmpty = "1";
              return newRow;
            })
          );
          setEditedDates((prev) => {
            const s = new Set(prev);
            s.add(date);
            return s;
          });
        },
      },
    ]);
  }, []);

  const shallowEqualValues = (a, b, keysList) => {
    for (let i = 0; i < keysList.length; i++) {
      const k = keysList[i];
      const va = a && a[k] !== undefined && a[k] !== null ? String(a[k]) : "";
      const vb = b && b[k] !== undefined && b[k] !== null ? String(b[k]) : "";
      if (va !== vb) return false;
    }
    return true;
  };

  const buildGetMainMap = (resp) => {
    const map = new Map();
    (resp || []).forEach((item) => {
      if (!item || !item.Date) return;
      map.set(String(item.Date), { ...item });
    });
    return map;
  };

  const mergePayloadWithMain = (payloadRows, resp) => {
    const getMainMap = buildGetMainMap(resp);
    return payloadRows.map((pr) => {
      const dateKey = String(pr.Date);
      const merged = { Date: dateKey };
      Object.keys(pr).forEach((k) => {
        if (k === "Date") return;
        const v = pr[k];
        merged[k] = v === undefined || v === null ? "" : String(v);
      });
      const gm = getMainMap.get(dateKey);
      if (gm) {
        Object.keys(gm).forEach((k) => {
          if (k === "Date") return;
          if (!(k in merged)) merged[k] = gm[k];
        });
      }
      return merged;
    });
  };

  // ── Save (action:'edit'|'add', txntype:'exp_costing_picks', d1: rows) ──
  const SaveMonthData = useCallback(
    async (finalRowsToSend) => {
      if (!month || !token || !apiBase) return;
      setLoading(true);
      try {
        const params = {
          prptype: context.prp_group,
          yearno: month.yearno,
          monthno: month.monthno,
          action: mode === "edit" ? "edit" : "add",
          txntype: "exp_costing_picks",
          d1: finalRowsToSend,
        };
        const res = await axios.post(
          `${apiBase}/api/exp_costing_crud`,
          params,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            timeout: 60000,
          }
        );
        if (res.data?.success === true) {
          AppAlert.alert("Saved", res.data?.message || "Avg picks saved.");
          fetchMonthData();
        } else {
          AppAlert.alert("Error", res.data?.message || "Could not save.");
        }
      } catch (err) {
        console.error("[AvgPicks] save error:", err?.message || err);
        AppAlert.alert("Error", "Could not save Avg Picks data.");
      } finally {
        setLoading(false);
      }
    },
    [month, token, apiBase, mode, fetchMonthData]
  );

  // ── Save validation + add/delete/'' action derivation — identical to web ──
  const handleSave = useCallback(() => {
    const keys = currentKeys;
    const errors = [];
    const payloadRows = [];

    tableData.forEach((row) => {
      if (!row) return;
      const rowKeys = keys.filter((k) =>
        Object.prototype.hasOwnProperty.call(row, k)
      );
      if (rowKeys.length === 0) {
        payloadRows.push({ ...row, isEmpty: "1", action: "" });
        return;
      }
      const emptyList = rowKeys.filter((k) => isEmptyValue(row[k]));
      const currentIsEmpty = emptyList.length === rowKeys.length ? "1" : "0";

      const initial = initialRowMap[row.Date] || null;
      const initialIsEmpty = initial ? String(initial.isEmpty) : "1";
      const initialValues = initial ? initial.values : null;

      const userEdited =
        editedDates.has(row.Date) ||
        (initialValues
          ? !shallowEqualValues(initialValues, row, rowKeys)
          : false);

      let action = "";
      if (initialIsEmpty === "1" && currentIsEmpty === "1") {
        action = "";
      } else if (initialIsEmpty === "0" && currentIsEmpty === "1") {
        action = "delete";
      } else if (currentIsEmpty === "0") {
        action = initialIsEmpty === "1" ? "add" : userEdited ? "add" : "";
      }

      const payloadRow = { Date: row.Date };
      rowKeys.forEach((k) => {
        const v = row[k];
        payloadRow[k] = v === undefined || v === null ? "" : String(v);
      });
      payloadRow.isEmpty = currentIsEmpty;
      payloadRow.action = action;
      payloadRows.push(payloadRow);

      if (
        editedDates.has(row.Date) &&
        currentIsEmpty !== "1" &&
        emptyList.length > 0
      ) {
        errors.push({ Date: row.Date, missing: emptyList });
      }
    });

    if (errors.length) {
      const first = errors[0].Date;
      setExpandedDate(first);
      const lines = errors.map(
        (e) => `${e.Date}: ${e.missing.map(prettyLabel).join(", ")}`
      );
      AppAlert.alert(
        "Validation errors",
        `The following edited rows have missing fields:\n\n${lines.join(
          "\n"
        )}\n\nPlease fill these before saving.`
      );
      return;
    }

    const finalRowsToSend = mergePayloadWithMain(payloadRows, mainResponse);
    refresh();
    SaveMonthData(finalRowsToSend);
  }, [
    currentKeys,
    tableData,
    editedDates,
    initialRowMap,
    mainResponse,
    SaveMonthData,
  ]);

  const handleToggleDay = useCallback((date) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  }, []);

  if (!expanded) return null;

  return (
    <View style={avp.panel}>
      {loading && !loaded ? (
        <View style={{ paddingVertical: 30, alignItems: "center" }}>
          <ActivityIndicator color={C.copper} />
          <Text style={{ color: C.muted, marginTop: 8, fontSize: 12 }}>
            Loading avg picks…
          </Text>
        </View>
      ) : (
        <>
          <View style={avp.toolbar}>
            {/* <View style={avp.searchBox}>
              <Text style={{ color: C.muted, marginRight: 6 }}>🔎</Text>
              <TextInput
                style={avp.searchInput}
                placeholder="Search day (e.g. 12-Jun)"
                placeholderTextColor={C.muted2}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: C.muted, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View> */}

            <View style={avp.btnRow}>
              {mode === "view" ? (
                <TouchableOpacity
                  style={avp.btnOutline}
                  onPress={() => setMode("edit")}
                >
                  <Text style={avp.btnOutlineText}>✎ Modify</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={avp.btnPrimary} onPress={handleSave}>
                    <Text style={avp.btnPrimaryText}>💾 Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={avp.btnOutline}
                    onPress={() => setMode("view")}
                  >
                    <Text style={avp.btnOutlineText}>👁 View</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={avp.btnOutline} onPress={fetchMonthData}>
                <Text style={avp.btnOutlineText}>↻ Reload</Text>
              </TouchableOpacity>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={avp.emptyBox}>
              <Text style={{ color: C.muted, fontSize: 12 }}>
                No rows for this month / search.
              </Text>
            </View>
          ) : (
            filtered.map((row) => (
              <DayCard
                key={row.Date}
                row={row}
                groups={groups}
                editable={mode === "edit"}
                isExpanded={expandedDate === row.Date}
                onToggle={() => handleToggleDay(row.Date)}
                onChange={handleChange}
                onClear={handleClearRow}
                status={statusMap[row.Date] || ""}
              />
            ))
          )}
        </>
      )}
    </View>
  );
}

// ── Thin full-width trigger tab (place below the month tabs) ──────
export function AvgPicksTab({ expanded, onPress }) {
  return (
    <TouchableOpacity style={avp.tab} onPress={onPress} activeOpacity={0.75}>
      <Text style={avp.tabText}>Avg Picks</Text>
      <Text
        style={[
          avp.tabChevron,
          expanded && { transform: [{ rotate: "180deg" }] },
        ]}
      >
        ▾
      </Text>
    </TouchableOpacity>
  );
}

const avp = StyleSheet.create({
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 9,
    marginBottom: 10,
    gap: 6,
    width: "100%",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.copperDark,
    letterSpacing: 0.3,
  },
  tabChevron: { fontSize: 12, color: C.copperDark },

  panel: {
    backgroundColor: C.soft,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 10,
    marginBottom: 12,
  },
  toolbar: { marginBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.ink, padding: 0 },

  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  btnOutline: {
    borderWidth: 0.5,
    borderColor: C.copper,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnOutlineText: { color: C.copperDark, fontSize: 12, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: C.copper,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  emptyBox: { padding: 20, alignItems: "center" },

  dayCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.borderSoft,
    marginBottom: 8,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayDate: { fontSize: 13, fontWeight: "600", color: C.ink },
  badge: {
    backgroundColor: C.blueBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: C.blue },
  chevron: { fontSize: 13, color: C.muted },

  totalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  totalChip: {
    backgroundColor: C.blueBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 90,
  },
  totalLabel: { fontSize: 9, fontWeight: "700", color: C.blue },
  totalValue: { fontSize: 11, fontWeight: "700", color: C.ink, marginTop: 2 },

  dayBody: { borderTopWidth: 0.5, borderTopColor: C.borderSoft, padding: 10 },
  groupBox: { backgroundColor: C.soft2, borderRadius: 8, padding: 8 },
  groupHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.copperDark,
    marginBottom: 6,
  },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fieldItem: { width: "47%" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.text,
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: C.ink,
    backgroundColor: "#fff",
  },
  fieldInputDisabled: { backgroundColor: C.soft, color: C.muted },
});
