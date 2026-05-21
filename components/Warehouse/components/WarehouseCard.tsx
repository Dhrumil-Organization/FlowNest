import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "./WarehouseStyles";

export default function WarehouseCard({ item, onMenu }) {
  const used = Number(item.used || 0);
  const capacity = Number(item.capacity || 0);

  let bg = COLORS.green;
  let textColor = "#000";

  if (capacity > 0 && used >= capacity) {
    bg = COLORS.red;
  }

  if (capacity <= 1 && used === 0) {
    bg = COLORS.grey;
  }

  return (
    <View style={[local.card, { backgroundColor: bg }]}>
      <View style={local.header}>
        <View>
          <Text style={[local.title, { color: textColor }]}>
            {item.capacity}
          </Text>

          <Text style={[local.count, { color: textColor }]}>
           location- {item.location}
          </Text>

          <Text style={[local.count, { color: textColor }]}>
           locationin- {item.locationin}
          </Text>

          <Text style={[local.count, { color: textColor }]}>
           occupancy- {item.occupancy}
          </Text>

          <Text style={[local.count, { color: textColor }]}>
           occup.perc- {item.occupancyperc}
          </Text>

          <Text style={[local.count, { color: textColor }]}>
            {used}/{capacity}
          </Text>

        </View>

        <TouchableOpacity onPress={() => onMenu(item)}>
          <Icon name="more-vert" size={26} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    minHeight: 86,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 17,
    fontWeight: "900",
  },

  count: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
  },
});