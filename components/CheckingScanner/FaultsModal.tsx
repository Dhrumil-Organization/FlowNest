import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  beamNo?: string;
  takaNo?: string;
  meter?: string;
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
  beamNo = '',
  takaNo = '',
  meter = '',
}) => {
  const [selectedFaults, setSelectedFaults] = useState<any[]>([]);
  const [faultsData, setFaultsData] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [faultValue, setFaultValue] = useState('');

  useEffect(() => {
    if (!visible) return;

    if (Array.isArray(initialFilledData) && initialFilledData.length > 0) {
      const firstFault = initialFilledData[0];

      setSelectedFaults([
        {
          ...firstFault,
          Remark: firstFault?.Remark || '',
        },
      ]);

      setFaultValue(firstFault?.Remark || '');
    } else {
      setSelectedFaults([]);
      setFaultValue('');
    }

    setSearchText('');
  }, [visible, initialFilledData]);

  useEffect(() => {
    if (!visible) return;

    const loadFaults = async () => {
      try {
        const apiData = await fetchData(cacheKey);
        const finalData = (apiData || []).map(item => {
          const old = initialFilledData.find(
            x => x.UId === item.UId && x.SubSr === item.SubSr
          );

          return {
            ...item,
            Remark: old?.Remark ?? '',
          };
        });

        setFaultsData(finalData);
      } catch (error) {
        console.log('FaultsModal loadFaults error:', error);
        setFaultsData([]);
      }
    };

    loadFaults();
  }, [visible, cacheKey, initialFilledData]);

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const isFaultSelected = (fault: Fault) =>
    selectedFaults.some(
      item => item.UId === fault.UId && String(item.SubSr) === String(fault.SubSr)
    );

  const toggleFaultSelection = (fault: Fault) => {
    if (loading) return;

    const isSelected = isFaultSelected(fault);

    if (isSelected) {
      setSelectedFaults([]);

      setFaultsData(prev =>
        prev.map(item =>
          item.UId === fault.UId &&
          String(item.SubSr) === String(fault.SubSr)
            ? { ...item, Remark: '' }
            : item
        )
      );

      return;
    }

    // Only one fault can be selected. Retain the current value when changing fault.
    const value = sanitizeRemarkInput(faultValue);

    const updatedFault = {
      ...fault,
      Remark: value,
    };

    setSelectedFaults([updatedFault]);

    setFaultsData(prev =>
      prev.map(item => {
        const isCurrentFault =
          item.UId === fault.UId &&
          String(item.SubSr) === String(fault.SubSr);

        return {
          ...item,
          Remark: isCurrentFault ? value : '',
        };
      })
    );
  };

  const handleFaultValueChange = (text: string) => {
    const cleanedRemark = sanitizeRemarkInput(text);
    setFaultValue(cleanedRemark);

    // Keep the existing Remark payload structure. The single Fault Value
    // shown in the new UI is applied to all currently selected faults.
    setFaultsData(prev =>
      prev.map(item =>
        isFaultSelected(item)
          ? { ...item, Remark: cleanedRemark }
          : item
      )
    );

    setSelectedFaults(prev =>
      prev.map(item => ({ ...item, Remark: cleanedRemark }))
    );
  };

  const handleSaveAndClose = () => {
    if (loading) return;

    const value = sanitizeRemarkInput(faultValue).trim();

    if (selectedFaults.length === 0 || value === '') {
      return;
    }

    const selected = selectedFaults[0];

    onOK([
      {
        ...selected,
        Remark: value,
      },
    ]);
  };

  // X closes without saving local changes.
  const handleCancelClose = () => {
    if (loading) return;
    onClose();
  };

  const filteredFaultsData = useMemo(() => {
    if (!searchText.trim()) return faultsData;
    const q = searchText.toLowerCase();

    return faultsData.filter((item) =>
      (item.RDesc ?? '').toLowerCase().includes(q) ||
      (item.RsnCode ?? '').toLowerCase().includes(q) ||
      (item.SubSr ?? '').toString().toLowerCase().includes(q) ||
      (item.Faults ?? '').toLowerCase().includes(q)
    );
  }, [faultsData, searchText]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Faults</Text>
            <TouchableOpacity
              onPress={handleCancelClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Icon name="close" size={25} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Beam No</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{beamNo || '-'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={[styles.infoItem, styles.takaItem]}>
              <Text style={styles.infoLabel}>Taka No</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{takaNo || '-'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.meterItem}>
              <Text style={styles.infoLabel}>Meter</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{meter || '-'}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Fault Value <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.faultValueInput}
            placeholder="Enter value (e.g. 123, 345-678)"
            placeholderTextColor="#94A3B8"
            value={faultValue}
            onChangeText={handleFaultValueChange}
            onSubmitEditing={handleSaveAndClose}
            returnKeyType="done"
            blurOnSubmit
            keyboardType="default"
            editable={!loading}
          />

          <View style={styles.searchContainer}>
            <Icon name="search" size={21} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by description or code"
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
              editable={!loading}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.selectLabel}>
            Select Faults <Text style={styles.required}>*</Text>
          </Text>

          <ScrollView
            style={styles.faultScroll}
            contentContainerStyle={styles.faultGrid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredFaultsData.map((item, index) => {
              const selected = isFaultSelected(item);
              const title = item.RDesc || item.Faults || item.RsnCode || `Fault ${index + 1}`;

              return (
                <TouchableOpacity
                  key={`${item.UId ?? 'fault'}_${item.SubSr ?? index}`}
                  activeOpacity={0.75}
                  disabled={loading}
                  onPress={() => toggleFaultSelection(item)}
                  style={[
                    styles.faultChip,
                    selected && styles.faultChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.faultChipText,
                      selected && styles.faultChipTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {filteredFaultsData.length === 0 && (
              <Text style={styles.noResultText}>No matching faults found</Text>
            )}
          </ScrollView>

          </View>
        </View>
      {/* </View> */}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 660,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  infoCard: {
    minHeight: 58,
    backgroundColor: '#EEF6FD',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E1EDF7',
  },
  infoItem: {
    width: '25%',
    minWidth: 72,
  },
  takaItem: {
    flex: 1,
    width: undefined,
  },
  meterItem: {
    width: '18%',
    minWidth: 55,
  },
  infoDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#D4E1EC',
    marginHorizontal: 9,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 3,
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 7,
  },
  required: {
    color: '#DC2626',
  },
  faultValueInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 13,
    color: '#0F172A',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 11,
  },
  searchContainer: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    marginBottom: 13,
  },
  searchIcon: {
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  selectLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  faultScroll: {
    maxHeight: 300,
  },
  faultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  faultChip: {
    minHeight: 42,
    maxWidth: '49%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: '2%',
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1E4CE',
    backgroundColor: '#FFF4E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faultChipSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F5FBFF',
    borderWidth: 1.5,
  },
  faultChipText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  faultChipTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  noResultText: {
    width: '100%',
    textAlign: 'center',
    color: '#94A3B8',
    marginVertical: 22,
    fontSize: 14,
  },
});

export default FaultsModal;
