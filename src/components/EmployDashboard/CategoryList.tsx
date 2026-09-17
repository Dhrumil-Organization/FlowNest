import React, { useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
} from 'react-native';

import CategoryRow from './CategoryRow';

import { CategoryItem } from '../../common/type_emp_dash/dashboard';

import { Colors } from '../../common/theme_emp_dash/colors';

interface Props {
  categories: CategoryItem[];
}

const CategoryList = ({
  categories,
}: Props) => {
  const isDark = useColorScheme() === 'dark';

  const colors = isDark
    ? Colors.dark
    : Colors.light;

  const renderItem = useCallback(
    ({ item }: { item: CategoryItem }) => (
      <CategoryRow item={item} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: CategoryItem) => item.id,
    [],
  );

  return (
    <View>
      <Text
        style={[
          styles.sectionTitle,
          {
            color:
              colors.secondaryText,
          },
        ]}>
        BY CATEGORY - HIGHEST FIRST
      </Text>

      <View style={styles.header}>
        <Text
          style={[
            styles.headerText,
            {
              flex: 1,
              color:
                colors.secondaryText,
            },
          ]}>
          CATEGORY
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              width: 82,
              textAlign: 'right',
              color:
                colors.secondaryText,
            },
          ]}>
          TODAY
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              width: 82,
              textAlign: 'right',
              color:
                colors.secondaryText,
            },
          ]}>
          UPDATED
        </Text>
      </View>

      <FlatList
        scrollEnabled={false}
        data={categories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </View>
  );
};

export default CategoryList;

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 12,

    marginBottom: 12,

    marginHorizontal: 14,

    fontSize: 11,

    fontWeight: '700',

    letterSpacing: 1.2,
  },

  header: {
    flexDirection: 'row',

    paddingHorizontal: 14,

    marginBottom: 6,
  },

  headerText: {
    fontSize: 10,

    fontWeight: '700',

    letterSpacing: 1,
  },
});