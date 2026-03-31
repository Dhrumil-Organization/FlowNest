// components/Layout.tsx
import { View } from 'react-native';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, header=true, footer=true }: any) {
  return (
    <View style={{ flex:1 }}>
      {header && <Header />}
      <View style={{ flex:1 }}>{children}</View>
      {footer && <Footer />}
    </View>
  );
}