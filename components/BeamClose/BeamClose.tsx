import React, { useEffect, useState } from "react";
import { Text, StyleSheet, TouchableOpacity, View, Alert, Modal, useWindowDimensions } from "react-native";
import { fetchAllYeardata } from "../../common/API/Functions";
import SearchableDropdown from "../Shared/SearchableDropdown";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import theme from '../../android/app/src/theme';
import SelectBeam from "./SelectBeam";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from "react-native";

const BeamClose: React.FC<Props> = ({
    token,
    isConnected,
    username,
    navigation
}) => {

    const [FormState, setFormState] = useState({
        values: {
            CheckingDate: new Date(),
            PrpCode: '',
            YearNo: '',
            MacCode: '',
            MacName: '',
            DsnCode: '',
            DsnName: '',
            BeamNo: '',
            islasttaka: 0,
        }
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [getAllYearData, setAllYearData] = useState([]);
    const [machineData, setMachineData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [machineLoading, setMachineLoading] = useState(false);
    const [designLoading, setDesignLoading] = useState(false);
    const [BeamHelp, setBeamHelpOpen] = useState(false);
    const [beamList, setBeamList] = useState([]);

    const [machineModal, setMachineModal] = useState(false);
    const [designModal, setDesignModal] = useState(false);

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    // 🔹 Load Year
    useEffect(() => {
        const loadYear = async () => {
            const data = await fetchAllYeardata(token, "SIP");
            setAllYearData(data);
        };
        loadYear();
    }, []);

    const formatAPIDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // 🔹 Fetch Machine + Design + Beam
    useEffect(() => {
        if (FormState.values.YearNo && FormState.values.CheckingDate) {
            fetchMachine();
        }
    }, [FormState.values.YearNo, FormState.values.CheckingDate]);

    let cancelToken;

    const fetchMachine = async () => {
        try {
            setMachineLoading(true);

            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();

            const payload = {
                PrpCode: 'SIP',
                yearno: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_close_tablet',
            };

            const response = await axios.get(
                `${API}/api/get_checking_help`,
                {
                    params: payload,
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = response?.data?.response?.data || [];
            setMachineData(data);
            // setDesignData(data); // same API

        } catch (err) {
            console.log("API ERROR:", err);
        } finally {
            setMachineLoading(false);
        }
    };

    const fetchDesign = async (macCode) => {
        try {
            setDesignLoading(true);

            const payload = {
                PrpCode: 'SIP',
                yearno: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                MacCode: macCode,
                txntype: 'beam_close_tablet',
            };

            const response = await axios.get(
                `${API}/api/get_checking_help`,
                {
                    params: payload,
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = response?.data?.response?.data || [];

            setDesignData(data);
            setBeamList(data);
            // ✅ AUTO SELECT FIRST DESIGN
            if (data.length > 0) {
                const first = data[0];

                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        DsnCode: first?.DsnCode || '',
                        DsnName: first?.DsnName || '',
                        BeamNo: first?.BeamNo || '',
                        WarpLen: first?.WarpLen || '',
                        BeamUId: first?.BeamUId || '',
                        QltWt: first?.QltWt || '',
                        UId: first?.UId || '',
                    }
                }));
            }

        } catch (err) {
            console.log("DESIGN API ERROR:", err);
        } finally {
            setDesignLoading(false);
        }
    };

    // 🔹 Format Machine
    const formattedMachineData = machineData.map(item => ({
        MacCode: item.MacCode,
        MacName: item.MacName,
        PrpCode: item.PrpCode,
        displayLabel: `${item.MacCode} - ${item.MacName}`
    }));

    // 🔹 Format Design
    const formattedDesignData = designData.map(item => ({
        DsnCode: item.DsnCode,
        DsnName: item.DsnName,
        BeamNo: item.BeamNo,
        BeamUId: item.BeamUId,
        QltWt: item.QltWt,
        WarpLen: item.WarpLen,
        UId: item.UId,
        displayLabel: `${item.DsnCode} - ${item.DsnName}`
    }));

    const selectedDesign = formattedDesignData.find(
        d => d.DsnCode === FormState.values.DsnCode
    );

    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    // ✅ DD-MM-YYYY → Financial Year
    const getFinancialYearFromDate = (date) => {
        if (!date) return null;

        const d = new Date(date);

        if (isNaN(d.getTime())) return null;

        const month = d.getMonth() + 1;
        const year = d.getFullYear();

        if (month <= 3) {
            return `${year - 1}-${year}`;
        } else {
            return `${year}-${year + 1}`;
        }
    };

    const handleCheckTranDate = (dateValue, isFromPicker = false) => {
        if (!dateValue) return;

        const calculatedFY = getFinancialYearFromDate(dateValue);

        if (!calculatedFY) return;

        const matchedYear = getAllYearData.find(
            y => y.YearName === calculatedFY
        );

        if (!matchedYear) return;

        if (isFromPicker) {
            // ✅ Auto set Year
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    YearNo: matchedYear.YearNo
                }
            }));
        } else {
            // ❌ mismatch case
            if (FormState.values.YearNo !== matchedYear.YearNo) {
                Alert.alert(
                    "Error",
                    "Selected date does not match selected financial year"
                );
            }
        }
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    CheckingDate: selectedDate   // ✅ CHANGE HERE
                }
            }));
        }

        handleCheckTranDate(selectedDate, true);
    };

    useEffect(() => {
        if (getAllYearData.length > 0) {

            const today = new Date();

            const calculatedFY = getFinancialYearFromDate(today);

            const matchedYear = getAllYearData.find(
                y => y.YearName === calculatedFY
            );

            if (matchedYear) {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        YearNo: matchedYear.YearNo,
                        CheckingDate: today   // ✅ ensure sync
                    }
                }));
            }
        }
    }, [getAllYearData]);

    const selectedYear = getAllYearData.find(
        y => y.YearNo === FormState.values.YearNo
    );

    const formatDate1 = (date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const resetForm = () => {
        setFormState({
            values: {
                CheckingDate: new Date(),
                PrpCode: '',          // 🔥 IMPORTANT
                YearNo: FormState.values.YearNo,
                MacCode: '',
                MacName: '',
                DsnCode: '',
                DsnName: '',
                BeamNo: '',
                WarpLen: '',
                BeamUId: '',
                QltWt: '',
                UId: '',
                islasttaka: 0,
            }
        });

        setMachineData([]);
        setDesignData([]);
    };

    useEffect(() => {
        resetForm();   // 🔥 important
    }, []);

    const validateFinancialYear = () => {
        const calculatedFY = getFinancialYearFromDate(FormState.values.CheckingDate);

        const matchedYear = getAllYearData.find(
            y => y.YearName === calculatedFY
        );

        const selectedYearObj = getAllYearData.find(
            y => y.YearNo === FormState.values.YearNo
        );

        const selectedYearName = selectedYearObj?.YearName || "N/A";

        if (!matchedYear || FormState.values.YearNo !== matchedYear.YearNo) {
            Alert.alert(
                "Warning",
                `Checking Date (${formatDate(FormState.values.CheckingDate)}) belongs to FY (${calculatedFY}) but selected year is (${selectedYearName})`
            );
            return false;
        }

        return true;
    };

    const handleSaveData = async () => {
        try {

            if (!validateFinancialYear()) return;

            // ✅ VALIDATION
            if (!FormState.values.MacCode) {
                Alert.alert("Warning", "Please select Machine");
                return;
            }

            if (!FormState.values.DsnCode) {
                Alert.alert("Warning", "Please select Design");
                return;
            }

            // ✅ MAIN OBJECT
            const d1Obj = {
                AvgWt: FormState.values.AvgWt || 0,
                BalLen: null,
                BeamNo: FormState.values.BeamNo,
                BeamUId: FormState.values.BeamUId,
                ChkCode: FormState.values.ChkCode || null,
                ChkName: FormState.values.ChkName || null,
                CutLen: null,
                DsnCode: FormState.values.DsnCode,
                DsnName: FormState.values.DsnName,
                GStatus: null,
                GrdCode: FormState.values.GrdCode || '',
                GrdName: FormState.values.GrdName || '',
                MacCode: FormState.values.MacCode,
                MacName: FormState.values.MacName,
                OQty: null,
                PlanSrNo: null,
                PlanUId: null,
                Qty: FormState.values.Qty || 0,
                QltWt: FormState.values.QltWt,
                RecType: null,
                Remarks: FormState.values.Remarks || '',
                SrNo: FormState.values.SrNo || 0,
                Status: FormState.values.Status || 0,
                SupCode: FormState.values.SupCode || '',
                SupName: FormState.values.SupName || '',
                TakaNo: FormState.values.TakaNo || null,
                TechSup: FormState.values.TechSup || '',
                TechSupName: FormState.values.TechSupName || '',
                UId: FormState.values.UId,
                WarpLen: FormState.values.WarpLen,
                Wt: FormState.values.Wt || 0,
                WvrCode: FormState.values.WvrCode || '',
                WvrName: FormState.values.WvrName || '',
                font: 0,
                isalldata: 0,
                islasttaka: FormState.values.islasttaka || 0,
                ismending: FormState.values.ismending || 0
            };

            // ✅ PAYLOAD
            const payload = {
                ShfCode: 0,
                ChkDate: formatDate(FormState.values.CheckingDate),
                MacGrp: '',
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                yearno: FormState.values.YearNo,
                txntype: 'beam_close_tablet',
                d1: [d1Obj],
                d2: []
            };

            console.log("PAYLOAD:", payload);

            // ✅ API CALL
            const response = await axios.post(
                `${API}/api/add_beam_close`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // ✅ RESPONSE HANDLE
            if (response?.data?.success === false) {
                Alert.alert("Warning", `${response?.data?.message}`);
            } else {
                Alert.alert("Success", `${response?.data?.message}` || 'Saved successfully.');
                resetForm(); // form clear
            }

        } catch (error) {
            console.log("SAVE ERROR:", error);
            Alert.alert("Error", "API Failed");
        }
    };

    const openDrawer = () => setBeamHelpOpen(true);
    const closeDrawer = () => setBeamHelpOpen(false);

    return (
        <>
            <HeaderBarwithBack userName={username} header={'Beam Open/Close'} subHeader={'Manage Your Beam'} />

            {isLandscape ? (
                <ScrollView
                    contentContainerStyle={{
                        paddingBottom: 140, // ✅ enough space for footer
                        paddingHorizontal: 10
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* YEAR + DATE */}
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Select Year *</Text>
                                <SearchableDropdown
                                    key={FormState.values.YearNo}   // 🔥 FORCE RE-RENDER
                                    data={getAllYearData || []}
                                    labelKey="YearName"
                                    valueKey="YearNo"
                                    placeholder="Choose year..."
                                    initialValue={selectedYear}
                                    onSelect={(item) => {
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                YearNo: item?.YearNo
                                            }
                                        }));
                                    }}
                                />
                            </View>

                            {/* <View style={styles.col}>
                            <Text style={styles.label}>Checking Date *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                                <Text>{formatDate(FormState.values.CheckingDate)}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={FormState.values.CheckingDate}
                                    mode="date"
                                    onChange={onChangeDate}
                                />
                            )}
                        </View> */}

                            <View style={styles.col}>
                                <Text style={styles.label}>Checking Date *</Text>

                                <View style={styles.inputRow}>
                                    <Text style={styles.inputText}>
                                        {formatDate(FormState.values.CheckingDate)}
                                    </Text>

                                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                        <Text style={styles.calendarIcon}>📅</Text>
                                    </TouchableOpacity>
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={FormState.values.CheckingDate}
                                        mode="date"
                                        display="default"
                                        onChange={onChangeDate}
                                    />
                                )}
                            </View>
                        </View>

                        {/* MACHINE */}
                        <Text style={styles.label}>Select Machine</Text>
                        {machineLoading ? (
                            <Text style={{ padding: 10 }}>Loading machines...</Text>
                        ) : (
                            <SearchableDropdown
                                data={formattedMachineData}
                                placeholder="Choose machine..."
                                labelKey={["MacName", "MacCode"]}
                                valueKey="MacCode"
                                onSelect={(item) => {
                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            MacCode: item?.MacCode || '',
                                            MacName: item?.MacName || '',
                                            PrpCode: item?.PrpCode || '',
                                            DsnCode: '',
                                            DsnName: '',
                                            BeamNo: '',
                                            WarpLen: ''
                                        }
                                    }));

                                    fetchDesign(item?.MacCode);
                                }}
                            />
                        )}

                        {/* DESIGN */}
                        <Text style={styles.label}>Select Design</Text>
                        {designLoading ? (
                            <Text style={{ padding: 10 }}>Loading designs...</Text>
                        ) : (
                            <SearchableDropdown
                                key={FormState.values.DsnCode}   // 🔥 IMPORTANT
                                data={formattedDesignData}
                                initialValue={selectedDesign}
                                labelKey="displayLabel"
                                valueKey="DsnCode"
                                placeholder="Choose design..."
                                onSelect={(item) => {
                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            DsnCode: item?.DsnCode || '',
                                            DsnName: item?.DsnName || '',
                                            BeamNo: item?.BeamNo || '',
                                            WarpLen: item?.WarpLen || '',
                                            BeamUId: item?.BeamUId || '',
                                            QltWt: item?.QltWt || '',
                                            UId: item?.UId || '',
                                        }
                                    }));
                                }}
                            />
                        )}

                        {/* BEAM */}
                        <View style={styles.row}>

                            {/* BEAM */}
                            <View style={styles.col}>
                                <Text style={styles.label}>Beam *</Text>
                                <View style={styles.beamBox}>
                                    <Text numberOfLines={1}>
                                        <Text>{FormState.values.BeamNo}</Text>
                                    </Text>
                                </View>
                            </View>

                            {/* BEAM BALANCE */}
                            <View style={styles.col}>
                                <Text style={styles.label}>Beam Balance *</Text>
                                <View style={styles.beamBox}>
                                    <Text numberOfLines={1}>
                                        <Text>{FormState.values.WarpLen}</Text>
                                    </Text>
                                </View>
                            </View>

                        </View>

                        {/* BUTTONS */}
                        {/* 👇 BUTTONS NOW OUTSIDE CARD */}
                        {/* <View style={styles.footer}> */}
                        <View style={isLandscape ? styles.footerLandscape : styles.footerPortrait}>
                            <TouchableOpacity
                                style={styles.allBtn}
                                onPress={handleSaveData}
                                disabled={!isConnected}>
                                <Icon name="check-circle" size={16} color="#fff" />
                                <Text style={styles.saveText}>ADD BEAM CLOSE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.allBtn}
                                onPress={resetForm}
                                disabled={!isConnected}>
                                <Icon name="refresh" size={16} color="#fff" />
                                <Text style={styles.saveText}>CLEAR FORM</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.allBtn}
                                // onPress={openDrawer}
                                onPress={() => {
                                    if (!validateFinancialYear()) return;  // ✅ ADD THIS
                                    openDrawer();
                                }}
                                disabled={!isConnected}>
                                <Icon name="download" size={16} color="#fff" />
                                <Text style={styles.saveText}>LOAD BEAM</Text>
                            </TouchableOpacity>
                        </View>

                        <SelectBeam
                            visible={BeamHelp}
                            onClose={closeDrawer}
                            FormState={FormState}
                            setFormState={setFormState}
                            token={token}
                            data={beamList}
                        // onSelect={(item) => {
                        //     setFormState(prev => ({
                        //         ...prev,
                        //         values: {
                        //             ...prev.values,
                        //             DsnCode: item?.DsnCode || '',
                        //             DsnName: item?.DsnName || '',
                        //             BeamNo: item?.BeamNo || '',
                        //             WarpLen: item?.WarpLen || '',
                        //             BeamUId: item?.BeamUId || '',
                        //             QltWt: item?.QltWt || '',
                        //             UId: item?.UId || '',
                        //         }
                        //     }));
                        // }}
                        />
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.container}>

                    <View style={styles.card}>
                        {/* YEAR + DATE */}
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Select Year *</Text>
                                <SearchableDropdown
                                    key={FormState.values.YearNo}   // 🔥 FORCE RE-RENDER
                                    data={getAllYearData || []}
                                    labelKey="YearName"
                                    valueKey="YearNo"
                                    placeholder="Choose year..."
                                    initialValue={selectedYear}
                                    onSelect={(item) => {
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                YearNo: item?.YearNo
                                            }
                                        }));
                                    }}
                                />
                            </View>

                            {/* <View style={styles.col}>
                            <Text style={styles.label}>Checking Date *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                                <Text>{formatDate(FormState.values.CheckingDate)}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={FormState.values.CheckingDate}
                                    mode="date"
                                    onChange={onChangeDate}
                                />
                            )}
                        </View> */}

                            <View style={styles.col}>
                                <Text style={styles.label}>Checking Date *</Text>

                                <View style={styles.inputRow}>
                                    <Text style={styles.inputText}>
                                        {formatDate(FormState.values.CheckingDate)}
                                    </Text>

                                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                        <Text style={styles.calendarIcon}>📅</Text>
                                    </TouchableOpacity>
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={FormState.values.CheckingDate}
                                        mode="date"
                                        display="default"
                                        onChange={onChangeDate}
                                    />
                                )}
                            </View>
                        </View>

                        {/* MACHINE */}
                        <Text style={styles.label}>Select Machine</Text>
                        {machineLoading ? (
                            <Text style={{ padding: 10 }}>Loading machines...</Text>
                        ) : (
                            <SearchableDropdown
                                data={formattedMachineData}
                                placeholder="Choose machine..."
                                labelKey={["MacName", "MacCode"]}
                                valueKey="MacCode"
                                onSelect={(item) => {
                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            MacCode: item?.MacCode || '',
                                            MacName: item?.MacName || '',
                                            PrpCode: item?.PrpCode || '',
                                            DsnCode: '',
                                            DsnName: '',
                                            BeamNo: '',
                                            WarpLen: ''
                                        }
                                    }));

                                    fetchDesign(item?.MacCode);
                                }}
                            />
                        )}

                        {/* DESIGN */}
                        <Text style={styles.label}>Select Design</Text>
                        {designLoading ? (
                            <Text style={{ padding: 10 }}>Loading designs...</Text>
                        ) : (
                            <SearchableDropdown
                                key={FormState.values.DsnCode}   // 🔥 IMPORTANT
                                data={formattedDesignData}
                                initialValue={selectedDesign}
                                labelKey="displayLabel"
                                valueKey="DsnCode"
                                placeholder="Choose design..."
                                onSelect={(item) => {
                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            DsnCode: item?.DsnCode || '',
                                            DsnName: item?.DsnName || '',
                                            BeamNo: item?.BeamNo || '',
                                            WarpLen: item?.WarpLen || '',
                                            BeamUId: item?.BeamUId || '',
                                            QltWt: item?.QltWt || '',
                                            UId: item?.UId || '',
                                        }
                                    }));
                                }}
                            />
                        )}

                        {/* BEAM */}
                        <View style={styles.row}>

                            {/* BEAM */}
                            <View style={styles.col}>
                                <Text style={styles.label}>Beam *</Text>
                                <View style={styles.beamBox}>
                                    <Text>{FormState.values.BeamNo}</Text>
                                </View>
                            </View>

                            {/* BEAM BALANCE */}
                            <View style={styles.col}>
                                <Text style={styles.label}>Beam Balance *</Text>
                                <View style={styles.beamBox}>
                                    <Text>{FormState.values.WarpLen}</Text>
                                </View>
                            </View>

                        </View>

                        {/* BUTTONS */}
                        {/* 👇 BUTTONS NOW OUTSIDE CARD */}
                        {/* <View style={styles.footer}> */}
                        <View style={isLandscape ? styles.footerLandscape : styles.footerPortrait}>
                            <TouchableOpacity
                                style={styles.allBtn}
                                onPress={handleSaveData}
                                disabled={!isConnected}>
                                <Icon name="check-circle" size={16} color="#fff" />
                                <Text style={styles.saveText}>ADD BEAM CLOSE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.allBtn}
                                onPress={resetForm}
                                disabled={!isConnected}>
                                <Icon name="refresh" size={16} color="#fff" />
                                <Text style={styles.saveText}>CLEAR FORM</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.allBtn}
                                // onPress={openDrawer}
                                onPress={() => {
                                    if (!validateFinancialYear()) return;  // ✅ ADD THIS
                                    openDrawer();
                                }}
                                disabled={!isConnected}>
                                <Icon name="download" size={16} color="#fff" />
                                <Text style={styles.saveText}>LOAD BEAM</Text>
                            </TouchableOpacity>
                        </View>

                        <SelectBeam
                            visible={BeamHelp}
                            onClose={closeDrawer}
                            FormState={FormState}
                            setFormState={setFormState}
                            token={token}
                            data={beamList}
                        // onSelect={(item) => {
                        //     setFormState(prev => ({
                        //         ...prev,
                        //         values: {
                        //             ...prev.values,
                        //             DsnCode: item?.DsnCode || '',
                        //             DsnName: item?.DsnName || '',
                        //             BeamNo: item?.BeamNo || '',
                        //             WarpLen: item?.WarpLen || '',
                        //             BeamUId: item?.BeamUId || '',
                        //             QltWt: item?.QltWt || '',
                        //             UId: item?.UId || '',
                        //         }
                        //     }));
                        // }}
                        />
                    </View>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        // paddingBottom: 80,
        backgroundColor: '#F5F7FA'
    },

    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        elevation: 3
    },

    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },

    col: {
        width: '48%',
    },

    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10,
        color: '#333'
    },

    input: {
        backgroundColor: '#F6F7FA',
        borderRadius: 8,
        height: 48,              // 🔥 FIXED HEIGHT
        justifyContent: 'center',
        paddingHorizontal: 12
    },

    beamBox: {
        backgroundColor: '#eee',
        borderRadius: 8,
        padding: 12,
        minHeight: 50,   // 🔥 consistent height
        justifyContent: 'center'
    },

    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 8   // ✅ spacing between buttons
    },

    allBtn: {
        flex: 1,  // ✅ equal width for all buttons
        backgroundColor: theme.BRAND_GRADIENT_START,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
        elevation: 2
    },

    saveText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center'
    },

    footer: {
        flexDirection: 'row',
        // position: 'absolute',
        // bottom: 0,
        // left: 0,
        // right: 0,
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#ddd',
        gap: 8,
        borderRadius: 12,
        marginTop: 20
    },

    footerLandscape: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#ddd',
        gap: 8,
        borderRadius: 12,
        marginTop: 20
    },

    footerPortrait: {
        flexDirection: 'row',
        position: 'absolute',   // ✅ FIXED bottom
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderRadius: 12,
        borderColor: '#ddd',
        gap: 8,
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F6F7FA',
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },

    inputText: {
        fontSize: 14,
        color: '#333'
    },

    calendarIcon: {
        fontSize: 20
    },
});

export default BeamClose;