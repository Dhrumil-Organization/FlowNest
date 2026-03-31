// app/(tabs)/app1.tsx
import { View, Text } from 'react-native';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function App1() {
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>App 1 Screen</Text>
      </View>
      <Footer />
    </View>
  );
}