import React, { useState, useEffect, useRef, use } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    FlatList,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
    Animated,
    Dimensions,
    Alert
} from 'react-native';

import Voice from '@react-native-voice/voice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';

import {
    initDB,
    saveChat,
    getChat,
    clearChat,
    getAllChats
} from '../../common/utils/chatDB';

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
    getUserPrptype: string;
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const SalesAnalysis: React.FC<Props> = ({
    token,
    isConnected,
    username,
    navigation,
    getUserPrptype
}) => {

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [updatedDate, setUpdatedDate] = useState('');

    const flatListRef = useRef<FlatList>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        Animated.loop(

            Animated.stagger(200, [

                Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true })

            ])

        ).start();

    }, []);

    useEffect(() => {

        initDB();

        loadChats();

        Voice.onSpeechResults = onSpeechResults;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };

    }, []);

    const loadChats = async () => {

        try {

            const chats: any = await getAllChats();

            if (chats && chats.length > 0) {

                setMessages(chats);

                scrollToBottom();

            }

        } catch (e) {

            console.log("Cache load error", e);

        }

    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
    };

    const requestPermission = async () => {

        if (Platform.OS === 'android') {

            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'App needs microphone access for voice recognition',
                    buttonPositive: 'OK'
                }
            );

            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        return true;
    };

    const animateMic = () => {

        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.2,
                    duration: 600,
                    useNativeDriver: true
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true
                })
            ])
        ).start();

    };

    const startListening = async () => {

        const granted = await requestPermission();

        if (!granted) return;

        try {

            setIsListening(true);
            animateMic();
            await Voice.start('en-US');

        } catch (e) {
            console.log(e);
        }

    };

    const stopListening = async () => {

        try {

            await Voice.stop();
            setIsListening(false);

        } catch (e) {
            console.log(e);
        }

    };

    const onSpeechResults = (e: any) => {

        const text = e.value[0];

        setInputText(text);

        setIsListening(false);

    };

    useEffect(() => {
        updateCache(getUserPrptype);
    }, []);

    const updateCache = async (getUserPrptype) => {

        try {

            const payload = {
                prptype: getUserPrptype
            };

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(
                `${API}/api/updatecache`,
                payload,
                { headers }
            );

            const data = response.data.response.updateddate;

            setUpdatedDate(data);

        } catch (error) {

            console.log("update cache error", error);

        }

    };

    const sendMessage = async () => {

        if (!inputText.trim()) return;

        const userText = inputText;

        setMessages(prev => [
            ...prev,
            { type: 'user', text: userText }
        ]);

        setInputText('');
        scrollToBottom();

        const cached = await getChat(userText);

        if (cached) {

            setMessages(prev => [
                ...prev,
                { type: 'ai', text: cached.aiText }
            ]);

            scrollToBottom();

            return;

        }

        setIsTyping(true);

        try {

            const payload = {
                prptype: getUserPrptype,
                text: userText
            };

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(
                `${API}/api/salesanalysisvoice`,
                payload,
                { headers }
            );

            const aiText = response?.data?.response?.output || 'No response';

            setMessages(prev => [
                ...prev,
                { type: 'ai', text: aiText }
            ]);

            saveChat(userText, aiText);

        } catch (error) {

            setMessages(prev => [
                ...prev,
                { type: 'ai', text: '⚠️ Server error. Please try again.' }
            ]);

            console.log(error);

        } finally {

            setIsTyping(false);
            scrollToBottom();

        }

    };

    const handleClearChat = () => {

        Alert.alert(
            'Clear Chat',
            'Delete all chat history?',
            [
                { text: 'Cancel' },
                {
                    text: 'Clear',
                    onPress: () => {
                        clearChat();
                        setMessages([]);
                    }
                }
            ]
        );

    };

    const formatAIText = (text: string) => {
        if (!text) return '';

        return text
            .replace(/\\n/g, '\n')   // convert \\n to real newline
            .replace(/\/n/g, '\n');  // convert /n to newline
    };

    const renderItem = ({ item }: any) => {

        const isUser = item.type === 'user';

        return (
            <View style={[
                styles.messageRow,
                isUser ? styles.userRow : styles.aiRow
            ]}>

                <View style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.aiBubble
                ]}>

                    <Text style={styles.messageText}>
                        {formatAIText(item.text)}
                    </Text>

                </View>

            </View>
        );
    };

    return (

        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>

            <HeaderBarwithBack
                userName={username}
                header={'Sales Analysis'}
                subHeader={'Manage your sales analysis'}
            />

            <View style={styles.topRow}>

                <Text style={styles.updateText}>
                    {updatedDate}
                </Text>

                <TouchableOpacity
                    onPress={handleClearChat}
                >
                    <Text style={{ color: '#0A7EA4' }}>Clear Chat</Text>
                </TouchableOpacity>

            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(_, i) => i.toString()}
                contentContainerStyle={{ padding: 16 }}
            />

            {isTyping && (

                <View style={styles.typingRow}>

                    <View style={styles.typingBubble}>

                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />

                    </View>

                </View>

            )}

            <View style={styles.inputContainer}>

                <TouchableOpacity
                    onPress={isListening ? stopListening : startListening}
                >

                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Icon
                            name="mic"
                            size={28}
                            color={isListening ? "#ff4d4f" : "#0A7EA4"}
                        />
                    </Animated.View>

                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask sales analysis..."
                />

                <TouchableOpacity onPress={sendMessage}>
                    <Icon name="send" size={26} color="#0A7EA4" />
                </TouchableOpacity>

            </View>

        </View>

    );
};

export default SalesAnalysis;

const styles = StyleSheet.create({

    messageRow: {
        marginBottom: 16,
        width: '100%',
    },

    userRow: {
        alignItems: 'flex-end'
    },

    aiRow: {
        alignItems: 'center'
    },

    bubble: {
        padding: 16,
        borderRadius: 14
    },

    userBubble: {
        backgroundColor: '#0A7EA4',
        width: '80%'
    },

    aiBubble: {
        backgroundColor: '#000',
        width: '100%'
    },

    messageText: {
        fontSize: 13,
        lineHeight: 24,
        color: '#fff'
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center'
    },

    updateText: {
        fontSize: 12,
        color: '#666'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff'
    },

    input: {
        flex: 1,
        marginHorizontal: 10,
        backgroundColor: '#f1f1f1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: '#000'
    },

    loader: {
        padding: 10,
        alignItems: 'flex-start'
    },

    clearBtn: {
        alignItems: 'flex-end',
        padding: 10
    },
    typingRow: {
        flexDirection: 'row',
        marginLeft: 10,
        marginBottom: 10
    },

    typingBubble: {
        flexDirection: 'row',
        backgroundColor: '#e6e6e6',
        padding: 12,
        borderRadius: 12,
        width: 60,
        justifyContent: 'space-between'
    },

    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#888'
    },
});