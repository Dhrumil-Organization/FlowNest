import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

interface CustomDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    selectedYear: string;
    onYearChange: (year: string) => void;
    onLoadPress: () => void;
    isLoading: boolean;
    FormState: any;
    setFormState: any// 👈 add this
    getAllYearData: any; // 👈 ye bhi use ho raha hai
}

const CustomDrawer: React.FC<CustomDrawerProps> = ({
    isVisible,
    onClose,
    onLoadPress,
    getAllYearData,
    isLoading,
    FormState,
    setFormState
}) => {

    const styles = StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center'
        },
        container: {
            width: '85%',
            backgroundColor: '#fff',
            borderRadius: 15,
            padding: 15
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10
        },
        title: {
            fontSize: 16,
            fontWeight: 'bold'
        },
        yearItem: {
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
            backgroundColor: '#f5f5f5'
        },
        selectedYear: {
            backgroundColor: '#E3F2FD',
            borderWidth: 2,
            borderColor: '#007EA7'
        },
        yearText: {
            fontSize: 14
        },
        loadBtn: {
            marginTop: 10,
            backgroundColor: '#007EA7',
            padding: 12,
            borderRadius: 10,
            alignItems: 'center'
        },
        loadText: {
            color: '#fff',
            fontWeight: 'bold'
        }
    });

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* HEADER */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Year</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* YEAR LIST */}
                    {getAllYearData?.length > 0 ? (
                        getAllYearData.map((item: any, index: number) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.yearItem,
                                    FormState?.values?.YearNo === item.YearNo && styles.selectedYear
                                ]}
                                onPress={() => {
                                    // ✅ EXACT dropdown jaisa behavior
                                    setFormState((prev: any) => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            YearNo: item?.YearNo || ''
                                        }
                                    }));
                                }}
                            >
                                <Text style={styles.yearText}>{item.YearName}</Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={{ textAlign: 'center', marginVertical: 10 }}>
                            No Year Found
                        </Text>
                    )}

                    {/* DONE BUTTON */}
                    <TouchableOpacity style={styles.loadBtn} onPress={onLoadPress}>
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loadText}>Done</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};
export default CustomDrawer;