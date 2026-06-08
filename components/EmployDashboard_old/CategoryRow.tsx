import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import { CategoryItem } from '../../common/type_emp_dash/dashboard';
import { Colors } from '../../common/theme_emp_dash/colors';

interface Props {
  item: CategoryItem;
}

const CategoryRow = ({ item }: Props) => {
  const isDark = useColorScheme() === 'dark';

  const colors = isDark
    ? Colors.dark
    : Colors.light;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: item.color,
            },
          ]}
        />

        <Text
          numberOfLines={1}
          style={[
            styles.name,
            {
              color: colors.text,
            },
          ]}>
          {item.name}
        </Text>
      </View>

      <Text
        style={[
          styles.today,
          {
            color: colors.success,
          },
        ]}>
        {item.today}
      </Text>

      <Text
        style={[
          styles.updated,
          {
            color: colors.info,
          },
        ]}>
        {item.updated}
      </Text>
    </View>
  );
};

export default memo(CategoryRow);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',

    alignItems: 'center',

    minHeight: 42,

    paddingHorizontal: 14,

    paddingVertical: 8,
  },

  leftSection: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingRight: 10,
  },

  dot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    marginRight: 8,
  },

  name: {
    flex: 1,

    fontSize: 15,

    fontWeight: '500',
  },

  today: {
    width: 82,

    textAlign: 'right',

    fontSize: 14,

    fontWeight: '700',
  },

  updated: {
    width: 82,

    textAlign: 'right',

    fontSize: 14,

    fontWeight: '700',
  },
});