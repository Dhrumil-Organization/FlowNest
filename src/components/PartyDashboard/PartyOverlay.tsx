import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const PartyOverlay = ({ visible, onClose, party, mianPaylaod, handleReportClick, onActionClick, selectedProperty, loading }) => {

    const [loadingAction, setLoadingAction] = useState(null);

    if (!visible) return null;

    const screenWidth = Dimensions.get('window').width;

    const numColumns = screenWidth > 900 ? 4 :
        screenWidth > 600 ? 3 : 2;

    // const ACTIONS = [
    //     { name: 'Outstanding' },
    //     { name: 'Ledger' },
    //     { name: 'Rates' },
    // ];

    const isMProperty = selectedProperty?.PrpOf === 'M' || selectedProperty?.PrpType === 'M';

    const ACTIONS = [
        { name: 'Outstanding' },
        { name: 'Ledger' },
        ...(isMProperty ? [{ name: 'Rates' }] : [])
    ];

    const COLORS = [
        ['#0F2027', '#203A43'],
        ['#141E30', '#243B55'],
        ['#232526', '#414345'],
        ['#1D2671', '#C33764'],
    ];

    const handleActionClick = (action) => {
        setLoadingAction(action.name);

        console.log("action.name :::: ", action.name)

        setTimeout(() => {
            onActionClick(action.name);
            setLoadingAction(null);
        }, 200);
    };

    const Card = ({ item, index }) => {
        const gradient = COLORS[index % COLORS.length];

        const isLoading = loadingAction === item.name;

        return (
            <TouchableOpacity
                style={{ flex: 1, margin: 8, borderRadius: 12, overflow: 'hidden', opacity: isLoading ? 0.7 : 1 }}
                onPress={() => handleActionClick(item)}
                disabled={isLoading}
            >
                <LinearGradient
                    colors={gradient}
                    style={{ padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ color: '#fff', fontWeight: '700' }}>
                            {item.name}
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 10,
                backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center'
            }}
        >

            <View style={{
                width: '100%', borderRadius: 16, backgroundColor: '#fff', padding: 16,
                height: '100%', paddingTop: 40
            }}>

                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: '#000', textAlign: 'right', fontSize: 18 }}>
                        ✕
                    </Text>
                </TouchableOpacity>

                <Text style={{ color: '#000', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
                    {party?.accname}
                </Text>

                <Text style={{ color: '#aaa', marginBottom: 16 }}>
                    {party?.Address || 'No Address'}
                </Text>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#000" />
                        <Text style={{ marginTop: 10, color: '#000' }}>
                            Loading data...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={ACTIONS}
                        renderItem={({ item, index }) => (
                            <Card item={item} index={index} />
                        )}
                        keyExtractor={(item) => item.name}
                        numColumns={numColumns}
                        key={numColumns}
                    />
                )}

            </View>
        </View>
    );
};

export default PartyOverlay;