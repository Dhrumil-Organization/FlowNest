import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet
} from 'react-native';

import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';

export default function ContactScreen() {

  const router = useRouter();

  return (

    <ScrollView style={styles.container}>

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
          /> </TouchableOpacity>

        <Text style={styles.title}>
          Contact Us
        </Text>

      </LinearGradient>

      <View style={styles.card}>

        <Text style={styles.heading}>
          Madhusudan Group
        </Text>

        <Text style={styles.text}>
          Textile Manufacturing & Innovation
        </Text>

        <Text style={styles.label}>
          Website
        </Text>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              'https://madhusudangroup.com'
            )
          }

        >

          <Text style={styles.link}>
            www.madhusudangroup.com
          </Text>
        </TouchableOpacity>

      </View>

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
    paddingBottom: 25,
    paddingHorizontal: 20
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 15
  },
  card: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20
  },
  heading: {
    fontSize: 20,
    fontWeight: '700'
  },
  text: {
    color: '#666',
    marginTop: 5
  },
  label: {
    marginTop: 25,
    fontWeight: '700'
  },
  link: {
    color: theme.BRAND_GRADIENT_END,
    marginTop: 10
  }
});
