import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  initialFilledData = [], // Default to empty array if undefined
  cacheKey,
  fetchData,
  onClose,
  onOK,
}) => {
  // State for selected faults and their remarks
  const [selectedFaults, setSelectedFaults] = useState<any[]>([]);
  const [localData, setLocalData] = useState<Fault[]>(data);

  // Initialize selectedFaults with initialFilledData
  useEffect(() => {
    if (initialFilledData && Array.isArray(initialFilledData)) {
      setSelectedFaults(
        initialFilledData.map((fault) => ({
          ...fault,
          Remark: fault.Remark || '', // Ensure Remark is initialized
        }))
      );
    } else {
      setSelectedFaults([]); // Fallback to empty array
    }
  }, [initialFilledData]);

  // Fetch faults data when modal opens
  useEffect(() => {
    if (visible && cacheKey) {
      fetchData(cacheKey).then((fetchedData) => {
        setLocalData(fetchedData);
      });
    }
  }, [visible, cacheKey]);

  // Toggle fault selection
  const toggleFaultSelection = (fault: Fault) => {
    const isSelected = selectedFaults.some((item) => item.UId === fault.UId);

    if (isSelected) {
      // Remove the fault if already selected
      setSelectedFaults(selectedFaults.filter((item) => item.UId !== fault.UId));
    } else {
      // Add the fault with an empty Remark if not selected
      setSelectedFaults([
        ...selectedFaults,
        {
          ...fault,
          Remark: '', // Initialize Remark as empty
        },
      ]);
    }
  };

  // Update the Remark for a specific fault
  const handleRemarkChange = (uid: string, remark: string) => {
    setSelectedFaults(
      selectedFaults.map((fault) =>
        fault.UId === uid ? { ...fault, Remark: remark } : fault
      )
    );
  };

  // Save selected faults and their remarks
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
          renderItem={({ item }) => {
            const isSelected = selectedFaults.some((fault) => fault.UId === item.UId);
            const selectedFault = selectedFaults.find((fault) => fault.UId === item.UId);

            return (
              <View
                style={[
                  styles.faultItem,
                  isSelected && styles.selectedFaultItem,
                ]}
              >
                {/* Top Row: SubSr, RDesc, RsnCode */}
                <View style={styles.faultHeader}>
                  <View style={styles.faultLeftColumn}>
                    <Text style={styles.faultSubSr}>Sr. No: {item.SubSr}</Text>
                    <Text style={styles.faultRDesc}>{item.RDesc}</Text>
                  </View>
                  <View style={styles.faultRightColumn}>
                    <Text style={styles.faultRsnCode}>{item.RsnCode}</Text>
                  </View>
                </View>

                {/* Remark Input (Full Width) */}
                {isSelected && (
                  <TextInput
                    style={styles.remarkInput}
                    placeholder="123, 456-789"
                    value={selectedFault?.Remark || ''}
                    onChangeText={(text) => handleRemarkChange(item.UId, text)}
                  />
                )}

                {/* Select Fault Toggle */}
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => toggleFaultSelection(item)}
                >
                  <Text style={styles.selectButtonText}>
                    {isSelected ? 'Selected' : 'Select Fault'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.okButton} onPress={handleOK}>
            <Text style={styles.okButtonText}>OK</Text>
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
    marginBottom: 8,
  },
  selectedFaultItem: {
    backgroundColor: '#e3f2fd',
  },
  faultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  faultLeftColumn: {
    flex: 1,
  },
  faultRightColumn: {
    alignItems: 'flex-end',
  },
  faultSubSr: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  faultRDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  faultRsnCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  selectButton: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  buttonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  okButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  okButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default FaultsModal;