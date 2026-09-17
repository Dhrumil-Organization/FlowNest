import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { theme } from '../components/theme';

export default function CustomFooter() {
  const router = useRouter();
  const pathname = usePathname();

  // ❌ HIDE FOOTER ON THESE ROUTES
  const hiddenRoutes = [
    '/(auth)/login',
    '/access-denied',
  ];

  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

  const handleLogout = async () => {
    // await AsyncStorage.clear();
    await AsyncStorage.removeItem('access_token');
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.item}>
          <Icon name="home" size={22} color="#fff" />
          <Text style={styles.text}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.item}>
          <Icon name="logout" size={22} color="#fff" />
          <Text style={styles.text}>Logout</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    width: '90%',
    backgroundColor: theme.BRAND_GRADIENT_END,
    borderRadius: 20,
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 5,
  },
  item: {
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
});