import React, { useState } from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import DashboardTabs from './DashboardTabs';
import CompanyHeader from './CompanyHeader';
import SalesCard from './SalesCard';

import dashboardData from '../../common/data_emp_dash/dashboard.json';

import { Colors } from '../../common/theme_emp_dash/colors';
import EmptyMyView from './EmptyMyView';

export default function DashboardScreen() {
  const [selectedTab, setSelectedTab] = useState('owner');
  const isDark =
    useColorScheme() === 'dark';

  const colors = isDark
    ? Colors.dark
    : Colors.light;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }>
        <DashboardTabs selectedTab={selectedTab} onTabChange={setSelectedTab} />

        <CompanyHeader
          companyName={
            dashboardData.companyName
          }
          role={
            dashboardData.role
          }
          date={
            dashboardData.date
          }
        />

        {selectedTab === 'owner' ? (
          <SalesCard data={dashboardData} />
        ) : (
          <EmptyMyView />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },
  });