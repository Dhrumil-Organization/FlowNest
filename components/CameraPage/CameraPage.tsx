import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform,
    PermissionsAndroid,
    Linking,
    Image
} from 'react-native';
import {
    Camera,
    useCameraDevices,
    CameraDevice,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import axios from 'axios';
import ImageViewing from 'react-native-image-viewing';

interface Props {
    token: string;
}

const CameraPage: React.FC<Props> = ({ token }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [photo, setPhoto] = useState<PhotoFile | null>(null);
    const [isZoomVisible, setIsZoomVisible] = useState(false);
    const cameraRef = useRef<Camera>(null);
    const devices = useCameraDevices();
    // console.log("All devices:", JSON.stringify(devices, null, 2));

    const device: CameraDevice | undefined = devices.back ?? devices.front ?? devices[0];
    // const device: CameraDevice | undefined = devices.back;

    // console.log('Using device:', device);
    console.log('token in CameraPage:', token);


    useEffect(() => {
        const requestPermissions = async () => {
            console.log('🔵 Checking camera permission...');
            const currentStatus = await Camera.getCameraPermissionStatus();
            console.log('✅ Current Camera Permission:', currentStatus);

            let finalStatus = currentStatus;

            if (currentStatus !== 'authorized') {
                console.log('🟡 Requesting Camera Permission...');
                await Camera.requestCameraPermission();

                // 🟢 Fix: Immediately check status again!
                finalStatus = await Camera.getCameraPermissionStatus();
                console.log('🔄 After request, Camera Permission:', finalStatus);
            }

            if (Platform.OS === 'android') {
                const storagePermission = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                );
                console.log('✅ Storage permission:', storagePermission);
            }

            if (finalStatus === 'authorized' || finalStatus === 'granted') {
                console.log('✅ Final Permission: Authorized!');
                setHasPermission(true);
            } else {
                console.log('❌ Final Permission: Not Authorized!');
                setHasPermission(false);
                Alert.alert(
                    'Permission Required',
                    'Camera permission was not granted.\nPlease enable it from Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ],
                );
            }
        };

        requestPermissions();
    }, []);


    const capturePhoto = async () => {
        if (cameraRef.current == null) return;

        try {
            const photoFile = await cameraRef.current.takePhoto({
                qualityPrioritization: 'quality',
                fileType: 'jpeg',
            });
            console.log('✅ Photo captured:', photoFile);
            setPhoto(photoFile);
        } catch (error) {
            console.error('❌ Failed to capture:', error);
        }
    };

    const getToken = () => {
        return token;
    };
    const savePhoto = async () => {
        if (!photo) return;

        try {
            const filePath = photo.path;

            // 1️⃣ Read Base64
            const base64 = await RNFS.readFile(filePath, 'base64');

            // 2️⃣ Bana Data URL
            const dataURL = `data:image/jpeg;base64,${base64}`;

            console.log('✅ Image Data URL:', dataURL.slice(0, 100) + '...');

            // 3️⃣ Payload me poora Data URL bhej
            const payload = {
                image_base64: dataURL,  // 📌 Direct Data URL
                iscapture: '0',
            };

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('🔵 Sending to API...', payload);
            setPhoto(null);
            // 4️⃣ Proper Axios call with response
            const response = await axios.post(
                `https://apig.tms-webapp.com/api/sendinput`,
                payload,
                { headers }
            );

            // ✅ Handle response status + data
            console.log('✅ API Response Status:', response.status);
            console.log('✅ API Response Data:', response.data);

            if (response.status === 200) {
                // Alert.alert('✅ Success', 'Photo sent to API with Data URL!');
            } else {
                // Alert.alert('⚠️ API Warning', `Status: ${response.status}\nMessage: ${JSON.stringify(response.data)}`);
            }

        } catch (error) {
            console.error('❌ Error sending photo:', error);

            // Axios error structure check
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    console.log('🔴 Response data:', error.response.data);
                    console.log('🔴 Response status:', error.response.status);
                    console.log('🔴 Response headers:', error.response.headers);
                    // Alert.alert('❌ API Error',
                    //     `Status: ${error.response.status}\nMessage: ${JSON.stringify(error.response.data)}`
                    // );
                } else if (error.request) {
                    console.log('🔴 No response received:', error.request);
                    // Alert.alert('❌ Network Error', 'No response received from API.');
                } else {
                    console.log('🔴 Axios config error:', error.message);
                    // Alert.alert('❌ Axios Error', error.message);
                }
            } else {
                console.log('🔴 Unknown error:', error);
                // Alert.alert('❌ Unknown Error', 'Something went wrong.');
            }

        } finally {
            // setPhoto(null);
        }
    };

    const format = useMemo(() => {
        return device?.formats.find((f) => f.photoWidth && (f.photoWidth / f.photoHeight === 4 / 3));
    }, [device]);




    const retakePhoto = () => {
        setPhoto(null);
    };

    if (hasPermission === null) {
        return (
            <View style={styles.centered}>
                <Text>Checking camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.centered}>
                <Text>No camera permission. Please enable it from Settings.</Text>
            </View>
        );
    }

    if (!device) {
        console.log("⚠️ NO CAMERA DEVICE FOUND:", JSON.stringify(devices, null, 2));
        return (
            <View style={styles.centered}>
                <Text>No camera found!</Text>
            </View>
        );
    }


    return (
        <View style={styles.container}>
            {!photo ? (
                <>
                    <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                        photo={true}
                        format={format}
                        enableZoomGesture
                    />

                    <TouchableOpacity onPress={capturePhoto} style={styles.capture}>
                        <Text style={{ color: '#fff', fontSize: 16 }}>Capture</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <TouchableOpacity
                        onPress={() => setIsZoomVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Image
                            source={{ uri: 'file://' + photo.path }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>

                    <ImageViewing
                        images={[{ uri: 'file://' + photo.path }]}
                        imageIndex={0}
                        visible={isZoomVisible}
                        onRequestClose={() => setIsZoomVisible(false)}
                    />
                    <View style={styles.overlayButtons}>
                        <TouchableOpacity onPress={savePhoto} style={styles.button}>
                            <Text style={{ color: '#fff' }}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={retakePhoto} style={styles.button}>
                            <Text style={{ color: '#fff' }}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    capture: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: '#000',
        padding: 20,
        borderRadius: 50,
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 3 / 4, // ya 4 / 3
        alignSelf: 'center',
        backgroundColor: '#000',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    button: {
        marginVertical: 10,
        backgroundColor: '#000',
        padding: 20,
        borderRadius: 50,
    },
    overlayButtons: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },

});


export default CameraPage;
