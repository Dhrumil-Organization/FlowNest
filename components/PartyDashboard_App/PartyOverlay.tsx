import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const PartyOverlay = ({ visible, onClose, party, mianPaylaod, handleReportClick,selectedProperty }) => {
    const [loadingAction, setLoadingAction] = useState(null);

    if (!visible) return null; // 👈 IMPORTANT (hide overlay)

    const screenWidth = Dimensions.get('window').width;

    const numColumns = screenWidth > 900 ? 4 :
        screenWidth > 600 ? 3 : 2;

    const ACTIONS = [
        { name: 'Outstanding' },
        { name: 'Ledger' },
        { name: 'Rates' },
    ];

    const COLORS = [
        ['#0F2027', '#203A43'],
        ['#141E30', '#243B55'],
        ['#232526', '#414345'],
        ['#1D2671', '#C33764'],
    ];

    // const handleActionClick = (action) => {
    //     console.log("BUTTON CLICK:", action.name);
    //     console.log("PARTY DATA:", party, "MAIN PAYLOAD:", mianPaylaod);
    //     handleReportClick(action.name, party, mianPaylaod);
    // };
    const handleActionClick = async (action) => {
        setLoadingAction(action.name); // 👈 sirf is card pe loader

        try {
            await handleReportClick(action.name, party, mianPaylaod,selectedProperty);
        } catch (e) {
            console.log("Error:", e);
        } finally {
            setLoadingAction(null); // 👈 loader hatao
        }
    };

    const Card = ({ item, index }) => {
        const gradient = COLORS[index % COLORS.length];

        const isLoading = loadingAction === item.name;

        return (
            <TouchableOpacity
                style={{
                    flex: 1,
                    margin: 8,
                    borderRadius: 12,
                    overflow: 'hidden',
                    opacity: isLoading ? 0.7 : 1
                }}
                onPress={() => handleActionClick(item)}
                disabled={isLoading} // 👈 double click prevent
            >
                <LinearGradient
                    colors={gradient}
                    style={{
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 80
                    }}
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
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100,
                elevation: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >

            {/* MAIN CARD */}
            <View style={{
                width: '100%',
                borderRadius: 16,
                // backgroundColor: '#111',
                backgroundColor: '#fff',
                padding: 16,
                height: '100%',
                paddingTop: 40
            }}>

                {/* CLOSE */}
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: '#000', textAlign: 'right', fontSize: 18 }}>
                        ✕
                    </Text>
                </TouchableOpacity>

                {/* PARTY INFO */}
                <Text style={{
                    color: '#000',
                    fontSize: 18,
                    fontWeight: '700',
                    marginBottom: 6
                }}>
                    {party?.accname}
                </Text>

                <Text style={{ color: '#aaa', marginBottom: 16 }}>
                    {party?.Address || 'No Address'}
                </Text>

                {/* ACTION GRID */}
                <FlatList
                    data={ACTIONS}
                    renderItem={({ item, index }) => (
                        <Card item={item} index={index} />
                    )}
                    keyExtractor={(item) => item.name}
                    numColumns={numColumns}
                    key={numColumns}
                />

            </View>
        </View>
    );
};

export default PartyOverlay;