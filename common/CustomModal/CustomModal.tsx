import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

const CustomModal: React.FC<CustomModalProps> = ({
    visible,
    onClose,
    title,
    message,
    type,
    onConfirm,
    confirmText = 'Yes',
    cancelText = 'No',
}) => {
    const getModalStyles = () => {
        switch (type) {
            case 'success':
                return {
                    icon: 'check-circle',
                    iconColor: '#4CAF50',
                    buttonColor: '#4CAF50',
                };
            case 'error':
                return {
                    icon: 'error',
                    iconColor: '#F44336',
                    buttonColor: '#F44336',
                };
            case 'warning':
                return {
                    icon: 'warning',
                    iconColor: '#FF9800',
                    buttonColor: '#FF9800',
                };
            case 'confirm':
                return {
                    icon: 'help',
                    iconColor: '#2196F3',
                    buttonColor: '#2196F3',
                };
            case 'info':
            default:
                return {
                    icon: 'info',
                    iconColor: theme.BRAND_GRADIENT_END,
                    buttonColor: theme.BRAND_GRADIENT_END,
                };
        }
    };

    const styles = getModalStyles();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={modalStyles.overlayContainer}>
                <View style={modalStyles.overlay}>
                    <View style={modalStyles.modalHeader}>
                        <Icon name={styles.icon} size={40} color={styles.iconColor} />
                        <Text style={[modalStyles.overlayTitle, { color: styles.iconColor }]}>
                            {title}
                        </Text>
                    </View>
                    <Text style={modalStyles.overlayMessage}>{message}</Text>
                    <View style={modalStyles.modalButtons}>
                        {type === 'confirm' ? (
                            <>
                                <TouchableOpacity
                                    style={[modalStyles.modalButton, { backgroundColor: styles.buttonColor }]}
                                    onPress={onConfirm}
                                >
                                    <Text style={modalStyles.modalButtonText}>{confirmText}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[modalStyles.modalButton, { backgroundColor: '#9E9E9E' }]}
                                    onPress={onClose}
                                >
                                    <Text style={modalStyles.modalButtonText}>{cancelText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[modalStyles.modalButton, { backgroundColor: styles.buttonColor }]}
                                onPress={onClose}
                            >
                                <Text style={modalStyles.modalButtonText}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Modal styles
const modalStyles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlay: {
        width: '90%',
        borderRadius: 15,
        backgroundColor: 'white',
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },
    overlayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    overlayMessage: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CustomModal;
