import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    value: Date;
    onChange: (date: Date) => void;
    style?: any;
    textStyle?: any;
    mode?: 'date' | 'time' | 'datetime';
}

const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const toInputValue = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`; // yyyy-mm-dd for <input type=date>
};

export const PlatformDatePicker: React.FC<Props> = ({
    value,
    onChange,
    style,
    textStyle,
    mode = 'date',
}) => {
    const [show, setShow] = React.useState(false);

    // 🌐 WEB
    if (Platform.OS === 'web') {
        return (
            <View style={style}>
                {/* @ts-ignore - react-native-web supports this */}
                <input
                    type="date"
                    value={toInputValue(value)}
                    onChange={(e: any) => {
                        const val = e.target.value; // yyyy-mm-dd
                        if (!val) return;
                        const [y, m, d] = val.split('-').map(Number);
                        const newDate = new Date(y, m - 1, d);
                        if (!isNaN(newDate.getTime())) onChange(newDate);
                    }}
                    style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 5,
                        border: '1px solid #ccc',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: 15,
                        outline: 'none',
                        cursor: 'pointer',
                        // make the calendar icon white
                        colorScheme: 'dark',
                    }}
                />
                {/* Optional: show selected date below */}
                <Text style={[styles.helperText, textStyle]}>
                    Selected: {formatDate(value)}
                </Text>
            </View>
        );
    }

    // 📱 MOBILE (iOS / Android)
    return (
        <View>
            <TouchableOpacity
                style={style}
                onPress={() => setShow(true)}
                activeOpacity={0.7}
            >
                <Text style={textStyle}>{formatDate(value)}</Text>
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={value}
                    mode={mode}
                    display="default"
                    onChange={(event, date) => {
                        // iOS keeps it open, Android closes on select
                        setShow(Platform.OS === 'ios');
                        if (date) onChange(date);
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    helperText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
        opacity: 0.8,
    },
});