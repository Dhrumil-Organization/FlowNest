import React from 'react';

import {
  View,
  Text,
  StyleSheet,
//   Image,
  useColorScheme,
} from 'react-native';

import { Colors } from '../../common/theme_emp_dash/colors';

interface Props {
  companyName: string;
  role: string;
  date: string;
}

const CompanyHeader = ({
  companyName,
  role,
  date,
}: Props) => {
  const isDark =
    useColorScheme() === 'dark';

  const colors = isDark
    ? Colors.dark
    : Colors.light;

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text
          style={{
            fontSize: 22,
          }}>
          🎽
        </Text>
      </View>

      <View>
        <Text
          style={[
            styles.company,
            {
              color:
                colors.text,
            },
          ]}>
          {companyName}
        </Text>

        <Text
          style={[
            styles.meta,
            {
              color:
                colors.secondaryText,
            },
          ]}>
          {role} • {date}
        </Text>
      </View>
    </View>
  );
};

export default CompanyHeader;

const styles =
  StyleSheet.create({
    container: {
      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 12,

      paddingTop: 10,
    },

    avatar: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        '#0A5C96',

      justifyContent:
        'center',

      alignItems: 'center',

      marginRight: 10,
    },

    company: {
      fontSize: 24,

      fontWeight: '700',
    },

    meta: {
      fontSize: 12,

      marginTop: 2,
    },
  });