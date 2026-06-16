import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Switch,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import SearchableDropdown from '../Shared/SearchableDropdown';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';

const CriteriaScreen = ({ navigation, token }) => {
    const [FormState, setFormState] = useState({
        values: {
            updateStock: '1',
            autoFound: '1',
            manual: '1',
            stockNotFound: '1',
            autoNotFound: '1',
            autoForRepacking: '1',
            duplicate: '1',
            PrpCode: '',
            YearNo: '',
            StrCode: '',
        },
    });
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [getAllStoreData, setAllStoreData] = useState([]);




    useEffect(() => {
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
    }, []);

    useEffect(() => {
        if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {
            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)
                setAllYearData(allyeardata)
            }
            testFinct();
        }
    }, [FormState.values.PrpCode])

    useEffect(() => {
        if (typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '') {
            const testFinctStore = async () => {
                const allstoredata = await fetchAllStoredata(token, FormState.values.PrpCode, FormState.values.YearNo)
                setAllStoreData(allstoredata)
            }
            testFinctStore();
        }
    }, [FormState.values.YearNo])

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}

            <View style={styles.header}>
                <TouchableOpacity>
                    <Icon
                        name="menu"
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    Yarn Stock Verification
                </Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <Text style={styles.sectionTitle}>
                    Selection Criteria
                </Text>

                {/* PROPERTY */}

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        Property
                    </Text>

                    <SearchableDropdown
                        data={getAllPropertyData || []}
                        labelKey="LngName"
                        valueKey="PrpCode"
                        placeholder="Select Property"
                        pageSize={10}
                        onSelect={item => {
                            setFormState(prev => ({
                                ...prev,
                                values: {
                                    ...prev.values,
                                    PrpCode: item?.PrpCode || '',
                                },
                            }));
                        }}
                    />
                </View>

                {/* YEAR */}

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        Year
                    </Text>

                    <SearchableDropdown
                        data={getAllYearData || []}
                        labelKey="YearName"
                        valueKey="YearNo"
                        placeholder="Select Year"
                        pageSize={10}
                        onSelect={item => {
                            setFormState(prev => ({
                                ...prev,
                                values: {
                                    ...prev.values,
                                    YearNo: item?.YearNo || '',
                                },
                            }));
                        }}
                    />
                </View>

                {/* STORE */}

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        Store
                    </Text>

                    <SearchableDropdown
                        data={getAllStoreData || []}
                        labelKey="StrName"
                        valueKey="StrCode"
                        placeholder="Select Store"
                        pageSize={10}
                        onSelect={item => {
                            setFormState(prev => ({
                                ...prev,
                                values: {
                                    ...prev.values,
                                    StrCode: item?.StrCode || '',
                                },
                            }));
                        }}
                    />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>
                    Options
                </Text>

                <OptionRow
                    title="Update Stock"
                    value={FormState.values.updateStock === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                updateStock: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Auto Found"
                    value={FormState.values.autoFound === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                autoFound: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Manual"
                    value={FormState.values.manual === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                manual: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Stock Not Found"
                    value={FormState.values.stockNotFound === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                stockNotFound: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Auto Not Found"
                    value={FormState.values.autoNotFound === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                autoNotFound: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Auto For Repacking"
                    value={FormState.values.autoForRepacking === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                autoForRepacking: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <OptionRow
                    title="Duplicate"
                    value={FormState.values.duplicate === '1'}
                    onChange={val =>
                        setFormState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                duplicate: val ? '1' : '0',
                            },
                        }))
                    }
                />

                <TouchableOpacity
                    style={styles.loadButton}
                    onPress={() =>
                        navigation.navigate(
                            'FebricStockListScreen'
                        )
                    }
                >
                    <Text style={styles.loadButtonText}>
                        LOAD STOCK
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const OptionRow = ({ title, value, onChange }) => (
    <View style={styles.switchRow}>
        <Text style={styles.switchText}>
            {title}
        </Text>

        <Switch
            value={value}
            onValueChange={onChange}
            trackColor={{
                false: '#D0D5DD',
                true: '#13879A',
            }}
            thumbColor="#fff"
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },

    header: {
        height: 60,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },

    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 15,
    },

    content: {
        padding: 16,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
        color: '#000',
    },

    fieldContainer: {
        marginBottom: 15,
    },

    label: {
        fontSize: 14,
        marginBottom: 8,
        color: '#000',
    },

    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },

    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },

    switchText: {
        fontSize: 15,
        color: '#111827',
    },

    loadButton: {
        height: 52,
        borderRadius: 8,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },

    loadButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});

export default CriteriaScreen;