import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import HeaderBarDashboard from '../components/HeaderBarDashboard/HeaderBarDashboard';

interface DashboardProps {
    navigation: any;
    username: string;
}

export const theme = {
    BRAND_ACCENT: '#00B4A2',
    BRAND_ACCENT_LIGHT: '#6EE3D6',
    BRAND_ACCENT_DARK: '#009688',
    TEXT_WHITE: '#FFFFFF',
    TEXT_PRIMARY: '#2D3748',
    TEXT_SECONDARY: '#718096',
    TEXT_TERTIARY: '#A0AEC0',
    GLASS_BG: 'rgba(255, 255, 255, 0.85)',
    GLASS_BORDER: 'rgba(255, 255, 255, 0.3)',
    GLASS_SHADOW: 'rgba(0, 0, 0, 0.08)',
    CARD_BG: '#FFFFFF',
    CARD_SHADOW: 'rgba(0, 0, 0, 0.05)',
    SUCCESS: '#48BB78',
    WARNING: '#ED8936',
    INFO: '#4299E1',
};

interface TimePeriod {
    name: string;
    icon: string;
    gradient: string[];
    greeting: string;
    backgroundColor: string;
    watchFaceColor: string;
    textColor: string;
    startHour: number;
    endHour: number;
}

const timePeriods: TimePeriod[] = [
    {
        name: 'Morning',
        icon: '☀️',
        gradient: ['#FFE259', '#FFA751'],
        greeting: 'Good Morning',
        backgroundColor: '#FFF9E6',
        watchFaceColor: '#FFF9E6',
        textColor: '#2D3748',
        startHour: 5,
        endHour: 11
    },
    {
        name: 'Afternoon',
        icon: '🌤',
        gradient: ['#4DA0B0', '#D39D38'],
        greeting: 'Good Afternoon',
        backgroundColor: '#F0F9FF',
        watchFaceColor: '#FFFFFF',
        textColor: '#2D3748',
        startHour: 12,
        endHour: 16
    },
    {
        name: 'Evening',
        icon: '🌙',
        gradient: ['#3A6073', '#16222A'],
        greeting: 'Good Evening',
        backgroundColor: '#F0F4FF',
        watchFaceColor: '#FFFFFF',
        textColor: '#2D3748',
        startHour: 17,
        endHour: 20
    },
    {
        name: 'Night',
        icon: '🌕',
        gradient: ['#0F2027', '#203A43', '#2C5364'],
        greeting: 'Good Night',
        backgroundColor: '#0A0E17',
        watchFaceColor: '#1A2437',
        textColor: '#FFFFFF',
        startHour: 21,
        endHour: 4
    }
];

const { width, height } = Dimensions.get('window');

const DashboardScreen: React.FC<DashboardProps> = ({ navigation, username }) => {
    const [greeting, setGreeting] = useState('Good Morning');
    const [weatherIcon, setWeatherIcon] = useState('☀️');
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(timePeriods[0]);
    const [hourAngle, setHourAngle] = useState(0);
    const [minuteAngle, setMinuteAngle] = useState(0);
    const [secondAngle, setSecondAngle] = useState(0);
    const [isNightMode, setIsNightMode] = useState(false);

    // For testing: Set this to false to use real time, true to use hardcoded time
    const useHardcodedTime = false; // Change to true for testing

    // Hardcoded time for testing (change this value to test different times)
    // const hardcodedTime = {
    //     hours: 21,    // 9 PM (Night) - Change this to test different times
    //     minutes: 30,
    //     seconds: 45
    // };

    const getCurrentTimePeriod = (hour: number): TimePeriod => {
        return timePeriods.find(period => {
            if (period.startHour <= period.endHour) {
                return hour >= period.startHour && hour <= period.endHour;
            } else {
                // For night period that spans midnight
                return hour >= period.startHour || hour <= period.endHour;
            }
        }) || timePeriods[0];
    };

    const hardcodedTime = {
        hours: 18,    // 9 PM (Night) - Change this to test different times
        minutes: 30,
        seconds: 45
    };

    const updateTime = () => {
        let currentTime;

        if (useHardcodedTime) {
            // Use hardcoded time for testing
            currentTime = {
                hours: hardcodedTime.hours,
                minutes: hardcodedTime.minutes,
                seconds: hardcodedTime.seconds
            };
            // currentTime = {
            //     hours: new Date().getHours(),
            //     minutes: new Date().getMinutes(),
            //     seconds: new Date().getSeconds()
            // };
        } else {
            // Use real time
            const now = new Date();
            currentTime = {
                hours: now.getHours(),
                minutes: now.getMinutes(),
                seconds: now.getSeconds()
            };
        }

        // Update clock angles
        const hours12 = currentTime.hours % 12;
        const newHourAngle = (hours12 * 30) + (currentTime.minutes * 0.5);
        const newMinuteAngle = currentTime.minutes * 6;
        const newSecondAngle = currentTime.seconds * 6;

        setHourAngle(newHourAngle);
        setMinuteAngle(newMinuteAngle);
        setSecondAngle(newSecondAngle);

        // Update time period and greeting
        const currentPeriod = getCurrentTimePeriod(currentTime.hours);
        setTimePeriod(currentPeriod);
        setGreeting(currentPeriod.greeting);
        setWeatherIcon(currentPeriod.icon);
        setIsNightMode(currentPeriod.name === 'Night');
    };

    useEffect(() => {
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = () => {
        // if (useHardcodedTime) {
        //     const now = new Date(0, 0, 0, hardcodedTime.hours, hardcodedTime.minutes, hardcodedTime.seconds);
        //     return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // }
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = () => {
        const now = new Date();
        return now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate watch size based on screen width
    const watchSize = Math.min(width * 0.7, 300);

    return (
        <>
            <HeaderBarDashboard
                userName={username}
                placeholder="Search request..."
                isNightMode={isNightMode}
                timePeriodGradient={timePeriod.gradient}
            />

            <ScrollView
                style={[styles.container, { backgroundColor: timePeriod.backgroundColor }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Main Dashboard Header with Time Period Background */}
                <LinearGradient
                    colors={timePeriod.gradient}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.greetingContainer}>
                            <Text style={styles.weatherIcon}>{weatherIcon}</Text>
                            <Text style={styles.greetingText}>{greeting}</Text>
                        </View>

                        {/* <Text style={styles.timeText}>{formatTime()}</Text> */}
                        <Text style={styles.dateText}>{formatDate()}</Text>
                        <Text style={styles.welcomeText}>Welcome back, {username}!</Text>
                    </View>
                </LinearGradient>

                {/* Main Dashboard Content */}
                <View style={styles.contentContainer}>
                    {/* Analog Watch Section */}
                    <View style={[
                        styles.watchSection,
                        {
                            backgroundColor: timePeriod.watchFaceColor,
                            borderColor: isNightMode ? 'rgba(255, 255, 255, 0.1)' : theme.GLASS_BORDER
                        }
                    ]}>
                        {/* Watch Container */}
                        <View style={styles.watchWrapper}>
                            <Svg height={watchSize} width={watchSize} viewBox="0 0 200 200">
                                {/* Watch Face */}
                                <Circle
                                    cx="100"
                                    cy="100"
                                    r="95"
                                    fill={isNightMode ? '#1A2437' : '#FFFFFF'}
                                    stroke={isNightMode ? 'rgba(255, 255, 255, 0.15)' : theme.GLASS_BORDER}
                                    strokeWidth="2"
                                />

                                {/* Minute marks - subtle dots */}
                                {Array.from({ length: 60 }).map((_, i) => {
                                    if (i % 5 === 0) return null; // Skip hour marks
                                    const angle = i * 6;
                                    const radian = (angle * Math.PI) / 180;
                                    const x1 = 100 + 85 * Math.sin(radian);
                                    const y1 = 100 - 85 * Math.cos(radian);

                                    return (
                                        <Circle
                                            key={`minute-${i}`}
                                            cx={x1}
                                            cy={y1}
                                            r="1"
                                            fill={isNightMode ? 'rgba(255, 255, 255, 0.3)' : theme.TEXT_TERTIARY}
                                        />
                                    );
                                })}

                                {/* Hour marks - more prominent */}
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const angle = i * 30;
                                    const radian = (angle * Math.PI) / 180;
                                    const x1 = 100 + 85 * Math.sin(radian);
                                    const y1 = 100 - 85 * Math.cos(radian);

                                    return (
                                        <Circle
                                            key={`hour-${i}`}
                                            cx={x1}
                                            cy={y1}
                                            r="3"
                                            fill={isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY}
                                        />
                                    );
                                })}

                                {/* Hour Numbers */}
                                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, i) => {
                                    const angle = i * 30;
                                    const radian = ((angle - 90) * Math.PI) / 180; // Adjust for 12 o'clock at top
                                    const x = 100 + 70 * Math.cos(radian);
                                    const y = 100 + 70 * Math.sin(radian);

                                    return (
                                        <SvgText
                                            key={`hour-number-${hour}`}
                                            x={x}
                                            y={y}
                                            fontSize="12"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            fill={isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY}
                                            fontFamily="System"
                                            fontWeight="600"
                                        >
                                            {hour}
                                        </SvgText>
                                    );
                                })}

                                {/* Hour Hand */}
                                <Line
                                    x1="100"
                                    y1="100"
                                    x2="100"
                                    y2="65"
                                    stroke={isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    transform={`rotate(${hourAngle}, 100, 100)`}
                                />

                                {/* Minute Hand */}
                                <Line
                                    x1="100"
                                    y1="100"
                                    x2="100"
                                    y2="45"
                                    stroke={theme.BRAND_ACCENT}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    transform={`rotate(${minuteAngle}, 100, 100)`}
                                />

                                {/* Second Hand */}
                                <Line
                                    x1="100"
                                    y1="100"
                                    x2="100"
                                    y2="35"
                                    stroke="#FF5722"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    transform={`rotate(${secondAngle}, 100, 100)`}
                                />

                                {/* Center Dot with glow effect for night mode */}
                                <Circle cx="100" cy="100" r="8" fill={theme.BRAND_ACCENT} />
                                <Circle
                                    cx="100"
                                    cy="100"
                                    r="4"
                                    fill={isNightMode ? "#FFFFFF" : "#FFFFFF"}
                                />
                                {isNightMode && (
                                    <Circle
                                        cx="100"
                                        cy="100"
                                        r="12"
                                        fill={theme.BRAND_ACCENT}
                                        opacity="0.2"
                                    />
                                )}
                            </Svg>

                            {/* Digital Time Display */}
                            <View style={styles.digitalTimeWrapper}>
                                <View style={[
                                    styles.digitalTimeContainer,
                                    { backgroundColor: isNightMode ? 'rgba(0, 180, 162, 0.15)' : 'rgba(0, 180, 162, 0.05)' }
                                ]}>
                                    <Text style={[
                                        styles.digitalTime,
                                        { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                                    ]}>
                                        {formatTime()}
                                    </Text>
                                    <Text style={[
                                        styles.timePeriodName,
                                        { color: theme.BRAND_ACCENT }
                                    ]}>
                                        {timePeriod.name}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Time Period Indicator */}
                        <View style={styles.timePeriodIndicator}>
                            {timePeriods.map((period, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.periodDot,
                                        {
                                            backgroundColor: period.name === timePeriod.name
                                                ? theme.BRAND_ACCENT
                                                : isNightMode
                                                    ? 'rgba(255, 255, 255, 0.2)'
                                                    : theme.TEXT_TERTIARY,
                                            width: period.name === timePeriod.name ? 24 : 8,
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Quick Stats Section */}
                    {/* <View style={[
                        styles.statsSection,
                        {
                            backgroundColor: isNightMode ? 'rgba(255, 255, 255, 0.05)' : theme.GLASS_BG,
                            borderColor: isNightMode ? 'rgba(255, 255, 255, 0.1)' : theme.GLASS_BORDER
                        }
                    ]}>
                        <View style={styles.statItem}>
                            <Text style={[
                                styles.statIcon,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>🕒</Text>
                            <Text style={[
                                styles.statValue,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>Live</Text>
                            <Text style={[
                                styles.statLabel,
                                { color: isNightMode ? 'rgba(255, 255, 255, 0.7)' : theme.TEXT_SECONDARY }
                            ]}>Clock</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <Text style={[
                                styles.statIcon,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>⏰</Text>
                            <Text style={[
                                styles.statValue,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>Real</Text>
                            <Text style={[
                                styles.statLabel,
                                { color: isNightMode ? 'rgba(255, 255, 255, 0.7)' : theme.TEXT_SECONDARY }
                            ]}>Time</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <Text style={[
                                styles.statIcon,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>🌙</Text>
                            <Text style={[
                                styles.statValue,
                                { color: isNightMode ? '#FFFFFF' : theme.TEXT_PRIMARY }
                            ]}>{timePeriod.name}</Text>
                            <Text style={[
                                styles.statLabel,
                                { color: isNightMode ? 'rgba(255, 255, 255, 0.7)' : theme.TEXT_SECONDARY }
                            ]}>Mode</Text>
                        </View>
                    </View> */}

                    {/* Additional Space at Bottom */}
                    <View style={styles.bottomSpacer} />
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    headerGradient: {
        paddingTop: 40,
        paddingBottom: 60,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        minHeight: height * 0.35,
    },
    headerContent: {
        alignItems: 'center',
    },
    greetingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: -29.5,
    },
    weatherIcon: {
        fontSize: 42,
        marginRight: 15,
    },
    greetingText: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.TEXT_WHITE,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    timeText: {
        fontSize: 56,
        fontWeight: '300',
        color: theme.TEXT_WHITE,
        marginBottom: 8,
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    dateText: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 25,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    welcomeText: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: -40,
        alignItems: 'center',
    },
    watchSection: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        padding: 30,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 25,
        // marginTop: 20,
    },
    watchWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    digitalTimeWrapper: {
        width: '100%',
        marginTop: 25,
    },
    digitalTimeContainer: {
        alignItems: 'center',
        padding: 18,
        borderRadius: 20,
        width: '100%',
    },
    digitalTime: {
        fontSize: 36,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 5,
    },
    timePeriodName: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 5,
    },
    timePeriodIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    periodDot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 6,
    },
    statsSection: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 25,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 5,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    bottomSpacer: {
        height: 50,
    },
});

export default DashboardScreen;