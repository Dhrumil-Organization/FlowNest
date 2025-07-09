import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';

interface AccessDeniedModalProps {
  visible: boolean;
  countdown: number;
  onClose: () => void;
}

const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ visible, countdown, onClose }) => {
  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => {
      onClose();
    }, countdown * 1000);
    return () => clearTimeout(timer);
  }, [visible, countdown, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.message}>Please contact your administrator.</Text>
          <Text style={styles.countdown}>Closing in {countdown}...</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    width: 300,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default AccessDeniedModal; 