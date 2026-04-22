import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal, FlatList, ActivityIndicator, StyleSheet, Dimensions,
    Platform
} from 'react-native';
import theme from '../../android/app/src/theme';

import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { yarnmanagementsystemstyle } from '../../common/Styles/Style';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import { ScrollView } from 'react-native';


import CustomDrawer from './CustomDrawer';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import PartyDropdown from '../Shared/PartyDropdown';


interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

type GridItem = {
    srNo: number;
    CartonNo: string;
    design: string;
};

const YarnManagementSystem: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isLoading, setIsLoading] = useState(false);
    const [getDataSaved, setDataSaved] = useState(false)
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const today = new Date();
    const [FormState, setFormState] = useState({
        values: {
            PrpOf: ''
        }
    })
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeTab, setActiveTab] = useState('Spun');
    const [showSpunCard, setShowSpunCard] = useState(false);
    const [showFilamentCard, setShowFilamentCard] = useState(false);
    const [blenddata, setblenddata] = useState([]);
    const [selectedblend, setselectedblend] = useState([]);
    const [countdata, setcountdata] = useState([]);
    const [selectedcount, setselectedcount] = useState([]);
    const [plydata, setplydata] = useState([]);
    const [selectedply, setselectedply] = useState([]);
    const [propertydata, setpropertydata] = useState<ExeData[]>([]);

    console.log("blenddata", blenddata);

    const styles = StyleSheet.create({
        fab: {
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 1,

            backgroundColor: theme.BRAND_GRADIENT_END,
            borderRadius: 6,
            padding: 10,
            elevation: 5,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });

    // let cancelToken: any;

    const cancelToken = useRef(null);

    console.log("prptype", propertydata);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });


    const fetchPropertyGroup = async () => {
        try {
            const response = await axios.get(`${API}/api/get_criterion`, {
                params: {
                    fetch: 'prptype',
                    txntype: 'yarn_creation_item_master'
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log("response", response);
            if (response.data?.success) {
                setAllPropertyData(response.data.response.data);
            }

        } catch (error) {
            console.error("Error fetching property group:", error);
        }
    };

    useEffect(() => {
        if (isDrawerVisible) {
            fetchPropertyGroup();
        }
    }, [isDrawerVisible]);

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    useEffect(() => {
        requestPermission();
    }, []);


    const fetchBlenddata = async () => {
        if (!FormState.values.PrpOf) return;
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prpcode: "SIP",
                prptype: FormState.values.PrpOf,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
                yearno: "27"
            };

            console.log("historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnblend`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("blend API Response:", response);
            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setblenddata(data);
            } else {
                setblenddata([]);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlendcount = async () => {
        if (!FormState.values.PrpOf) return;
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prpcode: "SIP",
                prptype: FormState.values.PrpOf,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
                yearno: "27"
            };

            console.log("count historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarncount`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("count API Response:", response);
            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setcountdata(data);
            } else {
                setcountdata([]);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlendply = async () => {
        if (!FormState.values.PrpOf) return;
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prpcode: "SIP",
                prptype: FormState.values.PrpOf,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
                yearno: "27"
            };

            console.log("ply historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnply`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("ply API Response:", response);
            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setplydata(data);
            } else {
                setplydata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (FormState.values.PrpOf) {
            fetchBlenddata();
            fetchBlendcount();
            fetchBlendply();
        }
    }, [FormState.values.PrpOf, activeTab]);

    const handleLoadPress = () => {
        setIsDrawerVisible(false);
    };

    const handleAddClick = () => {
        if (activeTab === 'Spun') {
            setShowSpunCard(true);
            setShowFilamentCard(false);
        } else {
            setShowFilamentCard(true);
            setShowSpunCard(false);
        }
    };

    const formattedBlendData = (blenddata || []).map(item => ({
        label: item.name,
        value: item.id
    }));

    // return (
    //     <>
    //         {isLoading && <FullScreenLoader />}
    //         <HeaderBarwithBack
    //             userName={username}
    //             header={'Yarn Managment System'}
    //             subHeader={'Manage Your Yarn Items And Create Sub Items'}
    //         />

    //         {isLoading  && (
    //             <View style={yarnmanagementsystemstyle.emptyContainer}>
    //                 {!FormState?.values?.PrpOf ? (
    //                     <Text style={yarnmanagementsystemstyle.emptyTextRed}>
    //                         Please Property
    //                     </Text>
    //                 ) : (
    //                     <Text style={yarnmanagementsystemstyle.emptyText}>
    //                         No request data found!
    //                     </Text>
    //                 )}

    //             </View>
    //         )}


    //         {/* <View style={{ flex: 1, padding: 10 }}>
    //             <View style={yarnmanagementsystemstyle.tabContainer}>
    //                 <TouchableOpacity
    //                     style={[yarnmanagementsystemstyle.tab, activeTab === 'Spun' && yarnmanagementsystemstyle.activeTab]}
    //                     onPress={() => setActiveTab('Spun')}
    //                 >
    //                     <Text style={[yarnmanagementsystemstyle.tabText, activeTab === 'Spun' && yarnmanagementsystemstyle.activeTabText]}>
    //                         Spun
    //                     </Text>
    //                 </TouchableOpacity>

    //                 <TouchableOpacity
    //                     style={[yarnmanagementsystemstyle.tab, activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTab]}
    //                     onPress={() => setActiveTab('Filaments')}
    //                 >
    //                     <Text style={[yarnmanagementsystemstyle.tabText, activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTabText]}>
    //                         Filaments
    //                     </Text>
    //                 </TouchableOpacity>
    //             </View>
    //         </View> */}

    //         <TouchableOpacity style={styles.fab} onPress={openDrawer}>
    //             <Icon name="list" size={20} color="#fff" />
    //         </TouchableOpacity>




    //         <CustomDrawer
    //             isVisible={isDrawerVisible}
    //             onClose={closeDrawer}
    //             selectedYear={selectedYear}
    //             onYearChange={setSelectedYear}
    //             onLoadPress={handleLoadPress}
    //             isLoading={isLoading}
    //             setIsLoading={setIsLoading}
    //             getAllPropertyData={getAllPropertyData}
    //             setAllPropertyData={setAllPropertyData}
    //             FormState={FormState}
    //             setFormState={setFormState}
    //             getAllYearData={getAllYearData}
    //             setAllYearData={setAllYearData}
    //             token={token}
    //         />
    //     </>
    // );

    return (
        <>
            {isLoading && <FullScreenLoader />}

            <HeaderBarwithBack
                userName={username}
                header={'Yarn Managment System'}
                subHeader={'Manage Your Yarn Items And Create Sub Items'}
            />

            {!FormState.values.PrpOf && (
                <View style={yarnmanagementsystemstyle.emptyContainer}>
                    <Text style={yarnmanagementsystemstyle.emptyTextRed}>
                        Please Select Property
                    </Text>
                </View>
            )}

            {FormState.values.PrpOf && (
                <View style={yarnmanagementsystemstyle.container}>
                    <View style={yarnmanagementsystemstyle.mainCard}>

                        {/* 🔹 Tabs */}
                        <View style={yarnmanagementsystemstyle.tabContainer}>

                            {/* Spun */}
                            <TouchableOpacity
                                style={[
                                    yarnmanagementsystemstyle.tab,
                                    activeTab === 'Spun' && yarnmanagementsystemstyle.activeTab
                                ]}
                                onPress={() => {
                                    setActiveTab('Spun');
                                    setShowSpunCard(false);
                                    setShowFilamentCard(false);
                                }}
                            >
                                <Text style={[
                                    yarnmanagementsystemstyle.tabText,
                                    activeTab === 'Spun' && yarnmanagementsystemstyle.activeTabText
                                ]}>
                                    Spun
                                </Text>
                            </TouchableOpacity>

                            {/* Filament */}
                            <TouchableOpacity
                                style={[
                                    yarnmanagementsystemstyle.tab,
                                    activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTab
                                ]}
                                onPress={() => {
                                    setActiveTab('Filaments');
                                    setShowSpunCard(false);
                                    setShowFilamentCard(false);
                                }}
                            >
                                <Text style={[
                                    yarnmanagementsystemstyle.tabText,
                                    activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTabText
                                ]}>
                                    Filament
                                </Text>
                            </TouchableOpacity>

                        </View>
                        {activeTab === 'Spun' && (
                            <>
                                {!showSpunCard && (
                                    <>
                                        <TouchableOpacity
                                            style={yarnmanagementsystemstyle.addButton}
                                            onPress={handleAddClick}
                                        >
                                            <Text style={yarnmanagementsystemstyle.addButtonText}>
                                                + Add Spun Item
                                            </Text>
                                        </TouchableOpacity>

                                        <View style={yarnmanagementsystemstyle.emptyBox}>
                                            <Text style={yarnmanagementsystemstyle.emptyText}>
                                                No spun items yet.
                                            </Text>
                                            <Text style={yarnmanagementsystemstyle.emptySubText}>
                                                Add one to get started!
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {showSpunCard && (
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={{ marginTop: 10 }}
                                    >
                                        <View style={yarnmanagementsystemstyle.formCard}>

                                            {/* 🔹 Heading */}
                                            <Text style={yarnmanagementsystemstyle.formTitle}>
                                                Add Spun Main Item
                                            </Text>

                                            {/* 🔹 Blend */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Blend <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={{ flex: 1 }}>
                                                    <PartyDropdown
                                                        data={blenddata}
                                                        placeholder="Choose blend..."
                                                        labelKey={["name,id"]}
                                                        valueKey="id"
                                                        pageSize={12}
                                                        initialValue={selectedblend ?? null}
                                                        selected={selectedblend ?? null}
                                                        type="blend"
                                                        onSelect={(item) => {
                                                            setselectedblend(item);
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    id: item?.id || "",

                                                                }
                                                            }));
                                                        }}
                                                        setSelected={(val) => {
                                                            if (!val) {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: '',
                                                                    }
                                                                }));
                                                            } else {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: val?.id || "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>Count</Text>
                                                <View style={{ flex: 1 }}>
                                                    <PartyDropdown
                                                        data={countdata}
                                                        placeholder="Choose blend..."
                                                        labelKey={["count", "id"]}
                                                        valueKey="id"
                                                        pageSize={12}
                                                        initialValue={selectedcount ?? null}
                                                        selected={selectedcount ?? null}
                                                        type="count"
                                                        onSelect={(item) => {
                                                            setselectedcount(item);
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    id: item?.id || "",

                                                                }
                                                            }));
                                                        }}
                                                        setSelected={(val) => {
                                                            if (!val) {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: '',
                                                                    }
                                                                }));
                                                            } else {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: val?.id || "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>Ply</Text>
                                                <View style={{ flex: 1 }}>
                                                    <PartyDropdown
                                                        data={plydata}
                                                        placeholder="Choose blend..."
                                                        labelKey={["name,id"]}
                                                        valueKey="id"
                                                        pageSize={12}
                                                        initialValue={selectedply ?? null}
                                                        selected={selectedply ?? null}
                                                        type="blend"
                                                        onSelect={(item) => {
                                                            setselectedply(item);
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    id: item?.id || "",

                                                                }
                                                            }));
                                                        }}
                                                        setSelected={(val) => {
                                                            if (!val) {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: '',
                                                                    }
                                                                }));
                                                            } else {
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        id: val?.id || "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>Type</Text>
                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput placeholder="Select type" />
                                                </View>
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>Lustre</Text>
                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput placeholder="Select lustre" />
                                                </View>
                                            </View>

                                        </View>
                                    </ScrollView>
                                )}
                            </>
                        )}
                        {activeTab === 'Filaments' && (
                            <>
                                {!showFilamentCard && (
                                    <>
                                        <TouchableOpacity
                                            style={yarnmanagementsystemstyle.addButton}
                                            onPress={handleAddClick}
                                        >
                                            <Text style={yarnmanagementsystemstyle.addButtonText}>
                                                + Add Filament Item
                                            </Text>
                                        </TouchableOpacity>

                                        <View style={yarnmanagementsystemstyle.emptyBox}>
                                            <Text style={yarnmanagementsystemstyle.emptyText}>
                                                No filament items yet.
                                            </Text>
                                            <Text style={yarnmanagementsystemstyle.emptySubText}>
                                                Add one to get started!
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {showFilamentCard && (
                                    <View style={yarnmanagementsystemstyle.formCard}>
                                        <Text>Add Filament Main Item</Text>


                                    </View>
                                )}
                            </>
                        )}

                    </View>
                </View>
            )}

            <TouchableOpacity style={styles.fab} onPress={openDrawer}>
                <Icon name="list" size={20} color="#fff" />
            </TouchableOpacity>

            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onLoadPress={handleLoadPress}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                getAllPropertyData={getAllPropertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                token={token}
            />
        </>
    );
};
export default YarnManagementSystem;
