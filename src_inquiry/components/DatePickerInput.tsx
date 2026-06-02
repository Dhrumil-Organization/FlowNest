import React, { useState } from 'react';
import { TouchableOpacity, Text, Modal, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, radius, fontSize } from '../utils/theme';
import { StyleSheet } from 'react-native';

interface DatePickerInputProps {
  label?: string;
  value: string; // format: DD/MM/YYYY or empty
  onChange: (dateString: string) => void;
  placeholder?: string;
  required?: boolean;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  required = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };
  const [tempDate, setTempDate] = useState<Date | null>(value ? parseDate(value) : null);

 

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleConfirm = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      const formatted = formatDate(selectedDate);
      onChange(formatted);
      setTempDate(selectedDate);
    } else if (Platform.OS === 'ios') {
      setShowPicker(false);
    }
  };

  const handleIOSConfirm = () => {
    if (tempDate) {
      onChange(formatDate(tempDate));
    }
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
        </Text>
      )}
      <TouchableOpacity style={styles.dateBox} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.dateText : styles.placeholderText}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showPicker}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => setTempDate(date || tempDate)}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleIOSConfirm}>
                    <Text style={styles.modalConfirm}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate || new Date()}
            mode="date"
            display="default"
            onChange={handleConfirm}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  dateBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    minHeight: 44,
  },
  dateText: { fontSize: fontSize.md, color: colors.textPrimary },
  placeholderText: { fontSize: fontSize.md, color: colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.cardBg, borderRadius: radius.md, padding: spacing.md, width: '90%' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  modalCancel: { fontSize: fontSize.md, color: colors.danger, fontWeight: '500' },
  modalConfirm: { fontSize: fontSize.md, color: colors.primary, fontWeight: '500' },
});

export default DatePickerInput;