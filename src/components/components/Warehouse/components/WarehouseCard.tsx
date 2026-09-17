import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");

const SCREEN_PADDING = 12;
const CARD_GAP = 12;
const CARD_WIDTH = (width - SCREEN_PADDING * 2 - CARD_GAP) / 2;


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

  const usedPercent = Number(
    item.occup_perc ||
    item.occupPerc ||
    item.occupancy_perc ||
    item.OccupPerc ||
    (capacity > 0 ? (occupancy / capacity) * 100 : 0)
  );

  const isFull = usedPercent >= 100;
  const isEmpty = usedPercent <= 0;

  const statusColor = isFull ? "#e5252a" : isEmpty ? "#9badbf" : "#18a852";
  const progressWidth = `${Math.min(Math.max(usedPercent, 0), 100)}%`;

  return (
    <View style={styles.card}>
      <View style={[styles.leftStripe, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.location}>
            {locationName}
          </Text>


          <TouchableOpacity
            onPress={() => onMenu(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="more-vert" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.capacity}>
          {capacity}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Location In</Text>
          <Text style={styles.value}>{locationIn}</Text>
        </View>

        {/* <View style={styles.row}>
          <Text style={styles.label}>Occupancy</Text>
          <Text style={styles.value}>{occupancy.toFixed(2)}</Text>
        </View> */}

        {/* <View style={styles.row}>
          <Text style={styles.label}>Used %</Text>
          <Text style={styles.value}>{usedPercent.toFixed(2)}%</Text>
        </View> */}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        <Text style={styles.footer}>
          {occupancy.toFixed(0)}/{capacity}
        </Text>
      </View>
    </View>
  );
}

const styles = {
  card: {
    width: CARD_WIDTH,
    height: 140,
    backgroundColor: "#fff",
    borderRadius: 22,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  leftStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },

  content: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  location: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    color: "#087d70",
    marginRight: 6,
  },

  capacity: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    color: "#071126",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
    color: "#64748b",
  },

  value: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    color: "#071126",
  },

  progressTrack: {
    height: 6,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    marginTop: 4,
  },

  progressFill: {
    height: 6,
    borderRadius: 10,
  },

  footer: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    color: "#344154",
    marginTop: 6,
  },
};