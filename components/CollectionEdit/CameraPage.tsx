// // Modified CameraPage to support modal usage and callback onCapture(base64)
// // NOTE: small API change: accepts props onCapture(base64:string) and onClose()
// import React, { useEffect, useState, useRef, useMemo } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     StyleSheet,
//     Alert,
//     Platform,
//     PermissionsAndroid,
//     Linking,
//     Image
// } from 'react-native';
// import {
//     Camera,
//     useCameraDevices,
//     CameraDevice,
//     PhotoFile,
// } from 'react-native-vision-camera';
// import RNFS from 'react-native-fs';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { cameraScreen_styles } from '../../common/Styles/Style';

// interface Props {
//     token?: string;
//     navigation?: any;
//     isConnected?: boolean | null;
//     // NEW props for modal usage:
//     onCapture?: (base64DataUrl: string) => void; // called when user presses Done (returns data URL)
//     onClose?: () => void; // called when user cancels/closes modal
// }

// const CameraPage: React.FC<Props> = ({ token, navigation, isConnected, onCapture, onClose }) => {
//     const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//     const [photo, setPhoto] = useState<PhotoFile | null>(null);
//     const [isZoomVisible, setIsZoomVisible] = useState(false);
//     const cameraRef = useRef<Camera>(null);
//     const devices = useCameraDevices();
//     const device: CameraDevice | undefined = devices.back ?? devices.front ?? devices[0];

//     useEffect(() => {
//         const requestPermissions = async () => {
//             const currentStatus = await Camera.getCameraPermissionStatus();
//             let finalStatus = currentStatus;
//             if (currentStatus !== 'authorized') {
//                 await Camera.requestCameraPermission();
//                 finalStatus = await Camera.getCameraPermissionStatus();
//             }
//             if (Platform.OS === 'android') {
//                 await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
//             }
//             if (finalStatus === 'authorized' || finalStatus === 'granted') {
//                 setHasPermission(true);
//             } else {
//                 setHasPermission(false);
//                 Alert.alert('Permission Required', 'Camera permission was not granted. Please enable it from Settings.', [
//                     { text: 'Cancel', style: 'cancel' },
//                     { text: 'Open Settings', onPress: () => Linking.openSettings() },
//                 ]);
//             }
//         };
//         requestPermissions();
//     }, []);

//     const capturePhoto = async () => {
//         if (cameraRef.current == null) return;
//         try {
//             const photoFile = await cameraRef.current.takePhoto({
//                 qualityPrioritization: 'quality',
//                 fileType: 'jpeg',
//             });
//             setPhoto(photoFile);
//         } catch (error) {
//             console.error('Failed to capture:', error);
//             Alert.alert('Error', 'Failed to capture photo.');
//         }
//     };

//     const retakePhoto = () => setPhoto(null);

//     // When user taps "Done" we convert file to base64 and call onCapture(base64DataURL)
//     const doneAndReturn = async () => {
//         if (!photo) {
//             if (onClose) onClose();
//             return;
//         }
//         try {
//             const filePath = photo.path;
//             const base64 = await RNFS.readFile(filePath, 'base64');
//             const dataURL = `data:image/jpeg;base64,${base64}`;
//             // send back up to parent
//             if (onCapture) onCapture(dataURL);
//             // reset local state and close
//             setPhoto(null);
//             if (onClose) onClose();
//         } catch (err) {
//             console.error('Error encoding photo:', err);
//             Alert.alert('Error', 'Could not process captured image.');
//         }
//     };

//     if (hasPermission === null) {
//         return (
//             <View style={cameraScreen_styles.centered}>
//                 <Text>Checking camera permission...</Text>
//             </View>
//         );
//     }
//     if (hasPermission === false) {
//         return (
//             <View style={cameraScreen_styles.centered}>
//                 <Text>No camera permission. Please enable it from Settings.</Text>
//             </View>
//         );
//     }
//     if (!device) {
//         return (
//             <View style={cameraScreen_styles.centered}>
//                 <Text>No camera found!</Text>
//             </View>
//         );
//     }

//     return (
//         <View style={cameraScreen_styles.container}>
//             <TouchableOpacity
//                 style={cameraScreen_styles.closeButton}
//                 onPress={() => {
//                     setPhoto(null);
//                     if (onClose) onClose();
//                 }}
//                 disabled={isConnected === false}
//             >
//                 <Icon name="close" size={30} color={!isConnected ? '#ccc' : '#000'} />
//             </TouchableOpacity>

//             {!photo ? (
//                 <>
//                     <Camera
//                         ref={cameraRef}
//                         style={StyleSheet.absoluteFill}
//                         device={device}
//                         isActive={true}
//                         photo={true}
//                     />

//                     <TouchableOpacity onPress={capturePhoto} disabled={isConnected === false} style={[cameraScreen_styles.capture, !isConnected && cameraScreen_styles.disabledcapture]}>
//                         <View style={cameraScreen_styles.captureInner}>
//                             <Icon name="camera-alt" size={22} color="#fff" />
//                         </View>
//                     </TouchableOpacity>
//                 </>
//             ) : (
//                 <>
//                     <TouchableOpacity onPress={() => setIsZoomVisible(true)} activeOpacity={0.9}>
//                         <Image source={{ uri: 'file://' + photo.path }} style={cameraScreen_styles.previewImage} resizeMode="cover" />
//                     </TouchableOpacity>

//                     <View style={cameraScreen_styles.overlayButtons}>
//                         <TouchableOpacity onPress={doneAndReturn} disabled={!isConnected} style={cameraScreen_styles.button}>
//                             <Text style={{ color: '#fff' }}>Done</Text>
//                         </TouchableOpacity>
//                         <TouchableOpacity onPress={retakePhoto} disabled={!isConnected} style={cameraScreen_styles.button}>
//                             <Text style={{ color: '#fff' }}>Retake</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </>
//             )}
//         </View>
//     );
// };

// export default CameraPage;
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        padding: 8
    },
    captureButton: {
        alignSelf: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 50,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    captureInner: { padding: 20 },
    previewImage: { width: '100%', height: '80%' },
    overlayButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        position: 'absolute',
        bottom: 0,
        width: '100%'
    },
    button: {
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 5,
        minWidth: 100,
        alignItems: 'center'
    },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    errorText: { color: 'red', marginBottom: 20, textAlign: 'center' },
    loadingText: { color: 'white', fontSize: 16 },
    warningBox: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        width: '90%',
    },
    warningTitle: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    warningText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 8,
    },
    warningSubtext: {
        color: '#ccc',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    demoButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    demoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    closeButton2: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    closeButtonText: {
        color: '#FF6B6B',
        fontSize: 16,
    },
});

interface Props {
    onCapture?: (base64DataUrl: string) => void;
    onClose?: () => void;
    isConnected?: boolean;
}

const CameraPage: React.FC<Props> = ({ onCapture, onClose, isConnected = true }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
    const [isEmulator, setIsEmulator] = useState(false);
    const [CameraComponent, setCameraComponent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [demoPhoto, setDemoPhoto] = useState<string | null>(null);
    const cameraRef = useRef<any>(null);

    // Better emulator detection
    useEffect(() => {
        const detectEmulator = () => {
            // iOS Simulator detection
            if (Platform.OS === 'ios') {
                if (Platform.isTV || !global.nativeFabricUIManager ||
                    (Platform.constants as any)?.isTesting) {
                    setIsEmulator(true);
                    return true;
                }
            }
            // Android Emulator detection
            else if (Platform.OS === 'android') {
                const constants = Platform.constants as any;
                if (constants?.Brand === 'google' ||
                    constants?.Manufacturer === 'Google' ||
                    constants?.Model?.includes('sdk') ||
                    constants?.Model?.includes('emulator')) {
                    setIsEmulator(true);
                    return true;
                }
            }
            setIsEmulator(false);
            return false;
        };

        const isEmulatorDevice = detectEmulator();

        // Agar emulator hai to camera load mat karo
        if (isEmulatorDevice) {
            setIsLoading(false);
            return;
        }

        // Real device pe camera load karo
        const loadCamera = async () => {
            try {
                const { Camera } = await import('expo-camera');
                setCameraComponent(() => Camera);
            } catch (err) {
                console.error('Camera load error:', err);
                setError('Camera module not available');
            } finally {
                setIsLoading(false);
            }
        };

        loadCamera();
    }, []);

    // Request permissions for real device
    useEffect(() => {
        const requestPermissions = async () => {
            if (isEmulator || !CameraComponent) return;

            try {
                const { status } = await CameraComponent.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
                if (status !== 'granted') {
                    setError('Camera permission denied');
                }
            } catch (err) {
                console.error('Permission error:', err);
                setError('Failed to get camera permission');
                setHasPermission(false);
            }
        };

        if (CameraComponent && !isEmulator) {
            requestPermissions();
        }
    }, [CameraComponent, isEmulator]);

    const handleCameraReady = () => setIsCameraReady(true);
    const handleCameraError = () => setError('Camera error occurred');

    // Emulator ke liye demo photo capture
    const captureDemoPhoto = () => {
        if (!isConnected) {
            Alert.alert('Offline', 'You are offline');
            return;
        }

        setShowDemoModal(true);
    };

    const selectDemoImage = (type: 'sample' | 'gallery') => {
        if (type === 'sample') {
            // Create a dummy image URI (you can replace with actual sample image)
            setDemoPhoto('https://via.placeholder.com/400x600?text=Sample+Photo');
        } else {
            Alert.alert('Info', 'In real device, gallery would open here');
            setDemoPhoto('https://via.placeholder.com/400x600?text=Demo+Photo');
        }
    };

    const useDemoPhoto = async () => {
        if (demoPhoto) {
            // For demo, create a simple base64 image
            const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const dataURL = `data:image/png;base64,${dummyBase64}`;
            onCapture?.(dataURL);
            setShowDemoModal(false);
            setDemoPhoto(null);
            onClose?.();
        }
    };

    // Emulator UI
    if (isEmulator && !isLoading) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Icon name="close" size={28} color="#000" />
                </TouchableOpacity>

                <View style={styles.centered}>
                    <View style={styles.warningBox}>
                        <Icon name="developer-mode" size={60} color="#FFD700" />
                        <Text style={styles.warningTitle}>Emulator Mode</Text>
                        <Text style={styles.warningText}>
                            Camera is not available on emulator/simulator.
                        </Text>
                        <Text style={styles.warningSubtext}>
                            Use demo mode to test functionality or run on a real device.
                        </Text>

                        <TouchableOpacity
                            style={styles.demoButton}
                            onPress={captureDemoPhoto}
                        >
                            <Icon name="camera-alt" size={24} color="#fff" />
                            <Text style={styles.demoButtonText}>Demo Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton2}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Demo Modal for Emulator */}
                <Modal
                    visible={showDemoModal}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setShowDemoModal(false)}
                >
                    <View style={styles.container}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDemoModal(false)}
                        >
                            <Icon name="close" size={28} color="#000" />
                        </TouchableOpacity>

                        {!demoPhoto ? (
                            <View style={styles.centered}>
                                <Text style={[styles.warningTitle, { color: '#fff' }]}>
                                    Demo Camera
                                </Text>
                                <TouchableOpacity
                                    style={[styles.demoButton, { marginTop: 20 }]}
                                    onPress={() => selectDemoImage('sample')}
                                >
                                    <Icon name="image" size={24} color="#fff" />
                                    <Text style={styles.demoButtonText}>Take Sample Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.demoButton, { backgroundColor: '#2196F3', marginTop: 12 }]}
                                    onPress={() => selectDemoImage('gallery')}
                                >
                                    <Icon name="photo-library" size={24} color="#fff" />
                                    <Text style={styles.demoButtonText}>Use Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <Image
                                    source={{ uri: demoPhoto }}
                                    style={styles.previewImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.overlayButtons}>
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={useDemoPhoto}
                                    >
                                        <Text style={styles.buttonText}>Use Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={() => setDemoPhoto(null)}
                                    >
                                        <Text style={styles.buttonText}>Retake</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </Modal>
            </View>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    // Permission loading state
    if (hasPermission === null && !isEmulator) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Requesting permissions...</Text>
            </View>
        );
    }

    // Error state
    if (error || hasPermission === false) {
        return (
            <View style={styles.centered}>
                <Icon name="error" size={50} color="#FF6B6B" />
                <Text style={styles.errorText}>{error || 'Camera permission required'}</Text>
                {hasPermission === false && (
                    <TouchableOpacity
                        onPress={() => Linking.openSettings()}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Open Settings</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={onClose}
                    style={[styles.button, { marginTop: 10, backgroundColor: '#FF6B6B' }]}
                >
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Real device camera UI
    if (!CameraComponent) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Camera unavailable</Text>
                <TouchableOpacity onPress={onClose} style={styles.button}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Main camera UI for real device
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => {
                setPhoto(null);
                onClose?.();
            }}>
                <Icon name="close" size={28} color="#000" />
            </TouchableOpacity>

            {!photo ? (
                <>
                    <CameraComponent
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        type={cameraType}
                        onCameraReady={handleCameraReady}
                        onError={handleCameraError}
                    />

                    {!isCameraReady && (
                        <View style={styles.centered}>
                            <Text style={styles.loadingText}>Starting camera...</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={capturePhoto}
                        style={styles.captureButton}
                        disabled={!isCameraReady || !isConnected}
                    >
                        <View style={styles.captureInner}>
                            <Icon
                                name="camera-alt"
                                size={30}
                                color={!isCameraReady || !isConnected ? '#ccc' : '#fff'}
                            />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
                        style={{ position: 'absolute', bottom: 100, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, padding: 12 }}
                        disabled={!isCameraReady}
                    >
                        <Icon name="switch-camera" size={24} color="#fff" />
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <Image source={{ uri: photo }} style={styles.previewImage} resizeMode="contain" />
                    <View style={styles.overlayButtons}>
                        <TouchableOpacity onPress={doneAndReturn} style={styles.button}>
                            <Text style={styles.buttonText}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={retakePhoto} style={styles.button}>
                            <Text style={styles.buttonText}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

export default CameraPage;