import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Linking,
  Image,
  LayoutAnimation,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import theme from '../../android/app/src/theme';
import { Picker } from '@react-native-picker/picker';
import { Dropdown } from 'react-native-element-dropdown';
// import React, { useEffect, useRef, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ActivityIndicator,
//   Animated,
//   Easing,
//   StyleSheet,
//   Linking,
//   Image
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginScreen_styles } from '../../common/Styles/Style';
// import DeviceInfo from 'react-native-device-info';
// import theme from '../../android/app/src/theme';
import { fetchMasterSyncPartyDataPerPrptypeCache, readPrptypeCache, getPrptypeSummary, normalizePrptype, printCachedPrptypesWithData } from '../../common/API/Functions';
import { initDatabase } from '../../common/API/DatabaseManager';
import { API, initAPI } from '../../common/API/dynamicAPI';
import {
  fetchAndCacheGlobalData,
  getCachedGlobalData,
  updateGlobalCacheInBackground
} from '../../common/utils/sqliteCacheManager';

interface Props {
  setIsLoggedIn: (value: boolean) => void;
  setToken: (value: string) => void;
  getDeviceId: string | null;
  isConnected: boolean | null;
  setUserDetails: (value: string | null) => void;
  setMenuApps: (value: string) => void;
}

const LoginScreen: React.FC<Props> = ({
  setIsLoggedIn,
  setToken,
  getDeviceId,
  isConnected,
  setUserDetails,
  setMenuApps,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [showDropdown, setShowDropdown] = useState(true);
  const [getNoti_Token, setNoti_Token] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Hardcoded Property Data
  const propertyData = [
    { label: 'Select Property', value: '' },
    { label: 'Sudamo/Knits', value: 'sudamo_knits' },
    { label: 'Rayons', value: 'rayons' },
  ];


  useEffect(() => {
    const initializeApp = async () => {
      try {

        const notification_token = await AsyncStorage.getItem('notification_token');

        setNoti_Token(notification_token as any);




      } catch (error) {
        console.error("Initialization error:", error);

      } finally {
        // setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  console.log('getNoti_Token_login', getNoti_Token, 'check device ID', getDeviceId);

  // Fade-out animation for dropdown
  const fadeOutDropdown = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowDropdown(false));
  };

  // Fade-in animation for dropdown (when going back)
  const fadeInDropdown = () => {
    setShowDropdown(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePropertySelect = async (value: string) => {
    if (!value) return;

    setSelectedProperty(value);

    await AsyncStorage.setItem('selected_property', value); // ✅ MUST await
    await initAPI(); // ✅ MUST refresh

    fadeOutDropdown();
  };



  const goBackToDropdown = () => {
    fadeInDropdown();
  };

  console.log('Login API:', API);
  // Login handler (existing)

  // Check if cache is populated
  const isCachePopulated = async (): Promise<boolean> => {
    try {
      const cachedParty = await getCachedGlobalData('party');
      const cachedItem = await getCachedGlobalData('item');
      const cachedShade = await getCachedGlobalData('shade');
      return cachedParty.length > 0 && cachedItem.length > 0 && cachedShade.length > 0;
    } catch (error) {
      console.error('❌ Error checking cache status:', error);
      return false;
    }
  };


  const handleLogin = async () => {
    console.log("`${API}/api/login`   :", `${API}/api/login`)
    if (!username || !password) {
      Alert.alert('❌ Error', 'Please enter username and password.');
      return;
    }
    const payload = {
      name: username.trim(),
      password: password.trim(),
      checkdevice: getDeviceId,
      noti_token: getNoti_Token
    };
    console.log('🔵 Sending login payload:', payload);
    try {
      setIsLoading(true);
      const headers = { 'x-platform': 'mob' };
      
      const response = await axios.post(
        // 'https://apig.tms-webapp.com/api/login',
        `${API}/api/login`,
        payload,
        { headers }
      );
      console.log('✅ Login API Response:', response.data);
      const token = response.data.response.access_token;
      
      const user_details = response.data.response.user?.first_name || 'user';
      const user_menu_apps = response.data.response.usermenu || '';
      const ismastersync = response.data.response.ismastersync || '';
      const ismastersyncData = response.data.response.mastersyncprptypes || [];
      const userof = response.data.response.userof;
      const yno = response.data.response.year.YearNo || '';
      //const lui = response.data.response.user.id;
      //console.log("lui =================================>", lui)
      if (response.data.success === true) {
        if (token && user_details && user_menu_apps) {
          await AsyncStorage.setItem('access_token', token);
          await AsyncStorage.setItem('user_details', user_details);
          await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
          await AsyncStorage.setItem('user_prptype', userof);
          await AsyncStorage.setItem('login_user_name', username.trim());
          await AsyncStorage.setItem('login_user_passwd', password.trim());
          await AsyncStorage.setItem('yno', yno.trim());
          //await AsyncStorage.setItem('lui', lui);
          setToken(token);
          setUserDetails(user_details);
          setMenuApps(user_menu_apps);
          setIsLoggedIn(true);
          // const cachedParty = await getCachedGlobalData('party').catch(() => []);
          const cachePopulated = await isCachePopulated();
          if (!cachePopulated) {
            await fetchAndCacheGlobalData(token); // Only fetch if cache is empty
          } else {
            console.log('✅ Using existing cached data');
          }
          await fetchAndCacheGlobalData(token); // Cache global data
          // await fetchAndCacheGlobalData(token);
          await AsyncStorage.setItem('master_sync_data_common', JSON.stringify(ismastersyncData));
          if (ismastersync == 1 || ismastersync === '1' || ismastersync === true) {
            try {
              await AsyncStorage.setItem('master_sync_data', JSON.stringify(ismastersyncData));
              await initDatabase();
              await fetchMasterSyncPartyDataPerPrptypeCache(token || '', ismastersyncData);
              for (const itm of ismastersyncData) {
                const key = normalizePrptype(itm.prptype ?? itm.PrpType ?? '');
                const summary = await getPrptypeSummary(key);
                console.log(`→ summary for requested prptype "${itm.prptype}":`, summary);
              }
              // await printCachedPrptypesWithData();
            } catch (err) {
              console.warn('Master-sync or verification failed:', err);
            }
          }
        } else {
          Alert.alert('❌ Error', `${response.data.response.message}`);
        }
      } else {
        Alert.alert('❌ Error', `${response.data.message}`);
      }
    } catch (error) {
      console.error('❌ Login API Error:', error);
      Alert.alert('Error', 'Server error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {showDropdown ? (
        <Animated.View style={[styles.dropdownContainer, { opacity: fadeAnim }]}>
          <Image source={require('../images/badge.png')} style={styles.logo} resizeMode="contain" />
          <View style={[styles.inputContainer, { backgroundColor: '#f8f9fa', color: '#000' }]}>
            <Icon name="business" size={24} color={theme.BRAND_GRADIENT_END} />
            <View style={styles.pickerWrapper}>
              {/* <Picker
                mode="dropdown"
                selectedValue={selectedProperty}
                onValueChange={handlePropertySelect}
                style={styles.picker}
                dropdownIconColor={theme.BRAND_GRADIENT_END}
              >
                {propertyData.map((item) => (
                  <Picker.Item
                    key={item.value}
                    label={item.label}
                    value={item.value}
                    color="#000"
                  />
                ))}
              </Picker> */}
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownContainerStyle}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                data={propertyData}
                labelField="label"
                valueField="value"
                placeholder="Select Property"
                value={selectedProperty}
                onChange={item => handlePropertySelect(item.value)}
              />
            </View>
          </View>
        </Animated.View>

      ) : (
        <>
          <TouchableOpacity style={styles.backButton} onPress={goBackToDropdown}>
            <Icon name="arrow-back" size={24} color={theme.BRAND_GRADIENT_END} />
          </TouchableOpacity>
          <Image source={require('../images/badge.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={24} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={24} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color={theme.BRAND_GRADIENT_END}
              />
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={styles.buttonTouch}
              onPress={handleLogin}
              disabled={isLoading || !isConnected}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 40,
    shadowColor: theme.BRAND_GRADIENT_END,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  dropdownContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dropdownLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.BRAND_GRADIENT_END,
    paddingVertical: 8,
    color: '#fff',
  },
  // picker: {
  //   flex: 1,
  //   height: 50,
  //   color: '#333',
  // },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 6
  },

  picker: {
    flex: 1,
    color: "#000",
    backgroundColor: "#f8f9fa"
  },
  dropdown: {
    flex: 1,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10
  },

  dropdownContainerStyle: {
    backgroundColor: "#fff",
    borderRadius: 8
  },

  placeholderStyle: {
    color: "#666",
    fontSize: 16
  },

  selectedTextStyle: {
    color: "#000",
    fontSize: 16
  },

  itemTextStyle: {
    color: "#000",
    fontSize: 16
  }
});

export default LoginScreen;