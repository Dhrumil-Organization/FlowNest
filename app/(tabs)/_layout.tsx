import { Tabs } from 'expo-router';
import CustomFooter from '../../components/CustomFooter';

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // ❌ default tabs hide
        }}
      >
        <Tabs.Screen name="index" />
        {/* <Tabs.Screen name="explore" /> */}
      </Tabs>

      {/* ✅ CUSTOM FOOTER */}
      <CustomFooter />
    </>
  );
}