import React from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet
} from 'react-native';

import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';
import { useTheme } from '@/src/core/theme/themeMode';

export default function PricingScreen() {
    // Theme: this page is outside the NEW ERP navigator, so it listens to the
    // theme itself — on a change the whole page is drawn again in the new
    // colours (nothing typed on the page is lost).
    useTheme();

    const router = useRouter();

    const plans = [
        {
            title: 'Starter',
            price: 'Contact Sales'
        },
        {
            title: 'Professional',
            price: 'Contact Sales'
        },
        {
            title: 'Enterprise',
            price: 'Custom Pricing'
        }
    ];

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
                    Pricing
                </Text>

            </LinearGradient>

            {
                plans.map((item, index) => (

                    <View
                        key={index}
                        style={styles.card}

                    >

                        ```
                        <Text style={styles.plan}>
                            {item.title}
                        </Text>

                        <Text style={styles.price}>
                            {item.price}
                        </Text>
                        ```

                    </View>

                ))
            }

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
        marginBottom: 0,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20
    },
    plan: {
        fontSize: 18,
        fontWeight: '700'
    },
    price: {
        marginTop: 10,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600'
    }
});
