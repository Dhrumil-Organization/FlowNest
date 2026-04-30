import React, { useState,useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

const CreelIssueReturnEntry = ({ navigation, route }) => {

const { creelData, itemList = [], mergeList = [], gradeList = [], shadeList = [] } = route.params || {};
const selectedProperty = route?.params?.selectedProperty;
const selectedYear = route?.params?.selectedYear;
const token = route?.params?.token;

const [cartonType, setCartonType] = useState("Single");
const [status, setStatus] = useState("Open");

const [form, setForm] = useState({
cartonNo: "",
item: null,
merge: null,
grade: null,
shade: null,
cheese: "",
weight: ""
});
const [linkModal, setLinkModal] = useState(false);
const [linkData, setLinkData] = useState([]); // backend data
useEffect(() => {
  setLinkData([
    {
      ItmCode: "I1",
      ItmName: "Cotton Yarn",
      MerCode: "M1",
      MerName: "Merge A",
      GrdCode: "G1",
      GrdName: "Grade A",
      ShdCode: "S1",
      ShdName: "Shade Blue",
      CreelNo: "CR001",
      CreelUId: 101,
      CreelSrNo: 1
    },
    {
      ItmCode: "I2",
      ItmName: "Poly Yarn",
      MerCode: "M2",
      MerName: "Merge B",
      GrdCode: "G2",
      GrdName: "Grade B",
      ShdCode: "S2",
      ShdName: "Shade Red",
      CreelNo: "CR002",
      CreelUId: 102,
      CreelSrNo: 2
    }
  ]);
}, []);
  const SelectBox = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.selectBox} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectInner}>
        <Text style={{ color: value ? "#000" : "#999" }}>
          {value || "Select"}
        </Text>
        <Icon name="arrow-drop-down" size={20} color="#555" />
      </View>
    </TouchableOpacity>
  );

  const Toggle = ({ options, value, onChange }) => (
    <View style={styles.toggleRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.toggleBtn,
            value === opt && styles.toggleActive
          ]}
          onPress={() => onChange(opt)}
        >
          <Text style={[
            styles.toggleText,
            value === opt && { color: "#fff" }
          ]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Entry</Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* CREEL INFO */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selected Creel</Text>
          <Text style={styles.creelText}>
            {creelData?.CreelNo || "-"}
          </Text>
        </View>

        {/* CARTON TYPE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Carton Type</Text>
          <Toggle
            options={["Single", "Mix"]}
            value={cartonType}
            onChange={setCartonType}
          />
        </View>

        {/* CARTON NO */}
        <View style={styles.card}>
          <Text style={styles.label}>Carton No</Text>
          <TextInput
            style={styles.input}
            value={form.cartonNo}
            onChangeText={v => setForm({ ...form, cartonNo: v })}
            placeholder="Enter Carton No"
          />
        </View>
        <TouchableOpacity
        style={{
            backgroundColor: "#0F6C7B",
            padding: 12,
            borderRadius: 10,
            alignItems: "center",
            marginBottom: 12
        }}
        onPress={() => setLinkModal(true)}
        >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
            + Link Creel
        </Text>
        </TouchableOpacity>
        {/* DROPDOWNS */}
        <SelectBox
          label="Item"
          value={form.item?.name}
          onPress={() => console.log("open item dropdown")}
        />

        <SelectBox
          label="Merge"
          value={form.merge?.name}
          onPress={() => console.log("open merge dropdown")}
        />

        <SelectBox
          label="Grade"
          value={form.grade?.name}
          onPress={() => console.log("open grade dropdown")}
        />

        <SelectBox
          label="Shade"
          value={form.shade?.name}
          onPress={() => console.log("open shade dropdown")}
        />

        {/* CHEESE */}
        <View style={styles.card}>
          <Text style={styles.label}>Cheese</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.cheese}
            onChangeText={v => setForm({ ...form, cheese: v })}
            placeholder="Enter Cheese"
          />
        </View>

        {/* WEIGHT */}
        <View style={styles.card}>
          <Text style={styles.label}>Weight</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.weight}
            onChangeText={v => setForm({ ...form, weight: v })}
            placeholder="Enter Weight"
          />
        </View>

        {/* STATUS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Toggle
            options={["Open", "Close"]}
            value={status}
            onChange={setStatus}
          />
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Save Entry
          </Text>
        </TouchableOpacity>

      </ScrollView>
      <Modal transparent visible={linkModal} animationType="slide">
            <View style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.4)",
                justifyContent: "flex-end"
            }}>

                <View style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 16,
                maxHeight: "70%"
                }}>

                {/* HEADER */}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>
                    Select Creel
                    </Text>

                    <TouchableOpacity onPress={() => setLinkModal(false)}>
                    <Icon name="close" size={22} />
                    </TouchableOpacity>
                </View>

                {/* LIST */}
                <FlatList
                    data={linkData}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingTop: 10 }}

                    renderItem={({ item }) => (
                    <TouchableOpacity
                        style={{
                        backgroundColor: "#f9f9f9",
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 8
                        }}

                        onPress={() => {
                        // 🔥 AUTO FILL FORM
                        setForm(prev => ({
                            ...prev,
                            item: { code: item.ItmCode, name: item.ItmName },
                            merge: { code: item.MerCode, name: item.MerName },
                            grade: { code: item.GrdCode, name: item.GrdName },
                            shade: { code: item.ShdCode, name: item.ShdName }
                        }));

                        // extra values
                        console.log("CreelUId", item.CreelUId);
                        console.log("CreelSrNo", item.CreelSrNo);

                        setLinkModal(false);
                        }}
                    >

                        {/* MAIN ROW */}
                        <Text style={{ fontWeight: "600" }}>
                        {item.ItmName}
                        </Text>

                        <Text style={{ fontSize: 12, color: "#666" }}>
                        {item.GrdName} | {item.ShdName} | {item.MerName}
                        </Text>

                        <Text style={{ fontSize: 12, color: "#0F6C7B" }}>
                        Creel: {item.CreelNo}
                        </Text>

                    </TouchableOpacity>
                    )}
                />

                </View>
            </View>
            </Modal>
    </View>
  );
};

export default CreelIssueReturnEntry;
const styles = StyleSheet.create({

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F6C7B",
    padding: 15,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 10
  },

  creelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F2027"
  },

  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6
  },

  input: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 10
  },

  selectBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2
  },

  selectInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  toggleRow: {
    flexDirection: "row"
  },

  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0F6C7B",
    marginRight: 6,
    alignItems: "center"
  },

  toggleActive: {
    backgroundColor: "#0F6C7B"
  },

  toggleText: {
    color: "#0F6C7B"
  },

  saveBtn: {
    backgroundColor: "#0F6C7B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  }

});