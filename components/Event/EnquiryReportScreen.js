// EnquiryReportScreen.js
// User-wise enquiry summary report, filterable by event.
// Tapping a user card navigates to EnquiryReportDrilldownScreen.
//
// This screen requires internet (it's a report against server data, not an
// offline-first screen like NewEnquiryScreen) — show a simple message if
// offline rather than attempting to load.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import { isOnline } from './CardScanService';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';

// Configure your actual events here, or fetch from an /events endpoint
// if you run many shows per year.
// const EVENTS = [
//   { code: 'all', label: 'All events' },
//   { code: 'bharattex2026', label: 'Bharat Tex 2026' },
//   { code: 'heimtextil2026', label: 'Heimtextil India 2026' },
// ];

export default function EnquiryReportScreen({ navigation, username }) {
  const [eventCode, setEventCode] = useState('');
  // const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].code);
  // const [EVENTS, setEVENTS] = useState(EVENTS[0].code);
  const [EVENTS, setEVENTS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [summary, setSummary] = useState({
    users: [],
    totals: { enquiries: 0, qty: 0, users: 0 },
  });

  const loadEvent = useCallback(async () => {
    const online = await isOnline();
    if (!online) {
      setOffline(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOffline(false);

    try {
      const res = await api.get(`${API}/api/getevent?prptype=S&yearno=27`, {
        // params: { event: selectedEvent },
        params: {},
      });
      console.log('event dropdown res', res);
      setEVENTS(res.data.data);
      setEventCode(res.data.data[0].EventId);
      loadSummary(res.data.data[0].EventId);
    } catch (err) {
      console.log('Failed to load report summary', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSummary = useCallback(async selectedEvent => {
    const online = await isOnline();
    if (!online) {
      setOffline(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOffline(false);

    try {
      const res = await api.get(
        `${API}/api/reports/enquiries/summary?prptype=S&yearno=27`,
        {
          // params: { event: selectedEvent },
          params: {},
        },
      );
      console.log('loadSummary res', selectedEvent, res);
      setSummary(res.data);
    } catch (err) {
      console.log('Failed to load report summary', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // loadSummary(eventCode);
    loadEvent();
  }, [eventCode, loadEvent]);

  function onRefresh() {
    setRefreshing(true);
    loadSummary(eventCode);
  }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  function renderUserCard({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('EnquiryReportDrilldown', {
            userId: item.user_id,
            userName: item.name,
            userRole: item.role,
            eventCode,
          })
        }
      >
        <View style={styles.cardHead}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>
          <View>
            <Text style={styles.uname}>{item.name}</Text>
            <Text style={styles.urole}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{item.enquiry_count}</Text>
            <Text style={styles.statLbl}>Enquiries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {item.total_qty.toLocaleString()}
            </Text>
            <Text style={styles.statLbl}>Total qty (m)</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (offline) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.offlineTitle}>Report needs internet</Text>
        <Text style={styles.offlineSub}>
          This report pulls live data from the server. Please reconnect and try
          again.
        </Text>
      </View>
    );
  }

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Event Report'}
        subHeader={'Manage your event report'}
      />
      <View style={styles.screen}>
        {/* <Text style={styles.title}>Enquiry Report</Text> */}

        <View style={styles.pickerWrap}>
          <Picker selectedValue={eventCode} onValueChange={setEventCode}>
            {EVENTS &&
              EVENTS.map(e => (
                <Picker.Item
                  key={e.EventId}
                  label={e.EventName}
                  value={e.EventId}
                />
              ))}
          </Picker>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#c2622f" />
        ) : (
          <>
            <Text style={styles.totalsLine}>
              {summary?.totals?.users} users · {summary?.totals?.enquiries}{' '}
              enquiries · {summary?.totals?.qty.toLocaleString()} m total
            </Text>

            <FlatList
              data={summary?.users}
              keyExtractor={item => String(item?.user_id)}
              renderItem={renderUserCard}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <Text style={styles.empty}>
                  No enquiries recorded for this event yet.
                </Text>
              }
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f6f2' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pickerWrap: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e3e1da',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
    marginTop: 8
  },
  totalsLine: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e3e1da',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fbeee6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#c2622f', fontWeight: '700', fontSize: 13 },
  uname: { fontSize: 14.5, fontWeight: '700', color: '#1f2937' },
  urole: { fontSize: 11, color: '#6b7280' },
  statRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e3e1da',
    paddingTop: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  statLbl: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  empty: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 40 },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f6f2',
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  offlineSub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
});
