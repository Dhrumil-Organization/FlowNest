import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from './theme';

export default function Footer() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/(all)/landing');
    // router.push({
    //   pathname: `/(auth)/login'`,
    //   params: {
    //     _key: Math.random().toString(36).substring(2, 9) // Force remount
    //   }
    // })

  };

  const handleHome = async () => {
    // await AsyncStorage.clear();
    router.replace('/(tabs)');
    // router.push({
    //   pathname: `/`,
    //   params: {
    //     _key: Math.random().toString(36).substring(2, 9) // Force remount
    //   }
    // })

  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        {/* HOME */}
        <TouchableOpacity style={styles.item} onPress={handleHome}>
          <Icon name="home" size={22} color="#fff" />
          <Text style={styles.text}>Home</Text>
        </TouchableOpacity>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
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

    // shadow (professional look)
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
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