import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";

// ─── Shade library (from DesignsSeeder) ──────────────────────────────────────
const SHADES = [
  { id: "SC01", name: "Navy",       hex: "#1f2f5a" },
  { id: "SC02", name: "White",      hex: "#f3f0e9" },
  { id: "SC03", name: "Sky Blue",   hex: "#7fb3d5" },
  { id: "SC04", name: "Royal Blue", hex: "#1f4eb5" },
  { id: "SC05", name: "Black",      hex: "#161616" },
  { id: "SC06", name: "Charcoal",   hex: "#3c3c3c" },
];

// ─── Small shared components ─────────────────────────────────────────────────
function Label({ text, sub }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{text}</Text>
      {sub ? <Text style={styles.labelSub}>{sub}</Text> : null}
    </View>
  );
}

function Input({ label, sub, value, onChange, placeholder }) {
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} sub={sub} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        style={styles.input}
      />
    </View>
  );
}

// ─── Shade picker for one yarn row ───────────────────────────────────────────
function ShadePickerRow({ label, yarnName, selectedShade, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.shadePickerWrap}>
      {/* Row header */}
      <TouchableOpacity
        style={styles.shadePickerHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.shadeYarnName}>{yarnName}</Text>
          {selectedShade ? (
            <View style={styles.shadeSelectedRow}>
              <View style={[styles.shadeDot, { backgroundColor: selectedShade.hex }]} />
              <Text style={styles.shadeSelectedText}>{selectedShade.name}</Text>
            </View>
          ) : (
            <Text style={styles.shadeUnselected}>Tap to pick shade</Text>
          )}
        </View>
        {selectedShade && (
          <View style={[styles.shadeDotLg, { backgroundColor: selectedShade.hex }]} />
        )}
        <Text style={[styles.chevron, open && styles.chevronOpen]}>›</Text>
      </TouchableOpacity>

      {/* Shade grid */}
      {open && (
        <View style={styles.shadeGrid}>
          {/* None option */}
          <TouchableOpacity
            style={[
              styles.shadeOpt,
              !selectedShade && styles.shadeOptActive,
            ]}
            onPress={() => { onSelect(null); setOpen(false); }}
          >
            <View style={[styles.shadeDotLg, styles.shadeDotNone]} />
            <Text style={styles.shadeOptText}>None</Text>
          </TouchableOpacity>

          {SHADES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.shadeOpt,
                selectedShade && selectedShade.id === s.id && styles.shadeOptActive,
              ]}
              onPress={() => { onSelect(s); setOpen(false); }}
            >
              <View style={[styles.shadeDotLg, { backgroundColor: s.hex }]} />
              <Text style={styles.shadeOptText}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Color strip preview ──────────────────────────────────────────────────────
function ColorStrip({ colors, label }) {
  const withColor = colors.filter((c) => c.shade);
  if (!withColor.length) return null;
  return (
    <View style={styles.stripWrap}>
      <Text style={styles.stripLabel}>{label}</Text>
      <View style={styles.stripRow}>
        {withColor.map((c, i) => (
          <View key={i} style={styles.stripItem}>
            <View style={[styles.stripSwatch, { backgroundColor: c.shade.hex }]} />
            <Text style={styles.stripName}>{c.shade.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ColorwayFormScreen({ route, navigation }) {
  // Expect route.params = { design, editColorway }
  const design = route?.params?.design || {
    id: "MD01",
    code: "Passat",
    category: "Linen Shirting",
    type: "YD",
    weave: "Dobby — fine dobby",
    warp_yarns: [
      { miId: "Y03", name: "40 Lea Linen", br: null },
      { miId: "Y07", name: "40 Ne L/C",   br: "70/30" },
    ],
    weft_yarns: [
      { miId: "Y07", name: "40 Ne L/C", br: "70/30" },
    ],
  };
  const editColorway = route?.params?.editColorway || null;
  const E = editColorway;

  // Build initial color rows from the design's yarn structure
  const makeRows = (yarns, existingColors) =>
    yarns.map((y, i) => {
      const existing = existingColors && existingColors[i];
      return {
        miId: y.miId,
        yarnName: y.name + (y.br ? ` ${y.br}` : ""),
        shade: existing
          ? SHADES.find((s) => s.name === existing.name) || null
          : null,
      };
    });

  const [cwCode, setCwCode]               = useState(E?.code || "");
  const [commercial, setCommercial]       = useState(E?.commercial_name || "");
  const [warpColors, setWarpColors]       = useState(
    makeRows(design.warp_yarns, E?.warp_colors)
  );
  const [weftColors, setWeftColors]       = useState(
    makeRows(design.weft_yarns, E?.weft_colors)
  );
  const [saved, setSaved]                 = useState(false);

  const setWarpShade = (i, shade) =>
    setWarpColors((arr) => arr.map((r, j) => (j === i ? { ...r, shade } : r)));

  const setWeftShade = (i, shade) =>
    setWeftColors((arr) => arr.map((r, j) => (j === i ? { ...r, shade } : r)));

  const canSave = cwCode.trim().length > 0;

  const handleSave = () => {
    const payload = {
      code: cwCode.trim(),
      commercial_name: commercial.trim() || null,
      main_design_id: design.id,
      warp_colors: warpColors.map((r) => ({
        miId: r.miId,
        name: r.shade ? r.shade.name : null,
        hex: r.shade ? r.shade.hex : null,
      })),
      weft_colors: weftColors.map((r) => ({
        miId: r.miId,
        name: r.shade ? r.shade.name : null,
        hex: r.shade ? r.shade.hex : null,
      })),
    };
    // TODO: call createColorway(payload) or updateColorway(E.id, payload)
    console.log("Colorway payload:", payload);
    setSaved(true);
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (saved) {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Colorway saved</Text>
        <Text style={styles.successSub}>
          {cwCode} added to {design.code}.
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { marginTop: 24 }]}
          onPress={() => {
            setCwCode("");
            setCommercial("");
            setWarpColors(makeRows(design.warp_yarns, null));
            setWeftColors(makeRows(design.weft_yarns, null));
            setSaved(false);
          }}
        >
          <Text style={styles.saveBtnText}>+ Another colorway</Text>
        </TouchableOpacity>
        {navigation && (
          <TouchableOpacity
            style={[styles.saveBtn, styles.saveBtnSec, { marginTop: 10 }]}
            onPress={() => navigation.navigate("Catalog")}
          >
            <Text style={[styles.saveBtnText, { color: "#555" }]}>Back to catalog</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Parent design context banner */}
      <View style={styles.parentBanner}>
        <Text style={styles.parentDesignCode}>{design.code}</Text>
        <Text style={styles.parentDesignMeta}>
          {design.category}{"  ·  "}{design.type}{"  ·  "}{design.weave || "—"}
        </Text>
      </View>

      {/* Edit banner */}
      {E && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>
            Editing <Text style={{ fontWeight: "700" }}>{E.code}</Text>
          </Text>
        </View>
      )}

      {/* ── Identity ── */}
      <Text style={styles.sectionTitle}>Identity</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Colorway code"
            value={cwCode}
            onChange={setCwCode}
            placeholder="e.g. Passat 1"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Commercial name"
            sub="optional"
            value={commercial}
            onChange={setCommercial}
            placeholder="e.g. Navy"
          />
        </View>
      </View>

      {/* ── Warp colors ── */}
      <Text style={styles.sectionTitle}>Warp colors</Text>
      {warpColors.length === 0 ? (
        <Text style={styles.noYarnText}>No warp yarns on this design.</Text>
      ) : (
        warpColors.map((row, i) => (
          <ShadePickerRow
            key={i}
            label={`Warp yarn ${i + 1}`}
            yarnName={row.yarnName}
            selectedShade={row.shade}
            onSelect={(s) => setWarpShade(i, s)}
          />
        ))
      )}

      {/* ── Weft colors ── */}
      <Text style={styles.sectionTitle}>Weft colors</Text>
      {weftColors.length === 0 ? (
        <Text style={styles.noYarnText}>No weft yarns on this design.</Text>
      ) : (
        weftColors.map((row, i) => (
          <ShadePickerRow
            key={i}
            label={`Weft yarn ${i + 1}`}
            yarnName={row.yarnName}
            selectedShade={row.shade}
            onSelect={(s) => setWeftShade(i, s)}
          />
        ))
      )}

      {/* ── Preview ── */}
      {(warpColors.some((c) => c.shade) || weftColors.some((c) => c.shade)) && (
        <>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <ColorStrip colors={warpColors} label="Warp" />
            <ColorStrip colors={weftColors} label="Weft" />
          </View>
        </>
      )}

      {/* ── Save ── */}
      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={canSave ? handleSave : undefined}
        activeOpacity={canSave ? 0.8 : 1}
      >
        <Text style={[styles.saveBtnText, !canSave && { color: "#aaa" }]}>
          {E ? "Update colorway" : "Save colorway"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const COPPER = "#C97A1A";
const BORDER = "#e0ddd8";
const BG     = "#F8F7F4";
const SURFACE = "#fff";
const INK    = "#1a1a1a";
const MUTED  = "#888";
const SUB    = "#F3F1ED";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, gap: 12 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 2,
  },

  // Label
  fieldWrap: { gap: 4 },
  label: { fontSize: 12.5, fontWeight: "600", color: INK },
  labelSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  // Input
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: INK,
    backgroundColor: SURFACE,
  },

  // Parent banner
  parentBanner: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 12,
    gap: 3,
  },
  parentDesignCode: { fontSize: 15, fontWeight: "700", color: INK },
  parentDesignMeta: { fontSize: 12.5, color: MUTED },

  // Edit banner
  editBanner: {
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    backgroundColor: "rgba(201,122,26,0.07)",
    borderRadius: 10,
    padding: 12,
  },
  editBannerText: { fontSize: 13, color: INK },

  // Shade picker
  shadePickerWrap: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: "hidden",
  },
  shadePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  shadeYarnName: { fontSize: 13, fontWeight: "700", color: INK },
  shadeSelectedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  shadeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  shadeSelectedText: { fontSize: 12, color: MUTED },
  shadeUnselected: { fontSize: 12, color: "#bbb", marginTop: 3 },
  shadeDotLg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
  },
  shadeDotNone: { backgroundColor: "#eee", borderStyle: "dashed" },
  chevron: { fontSize: 20, color: MUTED },
  chevronOpen: { transform: [{ rotate: "90deg" }] },

  // Shade grid
  shadeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SUB,
  },
  shadeOpt: {
    alignItems: "center",
    gap: 5,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: SURFACE,
    minWidth: 68,
  },
  shadeOptActive: { borderColor: COPPER, backgroundColor: "rgba(201,122,26,0.07)" },
  shadeOptText: { fontSize: 11, color: INK, fontWeight: "600", textAlign: "center" },

  // No yarn text
  noYarnText: { fontSize: 13, color: MUTED, fontStyle: "italic", paddingVertical: 6 },

  // Preview card
  previewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  stripWrap: { gap: 6 },
  stripLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stripRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stripItem: { alignItems: "center", gap: 5 },
  stripSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  stripName: { fontSize: 11, color: INK, fontWeight: "600", textAlign: "center", maxWidth: 60 },

  // Save button
  saveBtn: {
    backgroundColor: COPPER,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnSec: { backgroundColor: "#eee" },
  saveBtnDisabled: { backgroundColor: "#ddd" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Success
  successWrap: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  successIcon: { fontSize: 40, color: "#27ae60", marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: "700", color: "#27ae60", marginBottom: 6 },
  successSub: { fontSize: 14, color: MUTED, textAlign: "center" },
});