
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
// import { T, CATS, catShort, TYPE_CFG } from "../../../utils/theme";

import { T, CATS, catShort, TYPE_CFG } from "../../../common/utils/theme";
import { listMainDesigns, listColorways, deleteMainDesign } from "../api/designsApi";

function TypeBadge({ type }) {
  const cfg = TYPE_CFG[type] || {};
  return (
    <View style={[styles.typeBadge, { backgroundColor: (cfg.color || T.muted) + "22" }]}>
      <Text style={[styles.typeBadgeText, { color: cfg.color || T.muted }]}>{cfg.abbr || type}</Text>
    </View>
  );
}

/** Colourway sub-row — shown inside the expanded design, listing its colourways. */
function ColorwayRow({ cw }) {
  const summary =
    cw.commercial_name ||
    [...(cw.warp_colors || []), ...(cw.weft_colors || [])]
      .map((c) => c.name)
      .filter(Boolean)
      .join(" / ") ||
    "—";
  return (
    <View style={styles.cwRow}>
      <Text style={styles.cwCode}>{cw.code}</Text>
      <Text style={styles.cwSummary}>{summary}</Text>
    </View>
  );
}

export default function CatalogScreen({navigation}) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [colorwaysByDesign, setColorwaysByDesign] = useState({});
  const [delAsk, setDelAsk] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMainDesigns({ category: cat, q });
      setDesigns(data);
    } catch (e) {
      Alert.alert("Couldn't load designs", e.message);
    } finally {
      setLoading(false);
    }
  }, [cat, q]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = async (d) => {
    const next = expanded === d.id ? null : d.id;
    setExpanded(next);
    if (next && !colorwaysByDesign[d.id]) {
      try {
        const cws = await listColorways(d.id);
        setColorwaysByDesign((m) => ({ ...m, [d.id]: cws }));
      } catch (e) {
        Alert.alert("Couldn't load colourways", e.message);
      }
    }
  };

  const handleDelete = async (d) => {
    try {
      await deleteMainDesign(d.id);
      setDelAsk(null);
      setExpanded(null);
      load();
    } catch (e) {
      if (e.status === 409 && e.body && e.body.refs) {
        const refsText = e.body.refs.map((r) => `${r.count} ${r.type}`).join(", ");
        Alert.alert("Can't delete", `${e.body.message}\nLinked: ${refsText}`);
      } else {
        Alert.alert("Delete failed", e.message);
      }
      setDelAsk(null);
    }
  };

  const renderItem = ({ item: d }) => {
    const isExpanded = expanded === d.id;
    const cws = colorwaysByDesign[d.id] || [];

    return (
      <View style={styles.cardWrap}>
        <TouchableOpacity style={styles.row} onPress={() => toggleExpand(d)}>
          <View style={styles.swatch} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.code}>{d.code}</Text>
              <TypeBadge type={d.type} />
            </View>
            <Text style={styles.meta}>
              {catShort(d.category)} · {d.warp_epi_total}×{d.weft_ppi_total} · {d.colorway_count} cw
            </Text>
          </View>
          {d.latest_cost ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.price}>₹{d.latest_cost}</Text>
              <Text style={styles.priceUnit}>per m</Text>
            </View>
          ) : null}
          <Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedArea}>
            {role === "owner" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => navigation.navigate("MainForm", { editDesign: d })}
                >
                  <Text style={styles.actionBtnOutlineText}>✎ Edit design</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnDanger}
                  onPress={() => setDelAsk(delAsk === d.id ? null : d.id)}
                >
                  <Text style={styles.actionBtnDangerText}>✕ Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            {delAsk === d.id && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Permanently delete <Text style={{ fontWeight: "800" }}>{d.code}</Text>? This cannot be undone.
                </Text>
                <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => handleDelete(d)}>
                  <Text style={styles.confirmDeleteBtnText}>Yes, delete {d.code}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ paddingTop: 8 }}>
              {cws.map((cw) => (
                <ColorwayRow key={cw.id} cw={cw} />
              ))}
              {cws.length === 0 && <Text style={styles.noCw}>No colourways yet.</Text>}
              <TouchableOpacity
                style={styles.addCwBtn}
                onPress={() => navigation.navigate("ColorwayForm", { baseDesignId: d.id })}
              >
                <Text style={styles.addCwBtnText}>+ Add colourway</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
        {[{ v: "ALL", l: "All" }, ...CATS.map((c) => ({ v: c, l: catShort(c) }))].map((o) => (
          <TouchableOpacity
            key={o.v}
            onPress={() => setCat(o.v)}
            style={[styles.catChip, cat === o.v && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, cat === o.v && styles.catChipTextActive]}>{o.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search design…"
          placeholderTextColor={T.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.copper} />
      ) : (
        <FlatList
          data={designs}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No designs match.</Text>}
          refreshing={loading}
          onRefresh={load}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 8, paddingHorizontal: 10 },
  catChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, marginRight: 6 },
  catChipActive: { backgroundColor: T.nav, borderColor: T.nav },
  catChipText: { fontSize: 12, fontWeight: "700", color: T.ink },
  catChipTextActive: { color: "#fff" },
  searchWrap: { padding: 10, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  searchInput: { borderWidth: 1.5, borderColor: T.border, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: T.ink, backgroundColor: T.surface },
  cardWrap: { borderBottomWidth: 1, borderBottomColor: T.border },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: T.surface, minHeight: 54 },
  swatch: { width: 46, height: 46, borderRadius: 8, backgroundColor: T.alt },
  code: { fontSize: 14, fontWeight: "700", color: T.ink },
  meta: { fontSize: 11, color: T.muted, marginTop: 2 },
  price: { fontFamily: "monospace", fontSize: 13, fontWeight: "700", color: T.green },
  priceUnit: { fontSize: 9, color: T.muted },
  chevron: { color: "#C0BCBA", fontSize: 13 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: "800" },
  expandedArea: { backgroundColor: T.surface, paddingHorizontal: 14, paddingBottom: 10, borderTopWidth: 1, borderTopColor: T.border, borderStyle: "dashed" },
  actionRow: { flexDirection: "row", gap: 8, paddingTop: 10 },
  actionBtnOutline: { flex: 1, padding: 9, borderRadius: 8, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.bg, alignItems: "center" },
  actionBtnOutlineText: { color: T.nav, fontSize: 10.5, fontWeight: "800" },
  actionBtnDanger: { flex: 1, padding: 9, borderRadius: 8, borderWidth: 1.5, borderColor: T.red, alignItems: "center" },
  actionBtnDangerText: { color: T.red, fontSize: 10.5, fontWeight: "800" },
  confirmBox: { backgroundColor: "#FDEBE8", borderWidth: 1, borderColor: "#E8B6AD", borderRadius: 8, padding: 10, marginTop: 8 },
  confirmText: { fontSize: 11, lineHeight: 17, marginBottom: 8, color: T.ink },
  confirmDeleteBtn: { backgroundColor: T.red, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  confirmDeleteBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  cwRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.alt },
  cwCode: { fontSize: 11.5, fontWeight: "700", color: T.copper, fontFamily: "monospace" },
  cwSummary: { fontSize: 11.5, color: T.ink, flex: 1 },
  noCw: { fontSize: 11, color: T.muted, paddingVertical: 6 },
  addCwBtn: { borderWidth: 1.5, borderColor: T.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 9, alignItems: "center", marginTop: 6 },
  addCwBtnText: { color: T.copper, fontWeight: "700", fontSize: 12 },
  empty: { padding: 40, textAlign: "center", color: T.muted, fontSize: 13 },
});
