// import Icon from '@expo/vector-icons/MaterialIcons';
// import React, { useEffect, useState } from 'react';
// import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// interface Fault {
//   Faults: string;
//   RDesc: string;
//   Remark: string;
//   RsnCode: string;
//   SrNo: string;
//   SubSr: string;
//   UId: string;
// }

// interface FaultsModalProps {
//   visible: boolean;
//   data: Fault[];
//   initialFilledData: any[];
//   cacheKey: string;
//   fetchData: (cacheKey: string) => Promise<Fault[]>;
//   onClose: () => void;
//   onOK: (updatedData: any[]) => void;
//   loading?: boolean;
// }

// const FaultsModal: React.FC<FaultsModalProps> = ({
//   visible,
//   data,
//   initialFilledData = [], // Default to empty array if undefined
//   cacheKey,
//   fetchData,
//   onClose,
//   onOK,
//   loading = false,
// }) => {
//   // State for selected faults and their remarks
//   const [selectedFaults, setSelectedFaults] = useState<any[]>([]);
//   const [faultsData, setFaultsData] = useState<any[]>([]);
//   // const [localData, setLocalData] = useState<Fault[]>(data);

//   // Initialize selectedFaults with initialFilledData
//   useEffect(() => {
//     if (initialFilledData && Array.isArray(initialFilledData)) {
//       setSelectedFaults(
//         initialFilledData.map((fault) => ({
//           ...fault,
//           Remark: fault.Remark || '', // Ensure Remark is initialized
//         }))
//       );
//     } else {
//       setSelectedFaults([]); // Fallback to empty array
//     }
//   }, [initialFilledData]);

//   useEffect(() => {
//     if (!visible) return;

//     const loadFaults = async () => {
//       const apiData = await fetchData(cacheKey);

//       const finalData = apiData.map(item => {
//         const old = initialFilledData.find(
//           x => x.UId === item.UId && x.SubSr === item.SubSr
//         );

//         return {
//           ...item,
//           Remark: old?.Remark ?? "",
//         };
//       });

//       setFaultsData(finalData);
//     };

//     loadFaults();

//   }, [visible, cacheKey, initialFilledData]);

//   // Fetch faults data when modal opens


//   // Toggle fault selection
//   const toggleFaultSelection = (fault: Fault) => {
//     const isSelected = selectedFaults.some((item) => item.UId === fault.UId);

//     if (isSelected) {
//       // Remove the fault if already selected
//       setSelectedFaults(selectedFaults.filter((item) => item.UId !== fault.UId));
//     } else {
//       // Add the fault with an empty Remark if not selected
//       setSelectedFaults([
//         ...selectedFaults,
//         {
//           ...fault,
//           Remark: '', // Initialize Remark as empty
//         },
//       ]);
//     }
//   };

//   // Update the Remark for a specific fault
//   const handleRemarkChange = (uid: string, SubSr: string, remark: string) => {

//     setFaultsData(prev =>
//       prev.map(item =>
//         item.UId === uid && item.SubSr === SubSr
//           ? {
//             ...item,
//             Remark: remark,
//           }
//           : item
//       )
//     );

//   };

//   // Save selected faults and their remarks
//   const handleOK = () => {

//     onOK(faultsData);

//   };

//   return (
//     <Modal visible={visible} animationType="slide" transparent={false}>
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <Text style={styles.modalTitle}>Select Faults</Text>
//           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//             <Icon name="close" size={24} color="#000" />
//           </TouchableOpacity>
//         </View>

//         <FlatList
//           data={faultsData}
//           keyExtractor={(item) => item.UId}
//           renderItem={({ item }) => (

//             <View style={styles.faultItem}>

//               <View style={styles.faultHeader}>

//                 <View style={styles.faultLeftColumn}>
//                   <Text style={styles.faultSubSr}>
//                     Sr. No: {item.SubSr}
//                   </Text>

//                   <Text style={styles.faultRDesc}>
//                     {item.RDesc}
//                   </Text>
//                 </View>

//                 <View style={styles.faultRightColumn}>
//                   <Text style={styles.faultRsnCode}>
//                     {item.RsnCode}
//                   </Text>
//                 </View>

//               </View>

//               <TextInput
//                 style={styles.remarkInput}
//                 placeholder="123, 345-678"
//                 placeholderTextColor="#999"
//                 value={item.Remark ?? ""}
//                 onChangeText={(text) =>
//                   handleRemarkChange(item.UId, item.SubSr, text)
//                 }
//               />

//             </View>

//           )}
//         />

//         <View style={styles.modalFooter}>
//           <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
//             <Text style={styles.buttonText}>Cancel</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.okButton, loading && { opacity: 0.6 }]}
//             onPress={handleOK}
//             disabled={loading}
//           >
//             {
//               loading
//                 ? <ActivityIndicator color="#fff" />
//                 : <Text style={styles.okButtonText}>OK</Text>
//             }
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: '#fff',
//     padding: 16,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     marginTop: 30,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   closeButton: {
//     padding: 8,
//   },
//   faultItem: {
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     marginBottom: 8,
//   },
//   selectedFaultItem: {
//     backgroundColor: '#e3f2fd',
//   },
//   faultHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//   },
//   faultLeftColumn: {
//     flex: 1,
//   },
//   faultRightColumn: {
//     alignItems: 'flex-end',
//   },
//   faultSubSr: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//   },
//   faultRDesc: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 4,
//   },
//   faultRsnCode: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//   },
//   remarkInput: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 10,
//     marginTop: 8,
//     fontSize: 14,
//     backgroundColor: '#fff',
//     color: '#000',          // <-- Add this
//   },
//   selectButton: {
//     marginTop: 8,
//     padding: 10,
//     backgroundColor: '#007AFF',
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   selectButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   modalFooter: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     marginTop: 16,
//   },
//   cancelButton: {
//     padding: 12,
//     marginRight: 16,
//   },
//   buttonText: {
//     color: '#007AFF',
//     fontWeight: 'bold',
//   },
//   okButton: {
//     padding: 12,
//     backgroundColor: '#007AFF',
//     borderRadius: 8,
//   },
//   okButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
// });

// export default FaultsModal;
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  loading?: boolean;
}

// Sirf digits, comma, hyphen, space allow — baaki sab strip
const sanitizeRemarkInput = (text: string) => {
  return text.replace(/[^0-9,\- ]/g, '');
};

const FaultsModal: React.FC<FaultsModalProps> = ({
  visible,
  data,
  initialFilledData = [],
  cacheKey,
  fetchData,
  onClose,
  onOK,
  loading = false,
}) => {
  const [selectedFaults, setSelectedFaults] = useState<any[]>([]);
  const [faultsData, setFaultsData] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (initialFilledData && Array.isArray(initialFilledData)) {
      setSelectedFaults(
        initialFilledData.map((fault) => ({
          ...fault,
          Remark: fault.Remark || '',
        }))
      );
    } else {
      setSelectedFaults([]);
    }
  }, [initialFilledData]);

  useEffect(() => {
    if (!visible) return;

    const loadFaults = async () => {
      const apiData = await fetchData(cacheKey);

      const finalData = apiData.map(item => {
        const old = initialFilledData.find(
          x => x.UId === item.UId && x.SubSr === item.SubSr
        );

        return {
          ...item,
          Remark: old?.Remark ?? "",
        };
      });

      setFaultsData(finalData);
    };

    loadFaults();

  }, [visible, cacheKey, initialFilledData]);

  // Reset search jab modal band/open ho
  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const toggleFaultSelection = (fault: Fault) => {
    const isSelected = selectedFaults.some((item) => item.UId === fault.UId);

    if (isSelected) {
      setSelectedFaults(selectedFaults.filter((item) => item.UId !== fault.UId));
    } else {
      setSelectedFaults([
        ...selectedFaults,
        {
          ...fault,
          Remark: '',
        },
      ]);
    }
  };

  const handleRemarkChange = (uid: string, SubSr: string, remark: string) => {
    const cleanedRemark = sanitizeRemarkInput(remark);

    setFaultsData(prev =>
      prev.map(item =>
        item.UId === uid && item.SubSr === SubSr
          ? {
            ...item,
            Remark: cleanedRemark,
          }
          : item
      )
    );
  };

  const handleOK = () => {
    onOK(faultsData);
  };

  // Search se filter — RDesc, RsnCode, SubSr, Faults sab pe search chalega
  const filteredFaultsData = faultsData.filter((item) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (item.RDesc ?? '').toLowerCase().includes(q) ||
      (item.RsnCode ?? '').toLowerCase().includes(q) ||
      (item.SubSr ?? '').toString().toLowerCase().includes(q) ||
      (item.Faults ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Faults</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by description or code"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredFaultsData}
          keyExtractor={(item) => item.UId}
          ListEmptyComponent={
            <Text style={styles.noResultText}>No matching faults found</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.faultItem}>
              <View style={styles.faultHeader}>
                <View style={styles.faultLeftColumn}>
                  {/* <Text style={styles.faultSubSr}>
                    Sr. No: {item.SubSr}
                  </Text> */}
                  <Text style={styles.faultSubSr}>
                    {item.RDesc}
                  </Text>
                </View>
                {/* <View style={styles.faultRightColumn}>
                  <Text style={styles.faultRsnCode}>
                    {item.RsnCode}
                  </Text>
                </View> */}
              </View>

              <TextInput
                style={styles.remarkInput}
                placeholder="123, 345-678"
                placeholderTextColor="#999"
                value={item.Remark ?? ""}
                keyboardType="default"
                onChangeText={(text) =>
                  handleRemarkChange(item.UId, item.SubSr, text)
                }
              />
            </View>
          )}
        />

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.okButton, loading && { opacity: 0.6 }]}
            onPress={handleOK}
            disabled={loading}
          >
            {
              loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.okButtonText}>OK</Text>
            }
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
    marginTop: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  noResultText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
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
    marginBottom: 1,
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
    color: '#000',
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