import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";

// ─── Seed data (replace with your API later) ───────────────────────────────
const CATS = ["Linen Shirting", "Sportswear", "Linen Suiting", "Dress Material"];

const YARNS = [
  { id: "Y01", name: "20 Lea Linen" },
  { id: "Y02", name: "30 Lea Linen" },
  { id: "Y03", name: "40 Lea Linen" },
  { id: "Y04", name: "60 Lea Linen" },
  { id: "Y06", name: "30 Ne L/C" },
  { id: "Y07", name: "40 Ne L/C" },
  { id: "Y11", name: "20s Cotton" },
  { id: "Y12", name: "40s Cotton" },
  { id: "Y14", name: "75D Polyester" },
  { id: "Y16", name: "150 Mestre" },
  { id: "Y19", name: "75/72FD Roto HIM" },
];

// ─── Tiny shared components ─────────────────────────────────────────────────
function Label({ text, sub }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{text}</Text>
      {sub ? <Text style={styles.labelSub}>{sub}</Text> : null}
    </View>
  );
}

function Input({ label, sub, value, onChange, placeholder, suffix, keyboardType }) {
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} sub={sub} />
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          keyboardType={keyboardType || "default"}
          style={[styles.input, suffix ? { flex: 1 } : null]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} />
      <View style={styles.segRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segBtn, value === opt.value && styles.segBtnActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segText, value === opt.value && styles.segTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} />
      <View style={styles.chipRowWrap}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Yarn row (warp or weft) ─────────────────────────────────────────────────
function YarnRow({ yarn, kind, onUpdate, onRemove }) {
  const yarnObj = YARNS.find((y) => y.id === yarn.miId) || {};
  const countField = kind === "warp" ? "epi" : "ppi";

  return (
    <View style={styles.yarnCard}>
      {/* Yarn picker */}
      <View style={styles.fieldWrap}>
        <Label text="Yarn" />
        <View style={styles.yarnPickerRow}>
          {YARNS.map((y) => (
            <TouchableOpacity
              key={y.id}
              style={[styles.yarnChip, yarn.miId === y.id && styles.yarnChipActive]}
              onPress={() => onUpdate({ miId: y.id })}
            >
              <Text
                style={[styles.yarnChipText, yarn.miId === y.id && styles.yarnChipTextActive]}
                numberOfLines={1}
              >
                {y.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Input
            label={kind === "warp" ? "EPI" : "PPI"}
            value={yarn[countField]}
            onChange={(v) => onUpdate({ [countField]: v.replace(/[^0-9.]/g, "") })}
            placeholder={kind === "warp" ? "56" : "52"}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Blend ratio"
            value={yarn.br || ""}
            onChange={(v) => onUpdate({ br: v })}
            placeholder="e.g. 70/30"
          />
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MainFormScreen({ route, navigation }) {
  const editDesign = route?.params?.editDesign || null;
  const E = editDesign;

  // Form state
  const [code, setCode] = useState(E?.code || "");
  const [cat, setCat] = useState(E?.category || CATS[0]);
  const [type, setType] = useState(E?.type || "YD");
  const [weave, setWeave] = useState(E?.weave || "");
  const [basis, setBasis] = useState(E?.width_basis || "reed");
  const [reed, setReed] = useState(E?.reed_space != null ? String(E.reed_space) : "");
  const [greW, setGreW] = useState(E?.greige_width != null ? String(E.greige_width) : "");
  const [wsh, setWsh] = useState(E?.warp_shrink != null ? String(E.warp_shrink) : "");
  const [finW, setFinW] = useState(E?.fin_width != null ? String(E.fin_width) : "");
  const [gfsh, setGfsh] = useState(E?.gf_shrink != null ? String(E.gf_shrink) : "");
  const [warpWaste, setWarpWaste] = useState(E?.warp_waste != null ? String(E.warp_waste) : "");
  const [weftWaste, setWeftWaste] = useState(E?.weft_waste != null ? String(E.weft_waste) : "6");
  const [note, setNote] = useState(E?.note || "");

  const [warpRows, setWarpRows] = useState(
    E?.warp_yarns?.map((y) => ({ ...y, epi: String(y.epi || "") })) || []
  );
  const [weftRows, setWeftRows] = useState(
    E?.weft_yarns?.map((y) => ({ ...y, ppi: String(y.ppi || "") })) || []
  );

  const [saved, setSaved] = useState(false);

  // Helpers
  const num = (v) => parseFloat(v) || 0;

  const addRow = (kind) => {
    const newRow =
      kind === "warp"
        ? { miId: YARNS[0].id, br: "", epi: "" }
        : { miId: YARNS[0].id, br: "", ppi: "" };
    if (kind === "warp") setWarpRows((r) => [...r, newRow]);
    else setWeftRows((r) => [...r, newRow]);
  };

  const updateRow = (kind, i, patch) => {
    if (kind === "warp") setWarpRows((arr) => arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    else setWeftRows((arr) => arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (kind, i) => {
    if (kind === "warp") setWarpRows((arr) => arr.filter((_, j) => j !== i));
    else setWeftRows((arr) => arr.filter((_, j) => j !== i));
  };

  // Validation
  const widthOk = basis === "greige" ? num(greW) > 0 : num(reed) > 0;
  const canSave =
    code.trim().length > 0 &&
    widthOk &&
    warpRows.length > 0 &&
    weftRows.length > 0 &&
    warpRows.every((y) => num(y.epi) > 0) &&
    weftRows.every((y) => num(y.ppi) > 0);

  const handleSave = () => {
    const payload = {
      code: code.trim(),
      category: cat,
      type,
      weave,
      width_basis: basis,
      reed_space: num(reed),
      greige_width: basis === "greige" ? num(greW) : null,
      warp_shrink: num(wsh),
      fin_width: num(finW),
      gf_shrink: num(gfsh),
      warp_waste: num(warpWaste),
      weft_waste: num(weftWaste),
      warp_yarns: warpRows.map((y) => ({ miId: y.miId, br: y.br || null, epi: num(y.epi) })),
      weft_yarns: weftRows.map((y) => ({ miId: y.miId, br: y.br || null, ppi: num(y.ppi) })),
      note,
    };
    // TODO: call createMainDesign(payload) or updateMainDesign(E.id, payload)
    console.log("Save payload:", payload);
    setSaved(true);
  };

  // Success screen
  if (saved) {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Design saved</Text>
        <Text style={styles.successSub}>{code} has been added to the catalog.</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { marginTop: 20 }]}
          onPress={() => {
            setCode(""); setWeave(""); setReed(""); setWsh(""); setFinW(""); setGfsh("");
            setWarpRows([]); setWeftRows([]); setNote(""); setSaved(false);
          }}
        >
          <Text style={styles.saveBtnText}>+ New design</Text>
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

      {/* Edit banner */}
      {E && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>
            Editing <Text style={{ fontWeight: "700" }}>{E.code}</Text> — changes update the existing
            design; saved costings keep their snapshots.
          </Text>
        </View>
      )}

      {/* ── Identity ── */}
      <Text style={styles.sectionTitle}>Identity</Text>

      <Input label="Design code" value={code} onChange={setCode} placeholder="e.g. Cambridge" />

      <ChipRow label="Category" options={CATS} value={cat} onChange={setCat} />

      <SegmentedControl
        label="Dye type"
        options={[
          { value: "YD", label: "Yarn-dyed (YD)" },
          { value: "PD", label: "Piece-dyed (PD)" },
        ]}
        value={type}
        onChange={setType}
      />

      <Input
        label="Weave / structure"
        value={weave}
        onChange={setWeave}
        placeholder="e.g. Dobby — fine dobby"
      />

      {/* ── Width ── */}
      <Text style={styles.sectionTitle}>Width</Text>

      <SegmentedControl
        label="Width basis"
        options={[
          { value: "reed", label: "Reed space" },
          { value: "greige", label: "Greige width" },
        ]}
        value={basis}
        onChange={setBasis}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          {basis === "reed" ? (
            <Input label="Reed space" value={reed} onChange={setReed} placeholder="64" suffix={'"'} keyboardType="decimal-pad" />
          ) : (
            <Input label="Greige width" value={greW} onChange={setGreW} placeholder="60" suffix={'"'} keyboardType="decimal-pad" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Warp shrink" value={wsh} onChange={setWsh} placeholder="6" suffix="%" keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Finished width" value={finW} onChange={setFinW} placeholder="58" suffix={'"'} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Finish shrink" value={gfsh} onChange={setGfsh} placeholder="5" suffix="%" keyboardType="decimal-pad" />
        </View>
      </View>

      {/* ── Warp yarns ── */}
      <Text style={styles.sectionTitle}>Warp yarns</Text>
      {warpRows.map((y, i) => (
        <YarnRow
          key={i}
          yarn={y}
          kind="warp"
          onUpdate={(patch) => updateRow("warp", i, patch)}
          onRemove={() => removeRow("warp", i)}
        />
      ))}
      <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow("warp")}>
        <Text style={styles.addRowBtnText}>+ Add warp yarn</Text>
      </TouchableOpacity>

      {/* ── Weft yarns ── */}
      <Text style={styles.sectionTitle}>Weft yarns</Text>
      {weftRows.map((y, i) => (
        <YarnRow
          key={i}
          yarn={y}
          kind="weft"
          onUpdate={(patch) => updateRow("weft", i, patch)}
          onRemove={() => removeRow("weft", i)}
        />
      ))}
      <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow("weft")}>
        <Text style={styles.addRowBtnText}>+ Add weft yarn</Text>
      </TouchableOpacity>

      {/* ── Wastage ── */}
      <Text style={styles.sectionTitle}>Wastage</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Warp wastage" value={warpWaste} onChange={setWarpWaste} placeholder="0" suffix="%" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Weft wastage" value={weftWaste} onChange={setWeftWaste} placeholder="6" suffix="%" keyboardType="decimal-pad" />
        </View>
      </View>

      {/* ── Notes ── */}
      <Text style={styles.sectionTitle}>Notes</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Any remarks about this design…"
        placeholderTextColor="#aaa"
        multiline
        style={styles.textarea}
      />

      {/* ── Save ── */}
      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={canSave ? handleSave : undefined}
        activeOpacity={canSave ? 0.8 : 1}
      >
        <Text style={[styles.saveBtnText, !canSave && { color: "#aaa" }]}>
          {E ? "Update design" : "Save design"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const COPPER = "#C97A1A";
const BORDER = "#ddd";
const BG = "#F8F7F4";
const SURFACE = "#fff";
const INK = "#1a1a1a";
const MUTED = "#888";

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

  // Field & label
  fieldWrap: { gap: 4 },
  label: { fontSize: 12.5, fontWeight: "600", color: INK },
  labelSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  // Text input
  inputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  suffix: { fontSize: 13, color: MUTED, paddingRight: 4 },

  // Segmented control
  segRow: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: SURFACE,
  },
  segBtnActive: { borderColor: COPPER, backgroundColor: "rgba(201,122,26,0.08)" },
  segText: { fontSize: 13, color: MUTED, fontWeight: "600" },
  segTextActive: { color: COPPER },

  // Chip row
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
  },
  chipActive: { borderColor: COPPER, backgroundColor: "rgba(201,122,26,0.08)" },
  chipText: { fontSize: 13, color: MUTED, fontWeight: "600" },
  chipTextActive: { color: COPPER },

  // Yarn card
  yarnCard: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  yarnPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  yarnChip: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: SURFACE,
    maxWidth: 140,
  },
  yarnChipActive: { borderColor: COPPER, backgroundColor: "rgba(201,122,26,0.08)" },
  yarnChipText: { fontSize: 12, color: MUTED, fontWeight: "600" },
  yarnChipTextActive: { color: COPPER },

  removeBtn: {
    borderWidth: 1.5,
    borderColor: "#fcc",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff5f5",
  },
  removeBtnText: { fontSize: 13, color: "#c0392b", fontWeight: "600" },

  // Add row button
  addRowBtn: {
    borderWidth: 1.5,
    borderColor: COPPER,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  addRowBtnText: { fontSize: 13, color: COPPER, fontWeight: "700" },

  // Textarea
  textarea: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: INK,
    backgroundColor: SURFACE,
    minHeight: 80,
    textAlignVertical: "top",
  },

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

  // Edit banner
  editBanner: {
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    backgroundColor: "rgba(201,122,26,0.07)",
    borderRadius: 10,
    padding: 12,
  },
  editBannerText: { fontSize: 12.5, color: INK, lineHeight: 18 },

  // Success
  successWrap: { flex: 1, padding: 40, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  successIcon: { fontSize: 40, color: "#27ae60", marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: "700", color: "#27ae60", marginBottom: 6 },
  successSub: { fontSize: 14, color: MUTED, textAlign: "center" },
});