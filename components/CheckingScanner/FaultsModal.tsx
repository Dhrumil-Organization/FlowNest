import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Fault {
  Faults: string;
  RDesc: string;
  Remark: string;
  RsnCode: string;
  SrNo: string;
  SubSr: string;
  UId: string;
}

interface FaultsModalProps {
  visible: boolean;
  data: Fault[];
  initialFilledData: any[];
  cacheKey: string;
  fetchData: (cacheKey: string) => Promise<Fault[]>;
  onClose: () => void;
  onOK: (updatedData: any[]) => void;
}

const FaultsModal: React.FC<FaultsModalProps> = ({
  visible,
  data,
  initialFilledData,
  cacheKey,
  fetchData,
  onClose,
  onOK,
}) => {
  const [selectedFaults, setSelectedFaults] = useState<any[]>(initialFilledData);
  const [localData, setLocalData] = useState<Fault[]>(data);

  useEffect(() => {
    if (visible && cacheKey) {
      fetchData(cacheKey).then((fetchedData) => {
        setLocalData(fetchedData);
      });
    }
  }, [visible, cacheKey]);

  useEffect(() => {
    setSelectedFaults(initialFilledData);
  }, [initialFilledData]);

  const toggleFaultSelection = (fault: Fault) => {
    const isSelected = selectedFaults.some((item) => item.UId === fault.UId);
    if (isSelected) {
      setSelectedFaults(selectedFaults.filter((item) => item.UId !== fault.UId));
    } else {
      setSelectedFaults([...selectedFaults, fault]);
    }
  };

  const handleOK = () => {
    onOK(selectedFaults);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Faults</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={localData}
          keyExtractor={(item) => item.UId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.faultItem,
                selectedFaults.some((fault) => fault.UId === item.UId) &&
                  styles.selectedFaultItem,
              ]}
              onPress={() => toggleFaultSelection(item)}
            >
              <Text style={styles.faultText}>{item.Faults}</Text>
              <Text style={styles.faultDesc}>{item.RDesc}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.okButton} onPress={handleOK}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  faultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedFaultItem: {
    backgroundColor: '#e3f2fd',
  },
  faultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  faultDesc: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    padding: 12,
    marginRight: 16,
  },
  okButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default FaultsModal;