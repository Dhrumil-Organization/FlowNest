// app/(noLayout)/fullscreen.tsx
import { View, Text } from 'react-native';

export default function Fullscreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>No Header/Footer Screen</Text>
    </View>
  );
}