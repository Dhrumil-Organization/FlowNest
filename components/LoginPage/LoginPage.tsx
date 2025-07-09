import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  setIsLoggedIn: (value: boolean) => void;
  setToken: (value: string) => void;
  getDeviceId: string | null;
}


const LoginScreen: React.FC<Props> = ({ setIsLoggedIn, setToken, getDeviceId }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  console.log("getDeviceId in Login Page:", getDeviceId);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('❌ Error', 'Please enter username and password.');
      return;
    }

    const payload = {
      name: username.trim(),
      password: password.trim(),
    };

    console.log('🔵 Sending login payload:', payload);

    try {
      setIsLoading(true);

      const response = await axios.post(
        'https://apig.tms-webapp.com/api/login',
        payload,
      );

      console.log('✅ Login API Response:', response.data);

      const token = response.data.response.access_token;
      console.log('✅ Access Token:', token);
      if (response.data.success === true) {
        if (token) {
          await AsyncStorage.setItem('access_token', token);
          setToken(token);
          setIsLoggedIn(true);
          console.log('🔒 Token saved in AsyncStorage');
          // Alert.alert('✅ Success', 'Login successful!');
        } else {
          Alert.alert('❌ Error', `${response.data.response.message}`);
        }
      } else if (response.data.success === false) {
        Alert.alert('❌ Error', `${response.data.message}`);
      } else {
        Alert.alert('❌ Error', `${response.data.message}`);
      }

    } catch (error) {
      console.error('❌ Login API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.log('🔴 API Error Response:', error.response.data);
        Alert.alert('❌ API Error', JSON.stringify(error.response.data));
      } else {
        Alert.alert('❌ Error', 'Something went wrong.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🔐 Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, styles.passwordInput]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      // secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, isLoading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🚀 Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#000',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    color: '#000',
  },
  passwordInput: {
    // borderColor: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
