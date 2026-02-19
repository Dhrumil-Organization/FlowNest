import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, AppTheme } from './theme';

type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
    theme: AppTheme;
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');

    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('app_theme_mode');
            if (saved === 'dark' || saved === 'light') setMode(saved);
        })();
    }, []);

    const toggleTheme = async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        await AsyncStorage.setItem('app_theme_mode', newMode);
    };

    const theme = mode === 'dark' ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
};
