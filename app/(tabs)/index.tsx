import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Dimensions } from 'react-native';
import { useAuth } from '../../hooks/AuthContext';

const { width } = Dimensions.get('window');

const NUM_COLUMNS = Math.max(3, Math.floor(width / 120));
const ITEM_SIZE = (width - 40) / NUM_COLUMNS;

const ALL_APPS = [
  { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4' },
  { name: 'Receivables', icon: 'receipt-long', route: 'receivables', color: '#773F3F' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Home() {
  const { username } = useAuth();
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState<any[]>([]);
  const [selectedLetter, setSelectedLetter] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  // 🔥 LOAD MENU APPS FROM CACHE
  useEffect(() => {
    const loadApps = async () => {
      try {
        const data = await AsyncStorage.getItem('user_menu_apps');

        if (!data) return;

        const decoded = atob(data);
        // const parsed = JSON.parse(decoded);
        const parsed = [
                    {
                        "title": "",
                        "pages": [
                            {
                                "title": "Mobile App",
                                "href": "#",
                                "icon": "",
                                "children": [
                                    {
                                        "title": "Credit Limit Request",
                                        "href": "/"
                                    },
                                    {
                                        "title": "Receivables",
                                        "href": "/"
                                    },
                                ]
                            }
                        ]
                    }
                ];

        const mobileApp = parsed.find((item: any) =>
          item.pages?.some((p: any) => p.title === 'Mobile App')
        );

        const children = mobileApp?.pages?.find(
          (p: any) => p.title === 'Mobile App'
        )?.children || [];

        const allowedNames = children.map((c: any) => c.title);

        const filteredApps = ALL_APPS.filter(app =>
          allowedNames.includes(app.name)
        );

        // 🔥 SORT A-Z
        filteredApps.sort((a, b) => a.name.localeCompare(b.name));

        setApps(filteredApps);

      } catch (e) {
        console.log("❌ MENU ERROR", e);
      }
    };

    loadApps();
  }, []);

  // 🔥 SEARCH FILTER
  const filteredApps = useMemo(() => {
    return apps.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [apps, search]);

  // 🔥 ALPHABET SCROLL
  const scrollToLetter = (letter: string) => {
    const index = filteredApps.findIndex(a =>
      a.name.startsWith(letter)
    );

    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setSelectedLetter(letter);
      setTimeout(() => setSelectedLetter(''), 800);
    }
  };

  return (
    <View style={{ flex: 1 }}>

      <Header userName={username} onSearch={setSearch} />

      <FlatList
        ref={flatListRef}
        data={filteredApps}
        numColumns={NUM_COLUMNS}
        key={NUM_COLUMNS} // 🔥 important for rerender
        keyExtractor={(item) => item.name}
        contentContainerStyle={{
          padding: 10,
          paddingBottom: 120,
          alignItems: 'flex-start' // 🔥 no stretch
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { width: ITEM_SIZE }]}
            onPress={() => router.push(`/app/${item.route}`)}
          >
            <View style={[styles.icon, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={22} color="#fff" />
            </View>
            <Text style={styles.text}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* 🔥 RIGHT SIDE ALPHABET */}
      <View style={styles.alphabet}>
        {ALPHABET.map(letter => (
          <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)}>
            <Text style={[
              styles.alphaText,
              selectedLetter === letter && { color: 'blue' }
            ]}>
              {letter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 6,
    alignItems: 'center',
  },
  icon: {
    width: 55,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center'
  },
  alphabet: {
    position: 'absolute',
    right: 5,
    top: 100,
    bottom: 100,
    justifyContent: 'center'
  },
  alphaText: {
    fontSize: 10,
    padding: 2
  }
});