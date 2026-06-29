// HeaderBarwithBack.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  SafeAreaView,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';
import { useNavigation } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HeaderProps {
  userName: string;
  header?: string;
  subHeader?: string;
  backNavigateScreen?: string;
}

const HeaderBarwithBack: React.FC<HeaderProps> = ({
  userName,
  header,
  subHeader,
  backNavigateScreen = 'Home',
  noBorderRadius = false,
  headerConnect = false,
  headerConnectColor = '#D9F0EE',
  headerConnectAnimation = false
}) => {
  const [isAvatarBarVisible, setIsAvatarBarVisible] = useState(false);
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (headerConnectAnimation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [headerConnectAnimation]);

  const toggleAvatarBar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAvatarBarVisible(v => !v);
  };

  // const handleBackPress = () => {
  //   navigation.navigate(backNavigateScreen as never);
  // };
  const handleBackPress = () => {
    navigation.goBack();
  };

  const initial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <LinearGradient
      colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={noBorderRadius === true ? styles.noBordergradient : styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        {/* Top row: Back + Title + (optional avatar/actions on right) */}
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={handleBackPress}
            >
              <Icon name="arrow-back-ios" size={18} color="#EAF8F7" />
            </TouchableOpacity>
            {headerConnect ? (
              <View style={styles.titleContainer}>
                <Text style={styles.brandTitle}>{header}</Text>
                {/* <Text style={styles.brandSub}>{subHeader}</Text> */}
                <Animated.View
                  style={{
                    alignSelf: 'flex-start',
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <Text
                    style={{
                      color: headerConnectColor,
                      fontSize: 11,
                      fontWeight: '600',
                      marginTop: 2,
                      backgroundColor: '#fff',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    {subHeader}
                  </Text>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.titleContainer}>
                <Text style={styles.brandTitle}>{header}</Text>
                <Text style={styles.brandSub}>{subHeader}</Text>

              </View>
            )}

          </View>

          {/* Right side – avatar / profile (optional, looks professional) */}
          <TouchableOpacity
            style={styles.avatarBtn}
            activeOpacity={0.8}
            onPress={toggleAvatarBar}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Animated avatar info bar */}
        {isAvatarBarVisible && (
          <View style={styles.avatarBar}>
            <Text style={styles.welcomeText}>Welcome, {userName || 'User'}</Text>
            <Text style={styles.smallText}>Have a productive day!</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 6,
  },
  noBordergradient: {
    paddingBottom: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 6,
  },
  safe: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#EAF8F7',
    fontSize: 18,
    fontWeight: '700',
  },
  brandSub: {
    color: '#D9F0EE',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  avatarBtn: {
    padding: 4,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: theme.BRAND_DARK,
    fontWeight: '800',
    fontSize: 14,
  },
  avatarBar: {
    marginBottom: 4,
  },
  welcomeText: {
    color: '#EAF8F7',
    fontSize: 13,
    fontWeight: '600',
  },
  smallText: {
    color: '#D9F0EE',
    fontSize: 11,
    marginTop: 2,
  },
  searchRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 42,
    elevation: 2,
    shadowColor: theme.SHADOW,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    color: theme.BRAND_DARK,
    marginLeft: 6,
  },
  clearBtn: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HeaderBarwithBack;
