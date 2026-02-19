
import React, { useState } from 'react';
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
} from 'react-native';
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
  // onSearch: (query: string) => void;
  placeholder?: string;
  timePeriodGradient?: any;
}

const HeaderBarDashboard: React.FC<HeaderProps> = ({ userName, onSearch, placeholder = 'Search apps...', timePeriodGradient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvatarBarVisible, setIsAvatarBarVisible] = useState(false);
  const navigation = useNavigation();

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // onSearch(text);
  };

  const toggleAvatarBar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAvatarBarVisible(v => !v);
  };

  const initial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <LinearGradient
      colors={timePeriodGradient || [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
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

            <TouchableOpacity onPress={toggleAvatarBar} style={styles.avatarBtn}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {isAvatarBarVisible && (
          <View style={styles.avatarBar}>
            <Text style={styles.welcomeText}>Welcome back, <Text style={{fontWeight:'700'}}>{userName}</Text></Text>
            <Text style={styles.smallText}>Quick access to your assigned apps</Text>
          </View>
        )}

        {/* <View style={styles.searchRow}>
          <Icon name="search" size={18} color={theme.BRAND_DARK} style={{ marginLeft: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={placeholder}
            placeholderTextColor={theme.MUTED}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search apps"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
              <Icon name="close" size={18} color={theme.BRAND_DARK} />
            </TouchableOpacity>
          ) : <View style={{ width: 34 }} />}
        </View> */}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: 12,
    // borderBottomLeftRadius: 10,
    // borderBottomRightRadius: 10,
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

export default HeaderBarDashboard;
