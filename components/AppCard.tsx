// components/AppCard.tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function AppCard({ title, route }: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(route)}
    >
      <Text style={styles.icon}>📱</Text>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '30%',
    height: 100,
    backgroundColor: '#222',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    color: '#fff',
    marginTop: 5,
  },
});