// Modified CameraPage to support modal usage and callback onCapture(base64)
// NOTE: small API change: accepts props onCapture(base64:string) and onClose()
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
    PhotoFile,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { cameraScreen_styles } from '../../common/Styles/Style';

interface Props {
    token?: string;
    navigation?: any;
    isConnected?: boolean | null;
    // NEW props for modal usage:
    onCapture?: (base64DataUrl: string) => void; // called when user presses Done (returns data URL)
    onClose?: () => void; // called when user cancels/closes modal
}

const CameraPage: React.FC<Props> = ({ token, navigation, isConnected, onCapture, onClose }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [photo, setPhoto] = useState<PhotoFile | null>(null);
    const [isZoomVisible, setIsZoomVisible] = useState(false);
    const cameraRef = useRef<Camera>(null);
    const devices = useCameraDevices();
    const device: CameraDevice | undefined = devices.back ?? devices.front ?? devices[0];

    useEffect(() => {
        const requestPermissions = async () => {
            const currentStatus = await Camera.getCameraPermissionStatus();
            let finalStatus = currentStatus;
            if (currentStatus !== 'authorized') {
                await Camera.requestCameraPermission();
                finalStatus = await Camera.getCameraPermissionStatus();
            }
            if (Platform.OS === 'android') {
                await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
            }
            if (finalStatus === 'authorized' || finalStatus === 'granted') {
                setHasPermission(true);
            } else {
                setHasPermission(false);
                Alert.alert('Permission Required', 'Camera permission was not granted. Please enable it from Settings.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]);
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
            setPhoto(photoFile);
        } catch (error) {
            console.error('Failed to capture:', error);
            Alert.alert('Error', 'Failed to capture photo.');
        }
    };

    const retakePhoto = () => setPhoto(null);

    // When user taps "Done" we convert file to base64 and call onCapture(base64DataURL)
    const doneAndReturn = async () => {
        if (!photo) {
            if (onClose) onClose();
            return;
        }
        try {
            const filePath = photo.path;
            const base64 = await RNFS.readFile(filePath, 'base64');
            const dataURL = `data:image/jpeg;base64,${base64}`;
            // send back up to parent
            if (onCapture) onCapture(dataURL);
            // reset local state and close
            setPhoto(null);
            if (onClose) onClose();
        } catch (err) {
            console.error('Error encoding photo:', err);
            Alert.alert('Error', 'Could not process captured image.');
        }
    };

    if (hasPermission === null) {
        return (
            <View style={cameraScreen_styles.centered}>
                <Text>Checking camera permission...</Text>
            </View>
        );
    }
    if (hasPermission === false) {
        return (
            <View style={cameraScreen_styles.centered}>
                <Text>No camera permission. Please enable it from Settings.</Text>
            </View>
        );
    }
    if (!device) {
        return (
            <View style={cameraScreen_styles.centered}>
                <Text>No camera found!</Text>
            </View>
        );
    }

    return (
        <View style={cameraScreen_styles.container}>
            <TouchableOpacity
                style={cameraScreen_styles.closeButton}
                onPress={() => {
                    setPhoto(null);
                    if (onClose) onClose();
                }}
                disabled={isConnected === false}
            >
                <Icon name="close" size={30} color={!isConnected ? '#ccc' : '#000'} />
            </TouchableOpacity>

            {!photo ? (
                <>
                    <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                        photo={true}
                    />

                    <TouchableOpacity onPress={capturePhoto} disabled={isConnected === false} style={[cameraScreen_styles.capture, !isConnected && cameraScreen_styles.disabledcapture]}>
                        <View style={cameraScreen_styles.captureInner}>
                            <Icon name="camera-alt" size={22} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <TouchableOpacity onPress={() => setIsZoomVisible(true)} activeOpacity={0.9}>
                        <Image source={{ uri: 'file://' + photo.path }} style={cameraScreen_styles.previewImage} resizeMode="cover" />
                    </TouchableOpacity>

                    <View style={cameraScreen_styles.overlayButtons}>
                        <TouchableOpacity onPress={doneAndReturn} disabled={!isConnected} style={cameraScreen_styles.button}>
                            <Text style={{ color: '#fff' }}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={retakePhoto} disabled={!isConnected} style={cameraScreen_styles.button}>
                            <Text style={{ color: '#fff' }}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

export default CameraPage;
