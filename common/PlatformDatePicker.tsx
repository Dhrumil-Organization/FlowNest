import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    value: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
    style?: any;
    textStyle?: any;
    formatFull?: (d: Date) => string;
}

const defaultFormatFull = (d: Date) =>
    d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

// IMPORTANT:
// Never use toISOString() for a date-only field.
// This keeps the selected local calendar date exactly as selected.
const createLocalDate = (year: number, month: number, day: number) => {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const toInputValue = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
};

export const PlatformDatePicker: React.FC<Props> = ({
    value,
    onChange,
    placeholder = 'Select date',
    style,
    textStyle,
    formatFull = defaultFormatFull,
}) => {
    const [show, setShow] = useState(false);

    // WEB
    if (Platform.OS === 'web') {
        return (
            // @ts-ignore
            <input
                type="date"
                value={value ? toInputValue(value) : ''}
                onChange={(e: any) => {
                    const val = e.target.value;

                    if (!val) return;

                    const [y, m, d] = val.split('-').map(Number);

                    if (
                        !Number.isFinite(y) ||
                        !Number.isFinite(m) ||
                        !Number.isFinite(d)
                    ) {
                        return;
                    }

                    // IMPORTANT:
                    // Create local date, not UTC date.
                    const newDate = createLocalDate(y, m, d);

                    if (!isNaN(newDate.getTime())) {
                        onChange(newDate);
                    }
                }}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #ddd',
                    backgroundColor: '#F3F4F6',
                    color: '#000',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                }}
            />
        );
    }

    // MOBILE
    return (
        <View>
            <TouchableOpacity
                style={style}
                onPress={() => setShow(true)}
                activeOpacity={0.7}
            >
                <Text style={textStyle}>
                    {value ? formatFull(value) : placeholder}
                </Text>
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShow(Platform.OS === 'ios');

                        if (
                            selectedDate &&
                            event.type !== 'dismissed'
                        ) {
                            // Keep only the calendar date selected by user.
                            const localDate = createLocalDate(
                                selectedDate.getFullYear(),
                                selectedDate.getMonth() + 1,
                                selectedDate.getDate(),
                            );

                            onChange(localDate);
                        }
                    }}
                />
            )}
        </View>
    );
};

