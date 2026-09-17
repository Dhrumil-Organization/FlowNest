import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";
import { styles } from "./WarehouseStyles";

export default function WarehouseHeader({ title, navigation, rightIcon, onRightPress, menu = false }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIcon}
        activeOpacity={0.8}
        onPress={() => (menu ? navigation?.openDrawer?.() : navigation?.goBack?.())}
      >
        <Icon name={menu ? "menu" : "arrow-back"} size={25} color="#fff" />
      </TouchableOpacity>

      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>

      <TouchableOpacity style={styles.headerIcon} activeOpacity={0.8} onPress={onRightPress} disabled={!rightIcon}>
        {rightIcon ? <Icon name={rightIcon} size={24} color="#fff" /> : null}
      </TouchableOpacity>
    </View>
  );
}
