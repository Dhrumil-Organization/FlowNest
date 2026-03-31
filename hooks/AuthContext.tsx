import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  token: string;
  username: string;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  token: '',
  username: '',
  setToken: () => {},
  setUsername: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('access_token');
      const u = await AsyncStorage.getItem('user_details');
      setToken(t || '');
      setUsername(u || 'User');
    };
    load();
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, setToken, setUsername }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);