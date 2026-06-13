import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';

export default function AboutScreen() {

  const router = useRouter();

  return (<ScrollView style={styles.container}>


    <LinearGradient
      colors={[
        theme.BRAND_GRADIENT_START,
        theme.BRAND_GRADIENT_END
      ]}
      style={styles.header}
    >

      <TouchableOpacity
        onPress={() => router.back()}
      >
        <Icon
          name="arrow-back"
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        About FlowNest
      </Text>

    </LinearGradient>

    <View style={styles.card}>
      <Text style={styles.desc}>
        FlowNest is a cloud-based ERP platform
        designed for textile and manufacturing businesses.

        It enables organizations to manage production,
        receivables, collections, analytics and operations
        from a unified mobile experience.
      </Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        Key Features
      </Text>

      <Text style={styles.item}>✓ Production Tracking</Text>
      <Text style={styles.item}>✓ Sales Analytics</Text>
      <Text style={styles.item}>✓ Receivables Management</Text>
      <Text style={styles.item}>✓ Collection Tracking</Text>
      <Text style={styles.item}>✓ Packing Automation</Text>
    </View>

    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        Linking.openURL(
          'https://madhusudangroup.com'
        )
      }
    >
      <Text style={styles.btnText}>
        Visit Website
      </Text>
    </TouchableOpacity>

  </ScrollView>


  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.NEUTRAL_BG
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 25
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 15
  },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    borderRadius: 18,
    padding: 20
  },
  desc: {
    lineHeight: 26,
    color: '#555'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15
  },
  item: {
    marginBottom: 10,
    fontSize: 15
  },
  button: {
    margin: 20,
    backgroundColor: theme.BRAND_GRADIENT_END,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnText: {
    color: '#fff',
    fontWeight: '700'
  }
});
