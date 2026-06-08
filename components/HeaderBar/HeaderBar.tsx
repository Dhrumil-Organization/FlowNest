// export default HeaderBar;
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  SafeAreaView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';
import { useNavigation } from '@react-navigation/native';

// LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HeaderProps {
  userName: string;
  onSearch: (query: string) => void;
  placeholder?: string;
}

const HeaderBar: React.FC<HeaderProps> = ({ userName, onSearch, placeholder = 'Search apps...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvatarBarVisible, setIsAvatarBarVisible] = useState(false);
  const navigation = useNavigation();
  // 
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const unlockTimerRef = useRef<any>(null);
  const [searchTriggeredUnlock, setSearchTriggeredUnlock] = useState(false);


  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const LIVE_LOGS_PASSWORD = 'laravel@react'; // hardcoded

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearch(text);

    // ✅ normal search functionality chalegi
    const cleanText = (text || '').trim().toLowerCase();

    // ✅ only trigger modal if user typed "logs"
    const shouldTriggerLogsUnlock =
      cleanText === 'logs' || cleanText.includes('logs');

    // ✅ if not logs then behave normal
    if (!shouldTriggerLogsUnlock) {
      setSearchTriggeredUnlock(false);
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      return;
    }

    // ✅ if logs typed -> wait 2 sec idle then modal
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);

    unlockTimerRef.current = setTimeout(async () => {
      // modal should open only once per "logs typing"
      if (!searchTriggeredUnlock) {
        setUnlockModalVisible(true);
        setSearchTriggeredUnlock(true);
      }
    }, 2000);
  };


  const toggleAvatarBar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAvatarBarVisible(v => !v);
  };

  const initial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <>
      <LinearGradient
        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Home' as never)}>
              <View style={styles.brand}>
                <Image
                  source={{ uri: '@mipmap/logo' }}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="FlowNest logo"
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.brandTitle}>FlowNest</Text>
                  <Text style={styles.brandSub}>Portal</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Icon name="notifications-none" size={22} color="#E8F7F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Settings_old' as never)}
              >
                <Icon name="settings" size={22} color="#E8F7F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleAvatarBar} style={styles.avatarBtn}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {isAvatarBarVisible && (
            <View style={styles.avatarBar}>
              <Text style={styles.welcomeText}>Welcome back, <Text style={{ fontWeight: '700' }}>{userName}</Text></Text>
              <Text style={styles.smallText}>Quick access to your assigned apps</Text>
            </View>
          )}

          <View style={styles.searchRow}>
            <Icon name="search" size={18} color={theme.BRAND_DARK} style={{ marginLeft: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder={placeholder}
              placeholderTextColor={theme.MUTED}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Search apps"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearBtn}>
                <Icon name="close" size={18} color={theme.BRAND_DARK} />
              </TouchableOpacity>
            ) : <View style={{ width: 34 }} />}
          </View>
        </SafeAreaView>
      </LinearGradient>
      <Modal
        transparent
        visible={unlockModalVisible}
        animationType="fade"
        onRequestClose={() => setUnlockModalVisible(false)}
      >
        <View style={homeStyles.modalOverlay}>
          <View style={homeStyles.modalBox}>

            <Text style={homeStyles.modalTitle}>Unlock Live Logs</Text>
            <Text style={homeStyles.modalSub}>
              Live logs enable karne ke liye password enter karo.
            </Text>

            <TextInput
              value={unlockPass}
              onChangeText={(t) => {
                setUnlockPass(t);
                setUnlockError('');
              }}
              placeholder="Enter password"
              secureTextEntry
              style={homeStyles.passInput}
            />

            {!!unlockError && <Text style={homeStyles.errorText}>{unlockError}</Text>}

            <View style={homeStyles.modalBtnRow}>
              <TouchableOpacity
                style={[homeStyles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                onPress={async () => {
                  setUnlockModalVisible(false);
                  setUnlockPass('');
                  setUnlockError('');

                  // ❌ reset unlocked
                  await AsyncStorage.setItem('live_logs_unlocked', 'false');
                }}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[homeStyles.modalBtn, { backgroundColor: theme.BRAND_GRADIENT_END }]}
                onPress={async () => {
                  if (unlockPass === LIVE_LOGS_PASSWORD) {
                    await AsyncStorage.setItem('live_logs_unlocked', 'true');
                    setUnlockModalVisible(false);
                    setUnlockPass('');
                    setUnlockError('');
                    Alert.alert('Success', 'Live Logs Enabled ✅');
                  } else {
                    setUnlockError('Invalid password!');
                    await AsyncStorage.setItem('live_logs_unlocked', 'false');
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    elevation: 6,
  },
  safe: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brandTitle: { color: '#EAF8F7', fontSize: 18, fontWeight: '700' },
  brandSub: { color: '#D9F0EE', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginRight: 6, borderRadius: 8 },
  avatarBtn: { padding: 4 },
  avatarCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EAF8F7', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: theme.BRAND_DARK, fontWeight: '800', fontSize: 14 },
  avatarInitialIcom: { color: theme.BRAND_DARK },
  avatarBar: { marginTop: 10, marginBottom: 8 },
  welcomeText: { color: '#EAF8F7', fontSize: 14, marginBottom: 4 },
  smallText: { color: '#D9F0EE', fontSize: 12 },
  searchRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    elevation: 2,
    shadowColor: theme.SHADOW,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 15, color: theme.BRAND_DARK, marginLeft: 6 },
  clearBtn: { width: 34, justifyContent: 'center', alignItems: 'center' },
});

const homeStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.BRAND_DARK,
  },
  modalSub: {
    marginTop: 6,
    fontSize: 12,
    color: theme.MUTED,
  },
  passInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  errorText: {
    marginTop: 8,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBtnRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
});


export default HeaderBar;
