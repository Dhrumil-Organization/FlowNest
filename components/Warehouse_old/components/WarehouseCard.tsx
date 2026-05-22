import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function WarehouseCard({ item, onMenu }) {
  const capacity = Number(item.capacity || item.Capacity || item.cap || 0);
  const locationName =
    item.location ||
    item.locationName ||
    item.Location ||
    item.LocationName ||
    "-";

  const locationIn = Number(
    item.locationin ||
    item.LocationIn ||
    item.used ||
    item.Used ||
    item.occupancy ||
    0
  );

  const occupancy = Number(item.occupancy || item.Occupancy || locationIn || 0);

  const occupPerc = Number(
    item.occup_perc ||
    item.occupPerc ||
    item.occupancy_perc ||
    item.OccupPerc ||
    (capacity > 0 ? (occupancy / capacity) * 100 : 0)
  );

  const isFull = capacity > 0 && occupancy >= capacity;
  const isEmpty = occupancy <= 0;

  const progressWidth = `${Math.min(Math.max(occupPerc, 0), 100)}%`;

  return (
    <View
      style={[
        styles.card,
        isFull ? styles.cardDanger : isEmpty ? styles.cardEmpty : styles.cardNormal,
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.location}>
            {locationName}
          </Text>
          <Text style={styles.capacity}>{capacity}</Text>
        </View>

        <TouchableOpacity
          onPress={() => onMenu(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="more-vert" size={23} color="#334155" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Location In</Text>
        <Text style={styles.value}>{locationIn}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Occupancy</Text>
        <Text style={styles.value}>{occupancy.toFixed(2)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Used %</Text>
        <Text style={styles.value}>{occupPerc.toFixed(2)}%</Text>
      </View>

      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            isFull ? styles.progressDanger : styles.progressNormal,
            { width: progressWidth },
          ]}
        />
      </View>

      <Text style={styles.footer}>
        {occupancy}/{capacity}
      </Text>
    </View>
  );
}

const styles = {
  card: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  cardNormal: {
    borderLeftWidth: 5,
    borderLeftColor: "#16a34a",
  },

  cardDanger: {
    borderLeftWidth: 5,
    borderLeftColor: "#dc2626",
  },

  cardEmpty: {
    borderLeftWidth: 5,
    borderLeftColor: "#94a3b8",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  capacity: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0f172a",
  },

  location: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f766e",
    marginTop: 3,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  label: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
  },

  value: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "900",
  },

  progressBg: {
    height: 7,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: 7,
    borderRadius: 20,
  },

  progressNormal: {
    backgroundColor: "#16a34a",
  },

  progressDanger: {
    backgroundColor: "#dc2626",
  },

  footer: {
    marginTop: 8,
    fontSize: 12,
    color: "#475569",
    fontWeight: "800",
  },
};