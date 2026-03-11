import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    FlatList,
    PermissionsAndroid,
    Platform,
    Animated,
    Alert
} from "react-native";

import Markdown from "react-native-markdown-display";
import Clipboard from "@react-native-clipboard/clipboard";

import Voice from "@react-native-voice/voice";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";

import HeaderBarwithBack from "../HeaderBarwithBack/HeaderBarwithBack";
import { API } from "../../common/API/dynamicAPI";

import {
    initDB,
    saveChat,
    getChat,
    clearChat,
    getAllChats,
    deleteAfterMessage
} from "../../common/utils/chatDB";
import AILoading from "../Loader/AILoading";

const SalesAnalysis = ({ token, username, getUserPrptype }) => {

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [updatedDate, setUpdatedDate] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(true);
    const flatListRef = useRef(null);
    const controllerRef = useRef(null);
    const firstLoadRef = useRef(true);

    const dot1 = useRef(new Animated.Value(0.2)).current;
    const dot2 = useRef(new Animated.Value(0.2)).current;
    const dot3 = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {

        initDB();
        loadChats();



    }, []);


    useEffect(() => {
        Voice.onSpeechError = (e) => {
            console.log("Speech error:", e);
            setIsListening(false);
            Alert.alert("Error", "Voice recognition failed. Please try again.");
        };
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);


    useEffect(() => {

        const animateDot = (dot, delay) => {

            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 300,
                        delay,
                        useNativeDriver: true
                    }),
                    Animated.timing(dot, {
                        toValue: 0.2,
                        duration: 300,
                        useNativeDriver: true
                    })
                ])
            ).start();

        };

        animateDot(dot1, 0);
        animateDot(dot2, 200);
        animateDot(dot3, 400);

    }, [isTyping]);

    useEffect(() => {
        updateCache(getUserPrptype);
    }, []);


    useEffect(() => {
        Voice.isAvailable().then(setIsVoiceSupported).catch(() => setIsVoiceSupported(false));
    }, []);


    const updateCache = async (getUserPrptype) => {
        setIsUpdating(true);
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
            console.log("updated date", payload, response);

            setUpdatedDate(data);
            // setIsUpdating(false);

        } catch (error) {
            // setIsUpdating(false);
            console.log("update cache error", error);

        } finally {
            setIsUpdating(false); // Loader hide karo
        }

    };

    if (!isVoiceSupported) {
        return (
            <TouchableOpacity disabled>
                <Icon name="mic-off" size={26} color="#ccc" />
            </TouchableOpacity>
        );
    }

    const loadChats = async () => {

        try {

            const chats = await getAllChats();
            if (chats?.length) setMessages(chats);

        } catch (e) { }

    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const onSpeechResults = (e) => {
        setInputText(e.value[0]);
    };

    const requestPermission = async () => {
        try {
            if (Platform.OS === 'android') {
                const result = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
                );
                if (!result) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        {
                            title: "Microphone Permission Needed",
                            message: "This app needs access to your microphone to record voice input.",
                            buttonNeutral: "Ask Me Later",
                            buttonNegative: "Cancel",
                            buttonPositive: "OK"
                        }
                    );
                    return granted === PermissionsAndroid.RESULTS.GRANTED;
                }
                return true;
            }
            return true;
        } catch (err) {
            console.warn('Permission error:', err);
            return false;
        }
    };


    const startListening = async () => {
        const ok = await requestPermission();
        if (!ok) {
            Alert.alert(
                "Permission Required",
                "Please enable microphone permission in settings to use voice input.",
                [{ text: "OK" }]
            );
            return;
        }
        try {
            setIsListening(true);
            await Voice.start("en-IN");
        } catch (e) {
            console.log("Voice start error:", e);
            Alert.alert("Error", "Could not start voice recognition. Please try again.");
            setIsListening(false);
        }
    };


    const stopListening = async () => {
        try {
            await Voice.stop();
        } catch (e) {
            console.log("Voice stop error:", e);
        } finally {
            setIsListening(false);
        }
    };

    const streamText = (text) => {

        let i = 0;
        let buffer = "";

        const speed = Math.max(1, Math.floor(400 / text.length));
        // entire message ~300-400ms

        const interval = setInterval(() => {

            buffer += text[i];
            i++;

            setMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1].text = buffer;
                return arr;
            });

            scrollToBottom();

            if (i >= text.length) clearInterval(interval);

        }, speed);

    };

    const sendMessage = async (textParam = null) => {

        const userText = textParam ?? inputText;
        if (!userText.trim()) return;

        let updated = [...messages];

        if (editingIndex !== null) {

            const editedUserText = messages[editingIndex].text;

            updated[editingIndex].text = userText;
            updated = updated.slice(0, editingIndex + 1);

            setMessages(updated);

            /* delete cache after edited message */

            deleteAfterMessage(editedUserText);

            setEditingIndex(null);

        }
        else {

            updated.push({ type: "user", text: userText });
            setMessages(updated);

        }

        setInputText("");
        scrollToBottom();

        /* show loader immediately */

        setIsTyping(true);
        controllerRef.current = new AbortController();

        try {

            const cached = await getChat(userText);

            if (cached) {

                setIsTyping(false);

                setMessages(prev => [
                    ...prev,
                    { type: "ai", text: cached.aiText }
                ]);

                return;

            }

            const res = await axios.post(
                `${API}/api/salesanalysisvoice`,
                {
                    prptype: getUserPrptype,
                    text: userText
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controllerRef.current.signal
                }
            );

            console.log("res:", res);

            const aiText = res?.data?.response?.output ?? "No response";

            /* add AI message after response */

            // setMessages(prev => [...prev, { type: "ai", text: "" }]);
            setMessages(prev => [
                ...prev,
                { type: "ai", text: aiText }
            ]);

            scrollToBottom();

            // streamText(aiText);

            saveChat(userText, aiText);

        } catch (e) {

            if (e.name !== "CanceledError") {

                const errorText = "⚠️ Server error";

                setMessages(prev => [
                    ...prev,
                    { type: "ai", text: errorText }
                ]);

                saveChat(userText, errorText);

            }

        }

        finally {

            setIsTyping(false);
            controllerRef.current = null;

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

    const cancelRequest = () => {

        if (controllerRef.current) {

            controllerRef.current.abort();
            controllerRef.current = null;
            setIsTyping(false);

        }
        const cancelText = "❌ Request cancelled";

        setMessages(prev => [
            ...prev,
            { type: "ai", text: cancelText }
        ]);

        saveChat(inputText, cancelText);

    };

    const copyMessage = text => {
        Clipboard.setString(text);
        Alert.alert("Copied");
    };

    const startEdit = index => {

        const msg = messages[index];

        setEditingIndex(index);
        setEditingText(msg.text);
        setInputText(msg.text);

    };

    const renderItem = ({ item, index }) => {

        const isUser = item.type === "user";
        const isEditing = editingIndex === index;

        return (

            <View style={[
                styles.row,
                isUser ? styles.userRow : styles.aiRow
            ]}>

                <View style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.aiBubble
                ]}>


                    {isEditing ? (

                        <View style={{ flexDirection: "row", alignItems: "center" }}>

                            <TextInput
                                style={{ flex: 1, color: "#fff" }}
                                value={inputText}
                                onChangeText={setInputText}
                            />

                            <TouchableOpacity
                                onPress={() => {
                                    setEditingIndex(null);
                                    setInputText("");
                                }}
                            >
                                <Icon name="close" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => sendMessage(inputText)}
                            >
                                <Icon name="send" size={20} color="#fff" />
                            </TouchableOpacity>

                        </View>

                    ) : (
                        <>

                            <TouchableOpacity
                                activeOpacity={0.9}
                                onLongPress={() => {
                                    setSelectedIndex(index);
                                    setMenuVisible(true);
                                }}
                            >

                                <Markdown style={markdownStyles}>
                                    {item.text}
                                </Markdown>

                            </TouchableOpacity>

                        </>

                    )}



                </View>

            </View>

        );

    };

    return (
        <>
            {isUpdating ? (<>
                <AILoading visible={isUpdating} />
            </>) : (<>
                <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>


                    <HeaderBarwithBack
                        userName={username}
                        header="Sales AI"
                        subHeader="Smart Sales Assistant"
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
                        onContentSizeChange={() => {
                            if (firstLoadRef.current) {
                                scrollToBottom();
                                firstLoadRef.current = false;
                            }
                        }}
                    />

                    {isTyping && (
                        <View style={[styles.typingRow, { marginTop: -10 }]}>

                            <Animated.View style={[styles.dot, { opacity: dot1 }]} />
                            <Animated.View style={[styles.dot, { opacity: dot2 }]} />
                            <Animated.View style={[styles.dot, { opacity: dot3 }]} />

                        </View>

                    )}

                    {menuVisible && (

                        <View style={styles.menuOverlay}>

                            <View style={styles.menuBox}>

                                <TouchableOpacity
                                    onPress={() => {
                                        Clipboard.setString(messages[selectedIndex].text);
                                        setMenuVisible(false);
                                    }}
                                >
                                    <Text style={styles.menuItem}>Copy</Text>
                                </TouchableOpacity>

                                {messages[selectedIndex]?.type === "user" && (

                                    <TouchableOpacity
                                        onPress={() => {
                                            startEdit(selectedIndex);
                                            setMenuVisible(false);
                                        }}
                                    >
                                        <Text style={styles.menuItem}>Edit</Text>
                                    </TouchableOpacity>

                                )}

                                <TouchableOpacity
                                    onPress={() => setMenuVisible(false)}
                                >
                                    <Text style={styles.menuCancel}>Cancel</Text>
                                </TouchableOpacity>

                            </View>

                        </View>

                    )}

                    <View style={styles.inputContainer}>

                        <TouchableOpacity
                            onPress={isListening ? stopListening : startListening}
                        >

                            <Icon
                                name="mic"
                                size={26}
                                color={isListening ? "#ff4d4f" : "#0A7EA4"}
                            />

                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Ask sales analysis..."
                            multiline
                        />

                        <TouchableOpacity
                            onPress={isTyping ? cancelRequest : () => sendMessage()}
                        >
                            <Icon
                                name={isTyping ? "pause" : "send"}
                                size={26}
                                color="#0A7EA4"
                            />
                        </TouchableOpacity>

                    </View>

                </View></>)}

        </>
    );

};

export default SalesAnalysis;

const styles = StyleSheet.create({

    row: { marginBottom: 18 },

    userRow: { alignItems: "flex-end" },

    // aiRow: { alignItems: "center" },
    aiRow: { alignItems: "flex-start" },
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

    bubble: {
        padding: 14,
        borderRadius: 14
    },

    userBubble: {
        backgroundColor: "#0A7EA4",
        width: "80%",
        alignSelf: "flex-end"
    },

    aiBubble: {
        backgroundColor: "#000",
        width: "100%",
        alignSelf: "center"
    },

    editIcon: {
        marginTop: 6,
        alignSelf: "flex-end"
    },

    longPressHint: {
        fontSize: 10,
        color: "#888",
        marginTop: 4
    },

    typingRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        marginTop: 10,
        marginLeft: 16,
        marginBottom: 10
    },

    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#0A7EA4",
        marginHorizontal: 5
    },

    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff"
    },

    input: {
        flex: 1,
        backgroundColor: "#f1f1f1",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 10,
        color: "#000"
    },
    menuOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "flex-end"
    },

    menuBox: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16
    },

    menuItem: {
        fontSize: 16,
        paddingVertical: 12,
        color: "#000"
    },

    menuCancel: {
        fontSize: 16,
        paddingVertical: 12,
        color: "#ff4d4f"
    },

});

const markdownStyles = {
    body: {
        color: "#fff",
        fontSize: 14,
        lineHeight: 24
    },
    code_inline: {
        backgroundColor: "#222",
        padding: 4,
        borderRadius: 6
    },
    code_block: {
        backgroundColor: "#222",
        padding: 10,
        borderRadius: 8
    },

};