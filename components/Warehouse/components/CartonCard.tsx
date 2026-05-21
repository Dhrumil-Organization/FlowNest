import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "./WarehouseStyles";

export default function CartonCard({
  item,
  selected,
  readonly = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={readonly ? 1 : 0.8}
      onPress={() => !readonly && onPress(item)}
      style={[
        local.card,
        selected && local.selectedCard,
      ]}
    >
      <View style={local.row}>
        {!readonly && (
          <Icon
            name={selected ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={selected ? COLORS.primary : COLORS.muted}
          />
        )}

        <View style={{ flex: 1, marginLeft: readonly ? 0 : 10 }}>
          <View style={local.topRow}>
            <Text style={local.carton}>{item.cartonNo}</Text>

            {item.isNew ? (
              <View style={local.badge}>
                <Text style={local.badgeText}>NEW</Text>
              </View>
            ) : null}
          </View>

          <Text style={local.line}>
            {item.tranType} | {item.vouNo}
          </Text>

          <Text style={local.line}>
            {item.itemName} | Grade: {item.gradeName}
          </Text>

          <Text style={local.line}>
            Merge: {item.mergeName} | Shade: {item.shadeName}
          </Text>
        </View>

        <Icon name="dots-vertical" size={22} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

const local = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  selectedCard: {
    backgroundColor: COLORS.selected,
    borderColor: COLORS.primary,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  carton: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  line: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2,
  },

  badge: {
    marginLeft: 8,
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  badgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "900",
  },
});