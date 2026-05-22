import React, { useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { warehouseApi } from "./services/warehouseApi";
import CartonCard from "./components/CartonCard";
import { styles, COLORS } from "./components/WarehouseStyles";

export default function WarehouseViewScreen({ route }) {
    const { criteria = {}, location = {} } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [cartons, setCartons] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);

            const payload = {
                ...criteria,
                mode: "VIEW",
                locationCode: location.locationCode,
                locationName: location.locationName,
            };

            const res = await warehouseApi.loadCartons(payload);
            const rows = res?.data?.data || res?.data?.results || [];

            setCartons(Array.isArray(rows) ? rows : []);
        } catch (e) {
            Alert.alert("Error", e?.response?.data?.message || "Failed to load cartons");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.between}>
                        <Text style={styles.label}>Location</Text>
                        <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
                            {location.locationName}
                        </Text>
                    </View>

                    <View style={styles.between}>
                        <Text style={styles.label}>Capacity</Text>
                        <Text style={{ color: COLORS.primary, fontWeight: "900" }}>
                            {location.used || 0} / {location.capacity || 0}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={loadData}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>LOAD DATA</Text>}
                    </TouchableOpacity>
                </View>

                <Text style={{ fontWeight: "900", marginBottom: 10 }}>
                    Carton List ({cartons.length})
                </Text>

                <FlatList
                    data={cartons}
                    keyExtractor={(item, index) => String(item.uid || item.cartonNo || index)}
                    renderItem={({ item }) => (
                        <CartonCard item={item} readonly />
                    )}
                    ListEmptyComponent={
                        <Text style={{ textAlign: "center", color: COLORS.muted, marginTop: 40 }}>
                            No cartons available
                        </Text>
                    }
                />
            </View>
        </View>
    );
}