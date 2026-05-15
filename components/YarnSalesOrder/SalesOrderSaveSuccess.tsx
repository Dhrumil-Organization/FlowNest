import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';

const SalesOrderSuccessScreen = ({ navigation, route }) => {
  const orderNo = route?.params?.orderNo || route?.params?.SONo || "SO-00000";

  console.log("rote values.. ", route)
  const uid = route?.params?.uid || route?.params?.UId || 0;
  const prpcode = route?.params?.prpcode || route?.params?.PrpCode || "";
  const yearno = route?.params?.yearno || route?.params?.YearNo || "";
  const strcode = route?.params?.strcode || route?.params?.StrCode || "";
  const token = route?.params?.token || route?.params?.token || "";
  const dateTime =
    route?.params?.dateTime ||
    new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });


  const handleViewOrder = () => {
    navigation.replace("OrderSummaryScreen", {
      uid,
      prpcode,
      yearno,
      strcode,
      mode: "VIEW",

      token,
    });
  };

  const handleBackToList = () => {
    navigation.replace("SalesOrderBrowse");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#13879A" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Saved</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.successCircle}>
            <Icon name="check" size={58} color="#fff" />
          </View>

          <Text style={styles.title}>Order Saved Successfully!</Text>

          <Text style={styles.label}>Order No.</Text>

          <View style={styles.orderBox}>
            <Text style={styles.orderNo}>{orderNo}</Text>
          </View>

          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.dateTime}>{dateTime}</Text>

          <TouchableOpacity style={styles.button} onPress={handleViewOrder}>
            <Text style={styles.buttonText}>View Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SalesOrderSuccessScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6f8fc",
  },
  header: {
    height: 56,
    backgroundColor: '#13879A',
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 34,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#13879A',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0b1d3a",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: "#5d6b82",
    marginBottom: 8,
    fontWeight: "600",
  },
  orderBox: {
    minWidth: 150,
    backgroundColor: "#eaf7ef",
    borderColor: "#b7e2c7",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  orderNo: {
    color: "#087236",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  dateTime: {
    fontSize: 15,
    color: "#0b1d3a",
    fontWeight: "600",
    marginBottom: 34,
  },
  button: {
    width: "100%",
    height: 52,
    backgroundColor: '#13879A',
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});