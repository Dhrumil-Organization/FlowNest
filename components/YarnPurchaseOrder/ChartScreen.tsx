// SAME IMPORTS (NO CHANGE)
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Animated,
  PanResponder
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API } from '../../common/API/dynamicAPI';

// ---------- DATE ----------
const parseDate = (str) => {
  const [d, m, y] = str.split('-');
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  return new Date(y, months[m], d);
};

const formatShort = (date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const formatFull = (date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ---------- SKELETON ----------
const Skeleton = () => (
  <View style={{
    marginTop:12,
    backgroundColor:'#fff',
    borderRadius:18,
    padding:14
  }}>
    <View style={{ height:14, backgroundColor:'#eee', width:'40%', borderRadius:6, marginBottom:10 }} />
    <View style={{ height:220, backgroundColor:'#eee', borderRadius:12 }} />
  </View>
);

// ---------- MAIN ----------
const ChartScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const { item, d1Item, token } = route.params;

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('item');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [filterVisible, setFilterVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [activeQuick, setActiveQuick] = useState(null);

  const animateTab = () => {
    fadeAnim.setValue(0.3);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideAnim = useRef(new Animated.Value(300)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) closeSheet();
        else openSheet();
      },
    })
  ).current;

  const openSheet = () => {
    setFilterVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setFilterVisible(false));
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const type = await AsyncStorage.getItem('user_prptype');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/purchase_order_chart`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prptype: type,
          yearno: item.yearno,
          prpcode: item.PrpCode,
          uid: item.UId,
          strcode: item.StrCode,
          itmcode: d1Item.ItmCode,
          parcode: item.ParCode,
        }),
      });

      const result = await res.json();

      // ✅ SAFE SET (NO CRASH)
      if (result?.success) {
        setChartData({
          itemwisedata: result?.response?.itemwisedata || [],
          partywisedata: result?.response?.partywisedata || [],
          itemdetail: result?.response?.itemdetail || "",
          party_detail: result?.response?.party_detail || ""
        });
      } else {
        setChartData({ itemwisedata: [], partywisedata: [] });
      }

    } catch (e) {
      console.log(e);
      setChartData({ itemwisedata: [], partywisedata: [] });
    }

    setLoading(false);
  };

  const applyQuick = (days) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    setTempFrom(past);
    setTempTo(today);
    setActiveQuick(days);
  };

  const filterData = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((d) => {
      if (!d?.label) return false;
      const dt = parseDate(d.label);
      if (fromDate && dt < fromDate) return false;
      if (toDate && dt > toDate) return false;
      return true;
    });
  };

  const itemData = useMemo(() => filterData(chartData?.itemwisedata), [chartData, fromDate, toDate]);
  const partyData = useMemo(() => filterData(chartData?.partywisedata), [chartData, fromDate, toDate]);

  // ---------- CHART ----------
  const Chart = ({ data, title }) => {

    // ✅ PREVENT CRASH
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <View style={{
          marginTop:12,
          backgroundColor:'#fff',
          borderRadius:18,
          padding:20,
          alignItems:'center'
        }}>
          <Text style={{ color:'#777' }}>No data available</Text>
        </View>
      );
    }

    const labels = data.map(d => formatShort(parseDate(d.label)));
    const values = data.map(d => Number(d.value));
    const chartWidth = Math.max(width, labels.length * 80);

    const selectedRef = useRef({ label: '', value: '' });
    const [, forceUpdate] = useState(0);

    return (
      <Animated.View style={{
        marginTop: 12,
        backgroundColor:'#fff',
        borderRadius:18,
        padding:14,
        elevation:4,
        opacity: fadeAnim
      }}>

        <Text style={{ textAlign:'center', fontWeight:'bold', marginBottom:8, color:'#0F6C7B' }}>
          {title}
        </Text>

        <View style={{ height:45, alignItems:'center', justifyContent:'center' }}>
          {selectedRef.current.value ? (
            <>
              <Text style={{ fontSize:12, color:'#666' }}>{selectedRef.current.label}</Text>
              <Text style={{ fontSize:18, fontWeight:'bold', color:'#0F6C7B' }}>
                ₹ {selectedRef.current.value}
              </Text>
            </>
          ) : <Text style={{ color:'transparent' }}>.</Text>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{ labels, datasets: [{ data: values }] }}
            width={chartWidth}
            height={260}
            bezier
            onDataPointClick={(d) => {
              selectedRef.current = {
                value: d.value,
                label: labels[d.index]
              };
              forceUpdate(n => n + 1);
            }}
            chartConfig={{
              backgroundGradientFrom:'#fff',
              backgroundGradientTo:'#fff',
              color:()=> '#0F6C7B',
              fillShadowGradient:'#0F6C7B',
              fillShadowGradientOpacity:0.3,
              propsForBackgroundLines:{ strokeWidth:0 },
              labelColor:()=> '#666',
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#0F6C7B"
              }
            }}
          />
        </ScrollView>

      </Animated.View>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor:'#f5f5f5' }}>

      {/* HEADER */}
      <LinearGradient colors={['#0F6C7B','#13879A']} style={{ padding:15 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
          <TouchableOpacity onPress={()=>navigation.goBack()}>
            <Icon name="arrow-back" size={22} color="#fff"/>
          </TouchableOpacity>

          <Text style={{ color:'#fff', fontSize:18 }}>
            Purchase Analysis
          </Text>

          <TouchableOpacity onPress={openSheet}>
            <Icon name="filter-list" size={24} color="#fff"/>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding:12 }}>

        {/* TABS */}
        <View style={{ flexDirection:'row', backgroundColor:'#e6f2f4', borderRadius:12, padding:4 }}>
          <TouchableOpacity
            style={[styles.tab, tab==='item' && styles.active]}
            onPress={()=>{ setTab('item'); animateTab(); }}
          >
            <Text style={[styles.tabText, tab==='item' && styles.activeText]}>Item Wise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab==='party' && styles.active]}
            onPress={()=>{ setTab('party'); animateTab(); }}
          >
            <Text style={[styles.tabText, tab==='party' && styles.activeText]}>Party Wise</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <>
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <>
            {tab === 'item'
              ? <Chart data={itemData} title={chartData?.itemdetail}/>
              : <Chart data={partyData} title={chartData?.party_detail}/>
            }
          </>
        )}

      </ScrollView>

      {/* FILTER SHEET (UNCHANGED) */}
      <Modal visible={filterVisible} transparent>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' }} onPress={closeSheet}/>
        <Animated.View {...panResponder.panHandlers} style={{
          position:'absolute', bottom:0, width:'100%', backgroundColor:'#fff',
          padding:20, borderTopLeftRadius:20, borderTopRightRadius:20,
          transform:[{ translateY: slideAnim }]
        }}>
          <Text style={{ fontWeight:'bold', marginBottom:10 }}>Filter by Date Range</Text>

          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <TouchableOpacity onPress={()=>applyQuick(7)} style={[styles.quickBtn, activeQuick===7 && styles.activeQuick]}>
              <Text style={activeQuick===7 && {color:'#fff'}}>7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>applyQuick(30)} style={[styles.quickBtn, activeQuick===30 && styles.activeQuick]}>
              <Text style={activeQuick===30 && {color:'#fff'}}>30 Days</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.box} onPress={()=>setShowFrom(true)}>
            <Text>{tempFrom ? formatFull(tempFrom) : 'From Date'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.box} onPress={()=>setShowTo(true)}>
            <Text>{tempTo ? formatFull(tempTo) : 'To Date'}</Text>
          </TouchableOpacity>

          {showFrom && (
            <DateTimePicker value={tempFrom || new Date()} mode="date"
              onChange={(e,d)=>{ setShowFrom(false); if(d) setTempFrom(d); }}/>
          )}

          {showTo && (
            <DateTimePicker value={tempTo || new Date()} mode="date"
              onChange={(e,d)=>{ setShowTo(false); if(d) setTempTo(d); }}/>
          )}

          <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:15 }}>
            <TouchableOpacity onPress={()=>{
              setTempFrom(null); setTempTo(null); setFromDate(null); setToDate(null); setActiveQuick(null); closeSheet();
            }} style={styles.resetBtn}>
              <Text style={{ fontWeight:'600' }}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!tempFrom && !tempTo}
              onPress={()=>{ setFromDate(tempFrom); setToDate(tempTo); closeSheet(); }}
              style={[styles.applyBtn, (!tempFrom && !tempTo) && { opacity:0.5 }]}
            >
              <Text style={{ color:'#fff', fontWeight:'600' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

    </View>
  );
};

const styles = {
  tab:{ flex:1, padding:12, alignItems:'center', borderRadius:10 },
  tabText:{ color:'#555', fontWeight:'500' },
  active:{ backgroundColor:'#0F6C7B' },
  activeText:{ color:'#fff', fontWeight:'bold' },
  quickBtn:{ backgroundColor:'#eee', padding:10, borderRadius:8, width:'48%', alignItems:'center' },
  activeQuick:{ backgroundColor:'#0F6C7B' },
  box:{ backgroundColor:'#f5f5f5', padding:12, borderRadius:8, marginTop:10 },
  applyBtn:{ backgroundColor:'#0F6C7B', padding:12, borderRadius:8, width:'48%', alignItems:'center' },
  resetBtn:{ backgroundColor:'#ddd', padding:12, borderRadius:8, width:'48%', alignItems:'center' }
};

export default ChartScreen;