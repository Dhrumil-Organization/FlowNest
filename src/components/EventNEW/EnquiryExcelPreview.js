// EnquiryExcelPreview.js
// Excel preview + download for the Event Report Details screen (web + mobile).
// Renders the SAME sheet model that is written to the .xlsx file, so what the
// user sees here is what opens in Excel.
import AppAlert from "@/common/utils/appAlert";
import { Btn } from "@/src/components/erpUi";
import { T } from "@/src/theme";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { displayValue, modelToXlsxBytes, rowHeight } from "./eventExcelBuilder";
import { downloadExcel, shareExcel } from "./eventExcelSave";
import { ModalPanel } from "./ui";

const CHAR_PX = 7.4; // Excel column width unit -> px
const PT_PX = 1.3; // Excel row height (pt) -> px
const MAX_PREVIEW_ROWS = 300;

export default function EnquiryExcelPreview({ open, onClose, model }) {
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(""); // '' | 'download' | 'share'

  const sheet = model?.sheets?.[Math.min(tab, (model?.sheets?.length || 1) - 1)];
  const rows = useMemo(() => (sheet ? sheet.rows.slice(0, MAX_PREVIEW_ROWS) : []), [sheet]);
  const truncated = sheet ? sheet.rows.length > MAX_PREVIEW_ROWS : false;

  const run = async (kind) => {
    if (!model || busy) return;
    setBusy(kind);
    try {
      const bytes = modelToXlsxBytes(model);
      const res = kind === "share" ? await shareExcel(bytes, model.fileName) : await downloadExcel(bytes, model.fileName);
      if (res?.ok && res.message) AppAlert.alert("Excel ready", res.message);
      else if (res && !res.ok && !res.cancelled) AppAlert.alert("Excel export", res.message || "Could not save the Excel file.");
    } catch (err) {
      console.log("Excel export failed:", err);
      AppAlert.alert("Excel export", err?.message || "Could not create the Excel file.");
    } finally {
      setBusy("");
    }
  };

  if (!model) return null;
  const sum = model.summary;

  return (
    <ModalPanel
      open={open}
      onClose={onClose}
      wideMax={1180}
      eyebrow="EXCEL PREVIEW"
      title={model.title}
      subtitle={model.fileName}
      footer={
        <View style={styles.foot}>
          <Text style={styles.footNote} numberOfLines={2}>
            {sum.enquiries} enquiries · {sum.items} items · {sum.designs} designs
          </Text>
          {Platform.OS !== "web" ? (
            <Btn label="Share" icon="share" kind="ghost" compact onPress={() => run("share")} loading={busy === "share"} disabled={!!busy} />
          ) : null}
          <Btn
            label="Download Excel"
            icon="file-download"
            compact
            onPress={() => run("download")}
            loading={busy === "download"}
            disabled={!!busy}
            style={{ backgroundColor: EXCEL_GREEN }}
          />
        </View>
      }
    >
      <View style={styles.tabs}>
        {model.sheets.map((s, i) => {
          const on = i === tab;
          return (
            <TouchableOpacity
              key={s.name}
              onPress={() => setTab(i)}
              style={[styles.tab, on && styles.tabOn]}
              accessibilityRole="button"
              accessibilityLabel={`Sheet ${s.name}`}
            >
              <Icon name="grid-on" size={14} color={on ? "#fff" : T.nav} />
              <Text style={[styles.tabText, on && { color: "#fff" }]} numberOfLines={1}>
                {s.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.gridPad}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.sheet}>
            {rows.map((row, rIdx) => {
              let c = 0;
              return (
                <View key={rIdx} style={[styles.row, { minHeight: Math.round(rowHeight(sheet, row) * PT_PX) }]}>
                  {row.cells.map((x, i) => {
                    const span = x.span || 1;
                    let w = 0;
                    for (let k = c; k < c + span; k++) w += sheet.cols[k] || 10;
                    c += span;
                    const s = x.s || {};
                    return (
                      <View
                        key={i}
                        style={[
                          styles.cell,
                          { width: Math.round(w * CHAR_PX), backgroundColor: `#${s.bg || "FFFFFF"}` },
                          s.border && styles.cellBorder,
                        ]}
                      >
                        <Text
                          style={{
                            color: `#${s.fg || "1A1514"}`,
                            fontSize: (s.sz || 10) + 1.5,
                            fontWeight: s.bold ? "800" : "500",
                            fontStyle: s.italic ? "italic" : "normal",
                            textAlign: s.h || "left",
                          }}
                          numberOfLines={s.wrap ? 6 : 1}
                        >
                          {displayValue(x)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
        {truncated ? (
          <Text style={styles.more}>
            Preview shows the first {MAX_PREVIEW_ROWS} rows — the downloaded Excel has all {sheet.rows.length} rows.
          </Text>
        ) : null}
      </ScrollView>
    </ModalPanel>
  );
}

export const EXCEL_GREEN = "#1D6F42";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
    backgroundColor: T.surface,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  tabOn: { backgroundColor: T.nav, borderColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: "800", color: T.nav },
  gridPad: { padding: 12, paddingBottom: 24 },
  sheet: { borderWidth: 1, borderColor: T.border, backgroundColor: "#fff" },
  row: { flexDirection: "row", alignItems: "stretch" },
  cell: { justifyContent: "center", paddingHorizontal: 7, paddingVertical: 3 },
  cellBorder: { borderWidth: 0.5, borderColor: "#D9D2CA" },
  more: { marginTop: 10, fontSize: 12, fontWeight: "700", color: T.muted },
  foot: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  footNote: { flex: 1, minWidth: 120, fontSize: 12, fontWeight: "700", color: T.muted },
});
