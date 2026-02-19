import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FullScreenLoader from '../../components/FullScreenLoader/FullScreenLoader';
import theme from '../../android/app/src/theme';

interface AccessDeniedModalProps {
  visible: boolean;
  countdown: number;
  onClose: () => void;
  checkToken: () => void;
  checkConnectionQuality: () => void;
  visiblepage: boolean;
  isLoading: boolean;
}

const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ visible, countdown, onClose, visiblepage, isLoading }) => {
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
    <>
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
      {/* {isLoading ? (
        <><FullScreenLoader message="Verifying..." /></>
      ) :
        (<>
          <View style={offlineStyles.container}>
            <Icon name="wifi-off" size={80} color="#FF5252" style={offlineStyles.icon} />
            <Text style={offlineStyles.title}>You're Offline!</Text>
            <Text style={offlineStyles.subtitle}>Please connect to the internet to continue.</Text>
           
          </View>
        </>)} */}
      {isLoading && (
        <><FullScreenLoader message="Verifying..." /></>
      )}

    </>
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

const offlineStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: theme.BRAND_GRADIENT_START,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccessDeniedModal; 