import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FinalTable from './FinalTable';
import FinalTableOut from './FinalTableOut';
import FinalTableRates from './FinalTableRates';

const LedgerOverlay = ({ visible, onClose, data, styles, activeParty, out_data, customer_rate_data, action }) => {

    if (!visible) return null;

    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200, // 👈 PARTY OVERLAY SE UPAR
            elevation: 20,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center'
        }}>

            <View style={{
                margin: 10,
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 10,
                flex: 1,
                paddingTop: 40
            }}>

                {/* CLOSE */}
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: '#000', textAlign: 'right' }}>✕</Text>
                </TouchableOpacity>

                <Text style={{ color: '#000', fontSize: 16, marginBottom: 10 }}>
                    {activeParty}'s {action == 'Ledger' ? 'Ledger' : action == 'Outstanding' ? 'Outstanding' : action == 'Rates' ? 'Rates' : ''} Report
                </Text>
                {action == 'Ledger' ?
                    <FinalTable data={data} styles={styles} />
                    : action == 'Outstanding' ?
                        <FinalTableOut data={out_data} styles={styles} />
                        : action == 'Rates' ? 
                            <FinalTableRates data={customer_rate_data} styles={styles} />
                            : null}

            </View>
        </View>
    );
};

export default LedgerOverlay;