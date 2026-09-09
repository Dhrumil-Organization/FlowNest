import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Animated,
    Alert,
    BackHandler,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// import theme from '../../android/app/src/theme';
import { yarnmanagementsystemstyle } from '@/common/Style';
import HeaderBarwithBack from '@/components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';

import PartyDropdown from '@/Shared/PartyDropdown';
import PartyDropdownYarn from '@/Shared/PartyDropdownYarn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import CustomDrawer from './CustomDrawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const YARN_UI = {
    primary: '#087F92',
    primaryDark: '#056C7D',
    primarySoft: '#EAF7F9',
    ink: '#18212F',
    muted: '#667085',
    line: '#E4E7EC',
    surface: '#FFFFFF',
    canvas: '#F5F7F9',
    danger: '#D64545',
};


const SkeletonBlock = ({ width = '100%', height = 16, radius = 8, style = {} }) => (
    <View
        style={[
            {
                width,
                height,
                borderRadius: radius,
                backgroundColor: '#E7EBEF',
                overflow: 'hidden',
            },
            style,
        ]}
    />
);

const YarnSkeleton = ({ variant = 'main' }) => {
    const shimmer = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 1100,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [shimmer]);

    const translateX = shimmer.interpolate({
        inputRange: [-1, 1],
        outputRange: [-260, 260],
    });

    const Shimmer = () => (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 180,
                opacity: 0.65,
                transform: [{ translateX }],
                backgroundColor: '#FFFFFF',
            }}
        />
    );

    const SkeletonCard = ({ height = 92, marginHorizontal = 0 }) => (
        <View style={{
            marginHorizontal,
            marginBottom: 12,
            height,
            borderRadius: 18,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E5E9ED',
            padding: 14,
            overflow: 'hidden',
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <SkeletonBlock width={52} height={52} radius={15} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <SkeletonBlock width="70%" height={17} radius={8} />
                    <SkeletonBlock width="32%" height={13} radius={6} style={{ marginTop: 10 }} />
                </View>
                <SkeletonBlock width={46} height={46} radius={23} style={{ marginLeft: 10 }} />
            </View>
            <Shimmer />
        </View>
    );

    if (variant === 'sublist' || variant === 'browse') {
        return (
            <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </View>
        );
    }

    if (variant === 'party') {
        return (
            <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
                <SkeletonCard height={82} />
                <SkeletonCard height={82} />
                <SkeletonCard height={82} />
            </View>
        );
    }

    if (variant === 'subform') {
        return (
            <View style={{ paddingBottom: 100, backgroundColor: YARN_UI.canvas }}>
                <View style={{
                    margin: 14,
                    padding: 16,
                    borderRadius: 18,
                    backgroundColor: '#EAF7F9',
                    overflow: 'hidden',
                    minHeight: 92,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SkeletonBlock width={42} height={42} radius={21} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <SkeletonBlock width="38%" height={18} radius={7} />
                            <SkeletonBlock width="88%" height={13} radius={6} style={{ marginTop: 9 }} />
                            <SkeletonBlock width="62%" height={13} radius={6} style={{ marginTop: 6 }} />
                        </View>
                    </View>
                    <Shimmer />
                </View>

                <View style={{
                    marginHorizontal: 14,
                    padding: 16,
                    borderRadius: 18,
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#E5E9ED',
                    overflow: 'hidden',
                }}>
                    <SkeletonBlock width="42%" height={13} radius={6} />
                    <SkeletonBlock width="100%" height={52} radius={11} style={{ marginTop: 9, marginBottom: 20 }} />

                    <SkeletonBlock width="20%" height={13} radius={6} />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 9, marginBottom: 20 }}>
                        <SkeletonBlock width="66%" height={52} radius={11} />
                        <SkeletonBlock width="34%" height={52} radius={11} />
                    </View>

                    {[
                        ['28%', 'Count'],
                        ['22%', 'Ply'],
                        ['34%', 'Yarn Type'],
                        ['20%', 'Other'],
                        ['38%', 'Sub Item Name'],
                        ['20%', 'Denier'],
                    ].map(([labelWidth], index) => (
                        <View key={index} style={{ marginBottom: 20 }}>
                            <SkeletonBlock width={labelWidth} height={13} radius={6} />
                            <SkeletonBlock width="100%" height={52} radius={11} style={{ marginTop: 9 }} />
                        </View>
                    ))}
                </View>

                <Shimmer />
            </View>
        );
    }

    if (variant === 'form') {
        return (
            <View style={{ padding: 14 }}>
                <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E5E9ED',
                    overflow: 'hidden',
                }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <View key={i} style={{ marginBottom: 18 }}>
                            <SkeletonBlock width={i % 2 ? '38%' : '30%'} height={12} radius={6} />
                            <SkeletonBlock width="100%" height={46} radius={10} style={{ marginTop: 8 }} />
                        </View>
                    ))}
                    <Shimmer />
                </View>
            </View>
        );
    }

    return (
        <View style={{ paddingTop: 2 }}>
            <SkeletonCard marginHorizontal={0} />
            <SkeletonCard marginHorizontal={0} />
            <SkeletonCard marginHorizontal={0} />
        </View>
    );
};

const yarnUi = StyleSheet.create({
    screen: { flex: 1, backgroundColor: YARN_UI.canvas },
    sectionCard: {
        marginHorizontal: 14, marginTop: 14, backgroundColor: YARN_UI.surface,
        borderRadius: 18, borderWidth: 1, borderColor: '#E8ECEF',
        padding: 16, elevation: 2, shadowColor: '#101828',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    },
    sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionIcon: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: YARN_UI.ink },
    sectionSub: { marginTop: 2, fontSize: 12.5, color: YARN_UI.muted },
    browseHeader: {
        minHeight: 74, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
        backgroundColor: YARN_UI.primary,
    },
    headerBack: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center', justifyContent: 'center',
    },
    browseHeaderText: { marginLeft: 12, flex: 1 },
    browseTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    browseSubTitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12.5, marginTop: 2 },
    parentCard: {
        margin: 14, marginBottom: 4, padding: 14, borderRadius: 16,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E7EC',
        flexDirection: 'row', alignItems: 'center',
    },
    parentCode: {
        backgroundColor: YARN_UI.primarySoft, color: YARN_UI.primaryDark,
        fontWeight: '800', fontSize: 13, paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 9, overflow: 'hidden',
    },
    parentName: { flex: 1, marginLeft: 11, color: YARN_UI.ink, fontSize: 15, fontWeight: '700' },
    listHead: {
        marginHorizontal: 16, marginTop: 15, marginBottom: 8,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    listTitle: { fontSize: 16, fontWeight: '800', color: YARN_UI.ink },
    countPill: {
        minWidth: 28, height: 28, borderRadius: 14, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    },
    countText: { color: YARN_UI.primaryDark, fontWeight: '800', fontSize: 12 },
    subCard: {
        marginHorizontal: 14, marginBottom: 10, backgroundColor: '#fff',
        borderRadius: 16, borderWidth: 1, borderColor: '#E5E9ED',
        padding: 14, flexDirection: 'row', alignItems: 'center',
        elevation: 1, shadowColor: '#101828', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4,
    },
    subIcon: {
        width: 42, height: 42, borderRadius: 13, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    subName: { color: YARN_UI.ink, fontSize: 14, fontWeight: '800', lineHeight: 21 },
    codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    codeChip: {
        color: YARN_UI.primaryDark, backgroundColor: '#EFF8FA', fontSize: 12,
        fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 7, overflow: 'hidden',
    },
    mapButton: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: YARN_UI.primary,
        alignItems: 'center', justifyContent: 'center', marginLeft: 10,
    },
    emptyState: {
        margin: 16, paddingVertical: 38, paddingHorizontal: 20, borderRadius: 18,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6EAEE',
        alignItems: 'center',
    },
    emptyIcon: {
        width: 58, height: 58, borderRadius: 29, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: YARN_UI.ink },
    emptySub: { fontSize: 13, color: YARN_UI.muted, marginTop: 5, textAlign: 'center' },
    bottomBar: {
        paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#E7EAEE', flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    secondaryBtn: {
        minHeight: 46, paddingHorizontal: 20, borderRadius: 12,
        borderWidth: 1, borderColor: '#D0D5DD', backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    },
    secondaryText: { color: '#344054', fontWeight: '800', fontSize: 14 },
    actionBackdrop: {
        flex: 1, backgroundColor: 'rgba(15,23,42,0.52)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    },
    grabber: {
        width: 42, height: 4, borderRadius: 2, backgroundColor: '#D0D5DD',
        alignSelf: 'center', marginBottom: 15,
    },
    actionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    actionHeadIcon: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    actionTitle: { fontSize: 19, fontWeight: '800', color: YARN_UI.ink },
    actionItemName: { fontSize: 12.5, color: YARN_UI.muted, marginTop: 2 },
    actionRow: {
        minHeight: 54, flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#EEF0F2',
    },
    actionIcon: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: YARN_UI.primarySoft,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    actionLabel: { fontSize: 15, fontWeight: '700', color: YARN_UI.ink },
    dangerIcon: { backgroundColor: '#FDECEC' },
    dangerText: { color: YARN_UI.danger },
    actionCancel: {
        minHeight: 48, borderRadius: 12, marginTop: 10, backgroundColor: '#F2F4F7',
        alignItems: 'center', justifyContent: 'center',
    },
    screenHeader: {
        minHeight: 64,
        marginHorizontal: -1,
        marginBottom: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: YARN_UI.primary,
        borderRadius: 12,
    },
    screenBackButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    screenHeaderTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
    },
    screenHeaderSub: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 11.5,
        marginTop: 2,
    },
    formIntro: {
        marginHorizontal: 14, marginTop: 12, marginBottom: 2, padding: 14,
        borderRadius: 16, backgroundColor: YARN_UI.primarySoft,
        flexDirection: 'row', alignItems: 'center',
    },
    formIntroTitle: { color: YARN_UI.ink, fontSize: 16, fontWeight: '800' },
    formIntroSub: { color: YARN_UI.muted, fontSize: 12.5, marginTop: 2 },
});

interface Props {
    token: string;
    username: string;
}

type GridItem = {
    srNo: number;
    CartonNo: string;
    design: string;
};


const CARD_COLORS = [
    ["#4A6FA5", "#5C85D1"]
];

const CARD_COLORS1 = [
    ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
    ["#3A7BD5", "#5A9BD5"],
];

const YarnManagementContext = React.createContext<any>(null);
const useYarnManagement = () => React.useContext(YarnManagementContext);


const SpunTab: React.FC = () => {
    const ctx = useYarnManagement();
    const {
        isLoading,
        setIsLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        subItemTab,
        setSubItemTab,
        subItemParent,
        setSubItemParent,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        goToSubItemMainList,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        fetchSubItemList,
        handleOpenSubItemForm,
        handleSubItemModify,
        handleSubItemDelete,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,
    } = ctx;
    return (
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

                    <ScrollView
                        style={{ marginTop: 10 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <YarnSkeleton variant="main" />
                        ) : filteredData.length === 0 ? (
                            <View style={yarnmanagementsystemstyle.emptyBox}>
                                <Text style={yarnmanagementsystemstyle.emptyText}>
                                    No items yet..
                                </Text>
                                <Text style={yarnmanagementsystemstyle.emptySubText}>
                                    Add one to get started!
                                </Text>
                            </View>
                        ) : (
                            // data.map((item, index) => (
                            filteredData.map((item, index) => (
                                <View key={item.id || index} style={yarnmanagementsystemstyle.cardWrapper}>

                                    <LinearGradient
                                        colors={CARD_COLORS[index % CARD_COLORS.length]}
                                        style={yarnmanagementsystemstyle.itemCard1}
                                    >
                                        <View
                                            style={[
                                                yarnmanagementsystemstyle.cardHeader,
                                                { alignItems: 'center' }
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    yarnmanagementsystemstyle.itmTitle,
                                                    { flex: 1, marginRight: 8 }
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                            >
                                                {item.WNameCode}
                                            </Text>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 7
                                                }}
                                            >
                                                <View style={[
                                                    yarnmanagementsystemstyle.categoryBadge,
                                                    item.WYarnType == '1'
                                                        ? yarnmanagementsystemstyle.spunBadge
                                                        : yarnmanagementsystemstyle.filamentBadge
                                                ]}>
                                                    <Text
                                                        style={yarnmanagementsystemstyle.categoryBadgeText}
                                                        numberOfLines={1}
                                                    >
                                                        {item.mitmcode}
                                                    </Text>
                                                </View>

                                                {/* All card actions are inside the three-dot menu */}
                                                <TouchableOpacity
                                                    activeOpacity={0.75}
                                                    onPress={() => handleCardMenu(item)}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: 'rgba(255,255,255,0.18)',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Icon name="more-vert" size={25} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <View style={yarnmanagementsystemstyle.divider} />
                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Blend: <Text style={yarnmanagementsystemstyle.infoValue}>{item.BlendNames}</Text>
                                        </Text>

                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Ply: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WPly}</Text>
                                        </Text>

                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Other: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WOther}</Text>
                                        </Text>

                                    </LinearGradient>

                                </View>
                            ))
                        )}
                    </ScrollView>
                </>
            )}

            {showSpunCard && (
                <View style={{ flex: 1 }}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={{ marginTop: 10 }}
                            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
                        >
                            <View style={[yarnmanagementsystemstyle.formCard, { flex: 1 }]}>

                                <Text style={yarnmanagementsystemstyle.formTitle}>
                                    {isModifyMode ? 'Modify Spun Main Item' : 'Add Spun Main Item'}
                                </Text>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Blend <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <PartyDropdownYarn
                                        data={blenddata}
                                        placeholder="Choose blend..."
                                        labelKey={["name", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedblend ?? []}
                                        selected={selectedblend ?? []}
                                        type="blend"
                                        multiple={true}
                                        onSelect={(items) => {
                                            console.log("selected items:", items);
                                            setselectedblend(items);

                                            const selectedIds = items.map(i => i.id);
                                            const selectedNames = items.map(i => i.name);

                                            setSpunForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    blend_id: selectedIds,   // array
                                                    blend: selectedNames     // array
                                                };

                                                return {
                                                    ...updated,
                                                    linkitmcode: buildMainItem(updated)
                                                };
                                            });
                                        }}
                                    />
                                    {/* <SearchableDropdown
                                                    data={blenddata}
                                                    // labelKey="PrpName"
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    placeholder="Choose blend..."
                                                    pageSize={10}
                                                    initialValue={selectedblend ?? null}
                                                    onSelect={(items) => {
                                                        // items will be an array of selected objects
                                                        setselectedblend(items);
                                                        // Extract PrpCode values and pass as array to parent
                                                        const selectedCodes = items.map(item => item.id);
                                                        setSpunForm(prev => ({ ...prev, blend_id: selectedCodes }));
                                                    }}
                                                    multiple={true} // Enable multi-select
                                                    emptyMessage="No properties available"
                                                /> */}
                                </View>

                                {/* Count */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Count Type <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <PartyDropdown
                                        data={countdata}
                                        placeholder="Choose blend..."
                                        labelKey={["name", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedcount ?? null}
                                        selected={selectedcount ?? null}
                                        type="count"
                                        onSelect={(item) => {
                                            setselectedcount(item);
                                            setSpunForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    count_id: item?.id || '',
                                                    count: item?.name || '',
                                                    formula: item?.formula || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: buildMainItem(updated),
                                                    denier: calculateDenier(updated, item?.formula)
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Count <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Count..."
                                            value={spunForm.count_no || ''}
                                            editable={true}
                                            // onChangeText={(text) => {
                                            //     setSpunForm(prev => ({
                                            //         ...prev,
                                            //         count: text
                                            //     }));
                                            // }}
                                            onChangeText={(text) => {
                                                const regex = /^[0-9]*$/;

                                                if (!regex.test(text)) return;

                                                // if (text !== '' && parseInt(text, 10) > 100) return;

                                                setSpunForm(prev => {
                                                    const updated = {
                                                        ...prev,
                                                        count_no: text
                                                    };

                                                    // 👇 calculation sirf textbox value se
                                                    return {
                                                        ...updated,
                                                        denier: calculateDenier(updated, prev.formula),
                                                        linkitmcode: buildMainItem(updated)
                                                    };
                                                });

                                            }}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Ply */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Ply <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <PartyDropdown
                                        data={plydata}
                                        placeholder="Choose Ply..."
                                        labelKey={["ply", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedply ?? null}
                                        selected={selectedply ?? null}
                                        type="ply"
                                        onSelect={(item) => {
                                            setselectedply(item);
                                            setSpunForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    ply_id: item?.id || '',
                                                    ply: item?.ply || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: buildMainItem(updated),
                                                    denier: calculateDenier(updated, prev.formula)
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Other
                                        {/* <Text style={{ color: 'red' }}>*</Text> */}
                                    </Text>
                                    {/* <PartyDropdown
                                                    data={othersdata}
                                                    placeholder="Choose Others..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedothers ?? null}
                                                    selected={selectedothers ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedothers(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                other_id: item?.id || '',
                                                                name: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                            };
                                                        });
                                                    }}
                                                /> */}
                                    {/* <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput
                                                        placeholder="Other..."
                                                        value={spunForm.others || ''}
                                                        editable={true}
                                                        onChangeText={(text) => {
                                                            setSpunForm(prev => ({
                                                                ...prev,
                                                                others: text
                                                            }));

                                                        }}
                                                        style={{
                                                            color: '#000',
                                                            opacity: 1,
                                                            height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                                        }}
                                                    />
                                                </View> */}
                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Other..."
                                            value={spunForm.others || ''}
                                            editable={true}
                                            onChangeText={(text) =>
                                                // setFilamentForm(prev => ({
                                                //     ...prev,
                                                //     others: text
                                                // }))
                                                setSpunForm(prev => {
                                                    const updated = {
                                                        ...prev,
                                                        others: text
                                                    };
                                                    return {
                                                        ...updated,
                                                        // denier: calculateDenier(updated),
                                                        linkitmcode: buildMainItem(updated),
                                                    };
                                                })
                                            }
                                            maxLength={200}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Main Item */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Main Item <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Main Item..."
                                            value={spunForm.linkitmcode || ''}
                                            editable={true}
                                            onChangeText={(text) => {
                                                setSpunForm(prev => ({
                                                    ...prev,
                                                    linkitmcode: text
                                                }));

                                            }}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Denier */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Denier <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Denier..."
                                            value={spunForm.denier}
                                            editable={false}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Link Item */}
                                {/* <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Link Item
                                                </Text>

                                                <PartyDropdown
                                                    data={itemdata}
                                                    placeholder="Choose Item..."
                                                    labelKey={["ItmName", "ItmCode"]}
                                                    valueKey="ItmCode"
                                                    pageSize={12}
                                                    initialValue={selecteditem ?? null}
                                                    selected={selecteditem ?? null}
                                                    type="Item1"
                                                    onSelect={(item) => {
                                                        setselecteditem(item);
                                                        setSpunForm(prev => ({
                                                            ...prev,
                                                            // maincode:item?.
                                                            ItmCode: item?.ItmCode || "",
                                                        }));
                                                    }}
                                                />
                                            </View> */}

                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        padding: 15,
                        backgroundColor: '#fff',
                        borderTopWidth: 1,
                        borderColor: '#eee'
                    }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#ccc',
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                                borderRadius: 6,
                                marginRight: 10
                            }}
                            onPress={goToListScreen}
                        >
                            <Text style={{ fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#007EA7',
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                                borderRadius: 6
                            }}
                            // onPress={() => {
                            //     handleaddspun();
                            //     console.log("Add Item", spunForm);
                            // }}
                            onPress={() => {
                                // if (!selecteditem || !selecteditem.ItmCode) {
                                //     Alert.alert(
                                //         "Confirmation",
                                //         "Link item is not selected. Do you want to create a new item?",
                                //         [
                                //             {
                                //                 text: "Cancel",
                                //                 style: "cancel"
                                //             },
                                //             {
                                //                 text: "OK",
                                //                 onPress: () => {
                                //                     handleaddspun();
                                //                 }
                                //             }
                                //         ]
                                //     );
                                //     return;
                                // }
                                if (isModifyMode) {
                                    handleModifySpun();
                                } else {
                                    handleaddspun();
                                }
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                {isModifyMode ? 'Modify Spun Item' : 'Add Spun Item'}
                            </Text>
                        </TouchableOpacity>

                    </View>

                </View>
            )}
        </>
    );
};


const FilamentTab: React.FC = () => {
    const ctx = useYarnManagement();
    const {
        isLoading,
        setIsLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        goBackFromSubItemList,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,
    } = ctx;
    return (
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

                    <ScrollView
                        style={{ marginTop: 10 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <YarnSkeleton variant="main" />
                        ) : filteredData.length === 0 ? (
                            <View style={yarnmanagementsystemstyle.emptyBox}>
                                <Text style={yarnmanagementsystemstyle.emptyText}>
                                    No items yet..
                                </Text>
                                <Text style={yarnmanagementsystemstyle.emptySubText}>
                                    Add one to get started!
                                </Text>
                            </View>
                        ) : (
                            // data.map((item, index) => (
                            filteredData.map((item, index) => (
                                <View key={item.id || index} style={yarnmanagementsystemstyle.cardWrapper}>

                                    <LinearGradient
                                        colors={CARD_COLORS[index % CARD_COLORS.length]}
                                        style={yarnmanagementsystemstyle.itemCard1}
                                    >

                                        {/* 🔹 Header */}
                                        <View
                                            style={[
                                                yarnmanagementsystemstyle.cardHeader,
                                                { alignItems: 'center' }
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    yarnmanagementsystemstyle.itmTitle,
                                                    { flex: 1, marginRight: 8 }
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                            >
                                                {item.WNameCode}
                                            </Text>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 7
                                                }}
                                            >
                                                <View style={[
                                                    yarnmanagementsystemstyle.categoryBadge,
                                                    item.WYarnType == '1'
                                                        ? yarnmanagementsystemstyle.spunBadge
                                                        : yarnmanagementsystemstyle.filamentBadge
                                                ]}>
                                                    <Text
                                                        style={yarnmanagementsystemstyle.categoryBadgeText}
                                                        numberOfLines={1}
                                                    >
                                                        {item.mitmcode}
                                                    </Text>
                                                </View>

                                                {/* All card actions are inside the three-dot menu */}
                                                <TouchableOpacity
                                                    activeOpacity={0.75}
                                                    onPress={() => handleCardMenu(item)}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: 'rgba(255,255,255,0.18)',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Icon name="more-vert" size={25} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* 🔹 Divider */}
                                        <View style={yarnmanagementsystemstyle.divider} />

                                        {/* 🔹 Info */}
                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Blend: <Text style={yarnmanagementsystemstyle.infoValue}>{item.BlendNames}</Text>
                                        </Text>

                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Ply: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WPly}</Text>
                                        </Text>

                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                            Other: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WOther}</Text>
                                        </Text>

                                        {/* 🔹 Button */}

                                    </LinearGradient>

                                </View>
                            ))
                        )}
                    </ScrollView>

                </>
            )}

            {showFilamentCard && (
                <View style={{ flex: 1 }}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={{ marginTop: 0 }}
                            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
                        >
                            <View style={[yarnmanagementsystemstyle.formCard, { flex: 1 }]}>

                                {/* 🔹 Heading */}
                                <Text style={yarnmanagementsystemstyle.formTitle}>
                                    {isModifyMode ? 'Modify Filament Main Item' : 'Add Filament Main Item'}
                                </Text>

                                {/* <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Blend <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <PartyDropdown
                                                    data={blenddata}
                                                    placeholder="Choose blend..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentblend ?? null}
                                                    selected={selectedfilamentblend ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedfilamentblend(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                blend_id: item?.id || '',
                                                                blend: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                // linkitmcode: buildMainItem(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View> */}

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Blend <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <PartyDropdownYarn
                                        data={blenddata}
                                        placeholder="Choose blend..."
                                        labelKey={["name", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedfilamentblend ?? []}
                                        selected={selectedfilamentblend ?? []}
                                        type="blend"
                                        multiple={true}
                                        onSelect={(items) => {
                                            console.log("selected items:", items);
                                            setselectedblend(items);

                                            const selectedIds = items.map(i => i.id);
                                            const selectedNames = items.map(i => i.name);

                                            setFilamentForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    blend_id: selectedIds,   // array
                                                    blend: selectedNames     // array
                                                };

                                                return {
                                                    ...updated,
                                                    linkitmcode: filamentbuildMainItem(updated)
                                                };
                                            });
                                        }}
                                    />
                                    {/* <SearchableDropdown
                                                    data={blenddata}
                                                    // labelKey="PrpName"
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    placeholder="Choose blend..."
                                                    pageSize={10}
                                                    initialValue={selectedblend ?? null}
                                                    onSelect={(items) => {
                                                        // items will be an array of selected objects
                                                        setselectedblend(items);
                                                        // Extract PrpCode values and pass as array to parent
                                                        const selectedCodes = items.map(item => item.id);
                                                        setSpunForm(prev => ({ ...prev, blend_id: selectedCodes }));
                                                    }}
                                                    multiple={true} // Enable multi-select
                                                    emptyMessage="No properties available"
                                                /> */}
                                </View>

                                {/* Count */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Count Type<Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <PartyDropdown
                                        data={countdata}
                                        placeholder="Choose blend..."
                                        labelKey={["name", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedfilamentcount ?? null}
                                        selected={selectedfilamentcount ?? null}
                                        type="count"
                                        onSelect={(item) => {
                                            setselectedfilamentcount(item);
                                            setFilamentForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    count_id: item?.id || '',
                                                    count: item?.name || '',
                                                    formula: item?.formula || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: filamentbuildMainItem(updated),
                                                    denier: calculatefilamentDenier(updated, item?.formula)
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Count <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Count..."
                                            value={filamentForm.count_no || ''}
                                            editable={true}
                                            // onChangeText={(text) => {
                                            //     setSpunForm(prev => ({
                                            //         ...prev,
                                            //         count: text
                                            //     }));
                                            // }}
                                            onChangeText={(text) => {
                                                const regex = /^[0-9]*$/;

                                                if (!regex.test(text)) return;

                                                // if (text !== '' && parseInt(text, 10) > 100) return;

                                                setFilamentForm(prev => {
                                                    const updated = {
                                                        ...prev,
                                                        count_no: text
                                                    };

                                                    // 👇 calculation sirf textbox value se
                                                    return {
                                                        ...updated,
                                                        linkitmcode: filamentbuildMainItem(updated),
                                                        denier: calculatefilamentDenier(updated, prev.formula)
                                                    };
                                                });

                                            }}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Ply */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Ply <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <PartyDropdown
                                        data={plydata}
                                        placeholder="Choose Ply..."
                                        labelKey={["ply", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedfilamentply ?? null}
                                        selected={selectedfilamentply ?? null}
                                        type="ply"
                                        onSelect={(item) => {
                                            setselectedfilamentply(item);
                                            setFilamentForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    ply_id: item?.id || '',
                                                    ply: item?.ply || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: filamentbuildMainItem(updated),
                                                    denier: calculatefilamentDenier(updated, prev.formula)
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Filament Type <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <PartyDropdown
                                        data={typedata}
                                        placeholder="Choose Type..."
                                        labelKey={["type", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedtype ?? null}
                                        selected={selectedtype ?? null}
                                        type="type"
                                        onSelect={(item) => {
                                            setselectedtype(item);
                                            setFilamentForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    type_id: item?.id || '',
                                                    type: item?.type || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: filamentbuildMainItem(updated),
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Lustre <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <PartyDropdown
                                        data={lustredata}
                                        placeholder="Choose lustre..."
                                        labelKey={["lustre", "id"]}
                                        valueKey="id"
                                        pageSize={12}
                                        initialValue={selectedlustre ?? null}
                                        selected={selectedlustre ?? null}
                                        type="lustre"
                                        onSelect={(item) => {
                                            setselectedlustre(item);
                                            setFilamentForm(prev => {
                                                const updated = {
                                                    ...prev,
                                                    lustre_id: item?.id || '',
                                                    lustre: item?.lustre || ''
                                                };
                                                return {
                                                    ...updated,
                                                    linkitmcode: filamentbuildMainItem(updated),
                                                };
                                            });
                                        }}
                                    />
                                </View>

                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Other
                                        {/* <Text style={{ color: 'red' }}>*</Text> */}
                                    </Text>
                                    {/* <PartyDropdown
                                                    data={othersdata}
                                                    placeholder="Choose Others..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedothers ?? null}
                                                    selected={selectedothers ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedothers(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                other_id: item?.id || '',
                                                                name: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                            };
                                                        });
                                                    }}
                                                /> */}
                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Other..."
                                            value={filamentForm.others || ''}
                                            editable={true}
                                            onChangeText={(text) =>
                                                // setFilamentForm(prev => ({
                                                //     ...prev,
                                                //     others: text
                                                // }))
                                                setFilamentForm(prev => {
                                                    const updated = {
                                                        ...prev,
                                                        others: text
                                                    };
                                                    return {
                                                        ...updated,
                                                        // denier: calculateDenier(updated),
                                                        linkitmcode: filamentbuildMainItem(updated)
                                                    };
                                                })
                                            }
                                            maxLength={200}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Main Item */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Main Item <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Main Item..."
                                            value={filamentForm.linkitmcode || ''}
                                            editable={true}
                                            onChangeText={(text) =>
                                                setFilamentForm(prev => ({
                                                    ...prev,
                                                    linkitmcode: text
                                                }))
                                            }
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Denier */}
                                <View style={yarnmanagementsystemstyle.inputGroup}>
                                    <Text style={yarnmanagementsystemstyle.label}>
                                        Denier <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={yarnmanagementsystemstyle.inputBox}>
                                        <TextInput
                                            placeholder="Denier..."
                                            value={filamentForm.denier}
                                            editable={false}
                                            style={{
                                                color: '#000',
                                                opacity: 1,
                                                height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Link Item */}
                                {/* <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Link Item
                                                </Text>
                                                <PartyDropdown
                                                    data={itemdata}
                                                    placeholder="Choose Item..."
                                                    labelKey={["ItmName", "ItmCode"]}
                                                    valueKey="ItmCode"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentitem ?? null}
                                                    selected={selectedfilamentitem ?? null}
                                                    type="Item1"
                                                    onSelect={(item) => {
                                                        setselectedfilamentitem(item);
                                                        setFilamentForm(prev => ({
                                                            ...prev,
                                                            // maincode:item?.
                                                            ItmCode: item?.ItmCode || "",
                                                        }));
                                                    }}
                                                />
                                            </View> */}

                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        padding: 15,
                        backgroundColor: '#fff',
                        borderTopWidth: 1,
                        borderColor: '#eee'
                    }}>

                        {/* Cancel */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#ccc',
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                                borderRadius: 6,
                                marginRight: 10
                            }}
                            onPress={goToListScreen}
                        >
                            <Text style={{ fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>

                        {/* Add */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#007EA7',
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                                borderRadius: 6
                            }}
                            // onPress={() => {
                            //     handleaddfilament();
                            //     console.log("Add Filament Item", spunForm);
                            // }}

                            onPress={() => {
                                // if (!selectedfilamentitem || !selectedfilamentitem.ItmCode) {
                                //     Alert.alert(
                                //         "Confirmation",
                                //         "Link item is not selected. Do you want to create a new item?",
                                //         [
                                //             {
                                //                 text: "Cancel",
                                //                 style: "cancel"
                                //             },
                                //             {
                                //                 text: "OK",
                                //                 onPress: () => {
                                //                     handleaddfilament();
                                //                 }
                                //             }
                                //         ]
                                //     );
                                //     return;
                                // }
                                if (isModifyMode) {
                                    handleModifyFilament();
                                } else {
                                    handleaddfilament();
                                }
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                {isModifyMode ? 'Modify Filament Item' : 'Add Filament Item'}
                            </Text>
                        </TouchableOpacity>

                    </View>
                </View>

            )}
        </>
    );
};


const SubItemCreateTab: React.FC = () => {
    const ctx = useYarnManagement();
    const {
        isLoading,
        setIsLoading,
        subItemOpeningLoading,
        setSubItemOpeningLoading,
        subItemFormLoading,
        subItemSaveLoading,
        setSubItemSaveLoading,
        deleteLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        subItemTab,
        setSubItemTab,
        subItemParent,
        handleOpenSubItemForm,
        handleSubItemModify,
        handleSubItemModifyShow,
        handleSubItemDelete,
        fetchSubItemList,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        goToSubItemMainList,
        goBackFromSubItemList,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        handleModifySubItem,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,        
    } = ctx;

    // IMPORTANT: Back from Sub Item form must return to the Sub Item LIST,
    // not to the main Yarn list. This is intentionally synchronous so it
    // does not depend on any API request completing.
    const goBackFromSubItemForm = useCallback(() => {
        setShowActionMenu(false);
        setActionItem(null);
        setIsLoading(false);
        setIsModifyMode(false);
        setSubItemTab('LIST');
        setShowSubItemCard(true);
        setshowbrwosecard(false);
        setpartycard(false);
        setCurrentScreen('SUB_ITEM');

        // Refresh the sub-item list after returning.
        if (subItemParent?.itmcode) {
            fetchSubItemList(subItemParent);
        }
    }, [subItemParent]);

    // Android hardware back:
    // CREATE/MODIFY -> Sub Item LIST
    // Sub Item LIST -> OUTER/main Yarn LIST.
    // Use the same main-list navigation function as the header Back button.
    useEffect(() => {
        if (currentScreen !== 'SUB_ITEM') return;

        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (subItemTab === 'CREATE') {
                goBackFromSubItemForm();
            } else {
                goToSubItemMainList();
            }
            return true;
        });

        return () => subscription.remove();
    }, [currentScreen, subItemTab, goBackFromSubItemForm, goToSubItemMainList]);

    if (showSubItemCard && subItemTab === 'LIST') {
        return (
            <View style={{ flex: 1, backgroundColor: YARN_UI.canvas }}>
                <SafeAreaView
                    edges={["top"]}
                    style={{ backgroundColor: YARN_UI.primary }}
                >
                    <StatusBar style="light" backgroundColor={YARN_UI.primary} />
                    <View style={yarnUi.browseHeader}>
                        <TouchableOpacity style={yarnUi.headerBack} onPress={goToSubItemMainList} activeOpacity={0.8}>
                            <Icon name="arrow-back" size={23} color="#fff" />
                        </TouchableOpacity>
                        <View style={yarnUi.browseHeaderText}>
                            <Text style={yarnUi.browseTitle}>Sub Items</Text>
                            <Text style={yarnUi.browseSubTitle}>Manage sub items for the selected yarn</Text>
                        </View>
                    </View>
                </SafeAreaView>
                <View style={{ flex: 1 }}>
                    <View style={yarnUi.parentCard}>
                        <Text style={yarnUi.parentCode}>{subItemParent?.itmcode || '-'}</Text>
                        <Text style={yarnUi.parentName} numberOfLines={2}>{subItemParent?.WNameCode || '-'}</Text>
                    </View>

                    {/* <View style={{ paddingHorizontal: 14, marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#E7ECF1', borderRadius: 12, padding: 3 }}>
                            <TouchableOpacity
                                onPress={() => setSubItemTab('LIST')}
                                style={{ flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: YARN_UI.primary }}
                            >
                                <Text style={{ fontWeight: '800', color: '#fff' }}>Sub Item List</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleOpenSubItemForm()}
                                style={{ flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ fontWeight: '800', color: YARN_UI.ink }}>Create New</Text>
                            </TouchableOpacity>
                        </View>
                    </View> */}

                    <View style={yarnUi.listHead}>
                        <View>
                            <Text style={yarnUi.listTitle}>Sub Item List</Text>
                            <Text style={yarnUi.sectionSub}>Existing sub items</Text>
                        </View>
                        <View style={yarnUi.countPill}>
                            <Text style={yarnUi.countText}>{browsedata?.length || 0}</Text>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {isLoading ? (
                            <YarnSkeleton variant="sublist" />
                        ) : !browsedata || browsedata.length === 0 ? (
                            <View style={yarnUi.emptyState}>
                                <View style={yarnUi.emptyIcon}><Icon name="inventory-2" size={28} color={YARN_UI.primary} /></View>
                                <Text style={yarnUi.emptyTitle}>No sub items found</Text>
                                <Text style={yarnUi.emptySub}>Create a new sub item to get started.</Text>
                            </View>
                        ) : (
                            browsedata.map((item, index) => (
                                <View
                                    key={item?.itmcode || index}
                                    style={{
                                        marginHorizontal: 14,
                                        marginBottom: 10,
                                        padding: 14,
                                        borderRadius: 16,
                                        backgroundColor: '#fff',
                                        borderWidth: 1,
                                        borderColor: '#E5E9ED',
                                        elevation: 1,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={yarnUi.subIcon}>
                                            <Icon name="inventory-2" size={22} color={YARN_UI.primary} />
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                                            <Text numberOfLines={2} style={yarnUi.subName}>
                                                {item?.WNameCode || item?.itmname || '-'}
                                            </Text>

                                            <View style={[yarnUi.codeRow, { marginTop: 6 }]}>
                                                <Text style={yarnUi.codeChip}>
                                                    {item?.itmcode || '-'}
                                                </Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            activeOpacity={0.75}
                                            onPress={() => {
                                                setActionItem(item);
                                                setShowActionMenu(true);
                                            }}
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: 23,
                                                backgroundColor: '#EAF2FF',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name="more-vert" size={27} color={YARN_UI.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <Modal
                        visible={showActionMenu && !!actionItem?.itmcode}
                        transparent
                        animationType="slide"
                        onRequestClose={() => {
                            setShowActionMenu(false);
                            setActionItem(null);
                        }}
                    >
                        <View style={yarnUi.actionBackdrop}>
                            <View style={yarnUi.actionSheet}>
                                <View style={yarnUi.grabber} />

                                <View style={yarnUi.actionHead}>
                                    <View style={yarnUi.actionHeadIcon}>
                                        <Icon name="inventory-2" size={23} color={YARN_UI.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={yarnUi.actionTitle}>Sub Item Actions</Text>
                                        <Text style={yarnUi.actionItemName} numberOfLines={1}>
                                            {actionItem?.WNameCode || actionItem?.itmname || 'Selected sub item'}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        setShowActionMenu(false);
                                        handleSubItemModifyShow(actionItem);
                                    }}
                                    style={yarnUi.actionRow}
                                >
                                    <View style={yarnUi.actionIcon}>
                                        <Icon name="edit" size={20} color={YARN_UI.primary} />
                                    </View>
                                    <Text style={yarnUi.actionLabel}>Modify</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        setShowActionMenu(false);
                                        handleBrowseItem(actionItem);
                                    }}
                                    style={yarnUi.actionRow}
                                >
                                    <View style={yarnUi.actionIcon}>
                                        <Icon name="folder-open" size={20} color={YARN_UI.primary} />
                                    </View>
                                    <Text style={yarnUi.actionLabel}>Browse Item</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        setShowActionMenu(false);
                                        handleSubItemDelete(actionItem);
                                    }}
                                    style={yarnUi.actionRow}
                                >
                                    <View style={[yarnUi.actionIcon, yarnUi.dangerIcon]}>
                                        <Icon name="delete-outline" size={21} color={YARN_UI.danger} />
                                    </View>
                                    <Text style={[yarnUi.actionLabel, yarnUi.dangerText]}>Delete</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setShowActionMenu(false);
                                        setActionItem(null);
                                    }}
                                    style={yarnUi.actionCancel}
                                >
                                    <Text style={yarnUi.secondaryText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <View style={yarnUi.bottomBar}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={subItemOpeningLoading}
                            style={[
                                yarnUi.secondaryBtn,
                                {
                                    minWidth: 250,
                                    backgroundColor: YARN_UI.primary,
                                    borderColor: YARN_UI.primary,
                                    opacity: subItemOpeningLoading ? 0.88 : 1,
                                },
                            ]}
                            onPress={() => handleOpenSubItemForm(subItemParent)}
                        >
                            {subItemOpeningLoading ? (
                                <>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={[yarnUi.secondaryText, { color: '#fff', marginLeft: 9 }]}>
                                        Opening Sub Item...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Icon name="add" size={20} color="#fff" />
                                    <Text style={[yarnUi.secondaryText, { color: '#fff', marginLeft: 7 }]}>
                                        Create New Sub Item
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                    <SafeAreaView
                        edges={["bottom"]}
                        style={{ backgroundColor: '#fff' }}
                    />
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView
            edges={["top", "bottom", "left", "right"]}
            style={{ flex: 1, backgroundColor: YARN_UI.primary }}
        >
            <StatusBar style="light" backgroundColor={YARN_UI.primary} />
            <View style={yarnUi.screen}>
                {/* {isLoading && <FullScreenLoader />} */}
                {/* <HeaderBarwithBack
                    userName={username}
                    header={'Create Sub Item'}
                    subHeader={'Fill details to generate yarn sub item'}
                /> */}

                <View style={yarnUi.browseHeader}>
                    <TouchableOpacity style={yarnUi.headerBack} onPress={goBackFromSubItemForm} activeOpacity={0.8}>
                        <Icon name="arrow-back" size={23} color="#fff" />
                    </TouchableOpacity>
                    <View style={yarnUi.browseHeaderText}>
                        <Text style={yarnUi.browseTitle}>{isModifyMode ? "Modify Sub Item" : "Create Sub Item"}</Text>
                        {/* <Text style={yarnUi.browseSubTitle}>Select a sub item to manage party mapping</Text> */}
                    </View>
                </View>
                {subItemFormLoading ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ marginTop: 0, backgroundColor: YARN_UI.canvas }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        <YarnSkeleton variant="subform" />
                    </ScrollView>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ marginTop: 0, backgroundColor: YARN_UI.canvas }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                    <View style={yarnUi.formIntro}>
                        <View style={yarnUi.sectionIcon}>
                            <Icon name="create-new-folder" size={22} color={YARN_UI.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={yarnUi.formIntroTitle}>{isModifyMode ? "Modify Sub Item" : "Create Sub Item"}</Text>
                            <Text style={yarnUi.formIntroSub}>Complete the yarn details below. Required fields are marked with *.</Text>
                        </View>
                    </View>
                    <View style={yarnmanagementsystemstyle.formCard}>
                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Yarn Main Code <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {/* <PartyDropdown
                                data={mitemdata}
                                placeholder={isLoading ? "Loading..." : "Choose master item..."}
                                labelKey={["WNameCode", "itmcode"]}
                                valueKey="itmcode"
                                pageSize={12}
                                initialValue={selectedmitem ?? null}
                                selected={selectedmitem ?? null}
                                type="SubItem"
                                disabled={subItemSaveLoading}   // 🔥 important
                                onSelect={(item) => {
                                    setselectedmitem(item);

                                    const selectedBlendId = item?.WBlend;

                                    let list = [];
                                    const blendObj = mappedData.find(
                                        b => String(b.blendid) === String(selectedBlendId)
                                    );

                                    if (blendObj?.blend_names?.length > 0) {
                                        list = blendObj.blend_names.map(b => ({
                                            name: b.name,
                                            id: b.id,
                                            per: ''
                                        }));

                                        if (list.length === 1) {
                                            list[0].per = '100';
                                        }
                                    }

                                    setBlendList(list);

                                    setsubitemform(prev => ({
                                        ...prev,
                                        itmcode: item?.itmcode || '',
                                        WNameCode: item?.WNameCode || '',
                                        blend_id: selectedBlendId || '',
                                        WYarnType: item?.WYarnType || '',
                                        WBlend: item?.WBlend || '',
                                        mitmcode: item?.mitmcode || ''
                                    }));
                                }}
                            /> */}

                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    style={{ color: 'black' }}
                                    value={subitemform.WNameCode || ''}
                                    placeholder="Yarn Main Code"
                                    editable={false}   // 🔥 readonly
                                />
                            </View>

                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Blend <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {blendList.length === 0 ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={[yarnmanagementsystemstyle.inputBox, { flex: 2 }]}>
                                        <TextInput style={{ color: 'black' }} placeholder="Blend..." editable={false} />
                                    </View>

                                    <View style={[yarnmanagementsystemstyle.inputBox, { flex: 1 }]}>
                                        <TextInput style={{ color: 'black' }} placeholder="%" keyboardType="numeric" />
                                    </View>
                                </View>
                            ) : (
                                blendList.map((item, index) => (
                                    <View key={index} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>

                                        {/* Blend Name */}
                                        <View style={[yarnmanagementsystemstyle.inputBox, { flex: 2 }]}>
                                            <TextInput
                                                style={{ color: 'black' }}
                                                placeholder="Blend..."
                                                value={item.name}
                                                editable={false}
                                            />
                                        </View>

                                        {/* Percentage */}
                                        <View style={[yarnmanagementsystemstyle.inputBox, { flex: 1 }]}>
                                            <TextInput
                                                style={{ color: 'black' }}
                                                placeholder="%"
                                                value={item.per}
                                                keyboardType="numeric"
                                                onChangeText={(text) => {
                                                    const updated = [...blendList];
                                                    updated[index].per = text;
                                                    setBlendList(updated);

                                                    setsubitemform(prev => ({
                                                        ...prev,
                                                        linkitmcode: buildSubItem(prev, updated)
                                                    }));
                                                }}
                                            // onChangeText={(text) => {
                                            //     const value = text.replace(/[^0-9]/g, '');

                                            //     const updated = [...blendList];
                                            //     updated[index].per = value;

                                            //     setBlendList(updated);

                                            //     setsubitemform(prev => ({
                                            //         ...prev,
                                            //         linkitmcode: buildSubItem(prev, updated)
                                            //     }));

                                            //     // 🔥 validation only when all fields filled
                                            //     if (isAllFilled(updated)) {
                                            //         const total = getTotalPercentage(updated);

                                            //         if (total !== 100) {
                                            //             Alert.alert(
                                            //                 "Validation",
                                            //                 `Total percentage must be 100. Current: ${total}`
                                            //             );
                                            //         }
                                            //     }
                                            // }}
                                            />
                                        </View>

                                    </View>
                                ))
                            )}
                            {blendList.length > 0 && total !== 100 && (
                                <Text style={{ color: 'red', marginTop: 5 }}>
                                    Total must be 100% (Current: {total}%)
                                </Text>
                            )}

                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Count <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {/* <PartyDropdown
                                data={countdata}
                                placeholder="Choose blend..."
                                labelKey={["count", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedsubcount ?? null}
                                selected={selectedsubcount ?? null}
                                type="count"
                                onSelect={(item) => {
                                    setselectedsubcount(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            count_id: item?.id || '',
                                            count: item?.name || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                            denier: calculateSubitemDenier(updated)
                                        };
                                    });
                                }}
                            /> */}
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    style={{ color: 'black' }}
                                    placeholder="Count..."
                                    value={subitemform.count_no || ''}
                                    editable={true}
                                    // onChangeText={(text) => {
                                    //     setSpunForm(prev => ({
                                    //         ...prev,
                                    //         count: text
                                    //     }));
                                    // }}
                                    onChangeText={(text) => {
                                        const regex = /^[0-9]*$/;

                                        if (!regex.test(text)) return;

                                        // if (text !== '' && parseInt(text, 10) > 100) return;

                                        setsubitemform(prev => {
                                            const updated = {
                                                ...prev,
                                                count_no: text
                                            };

                                            // 👇 calculation sirf textbox value se
                                            return {
                                                ...updated,
                                                denier: calculateSubitemDenier(updated),
                                                linkitmcode: buildSubItem(updated, blendList),
                                            };
                                        });

                                    }}
                                    style={{
                                        color: '#000',
                                        opacity: 1,
                                        height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                    }}
                                />
                            </View>
                        </View>

                        {/* Ply */}
                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Ply <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <PartyDropdown
                                data={plydata}
                                placeholder="Choose Ply..."
                                labelKey={["ply", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedsubply ?? null}
                                selected={selectedsubply ?? null}
                                type="ply"
                                onSelect={(item) => {
                                    setselectedsubply(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            ply_id: item?.id || '',
                                            ply: item?.ply || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                            denier: calculateSubitemDenier(updated)
                                        };
                                    });
                                }}
                            />
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Yarn Type <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <PartyDropdown
                                data={subitemtypedata}
                                placeholder="Choose yarn type..."
                                labelKey={["name", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedsubitemtypedata ?? null}
                                selected={selectedsubitemtypedata ?? null}
                                type="blend"
                                onSelect={(item) => {
                                    setselectedsubitem(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            subtype_id: item?.id || '',
                                            subtype_name: item?.name || ''
                                        };
                                        return {
                                            ...updated,
                                            // linkitmcode: buildSubItem(updated, blendList),
                                            // denier: calculateSubitemDenier(updated)
                                        };
                                    });
                                }}
                            />
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Other
                                {/* <Text style={{ color: 'red' }}>*</Text> */}
                            </Text>
                            {/* <PartyDropdown
                                data={othersdata}
                                placeholder="Choose Others..."
                                labelKey={["name", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedothers ?? null}
                                selected={selectedothers ?? null}
                                type="blend"
                                onSelect={(item) => {
                                    setselectedothers(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            other_id: item?.id || '',
                                            name: item?.name || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                        };
                                    });
                                }}
                            /> */}
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    style={{ color: 'black' }}
                                    placeholder="Others..."
                                    value={subitemform.others || ''}
                                    editable={true}
                                    // onChangeText={(text) => {
                                    //     setsubitemform(prev => ({
                                    //         ...prev,
                                    //         others: text
                                    //     }));
                                    // }}

                                    onChangeText={(text) => {
                                        setsubitemform(prev => {
                                            const updated = {
                                                ...prev,
                                                others: text
                                            };

                                            return {
                                                ...updated,
                                                linkitmcode: buildSubItem(updated, blendList) // 🔥 auto update
                                            };
                                        });
                                    }}
                                />
                            </View>
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Sub Item Name <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    placeholder="Main Item..."
                                    value={subitemform.linkitmcode || ''}
                                    editable={true}
                                    onChangeText={(text) => {
                                        setsubitemform(prev => ({
                                            ...prev,
                                            linkitmcode: text
                                        }));
                                    }}
                                    style={{
                                        color: '#000',
                                        opacity: 1,
                                        height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                    }}
                                />
                            </View>
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Denier <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    placeholder="Denier..."
                                    value={subitemform.denier}
                                    editable={false}
                                    style={{
                                        color: '#000',
                                        opacity: 1,
                                        height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                    }}
                                />
                            </View>
                        </View>

                        {/* <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Link Item
                            </Text>

                            <PartyDropdown
                                data={itemdata}
                                placeholder="Choose Item..."
                                labelKey={["ItmName", "ItmCode"]}
                                valueKey="ItmCode"
                                pageSize={12}
                                initialValue={selectedsubitem ?? null}
                                selected={selectedsubitem ?? null}
                                type="Item1"
                                onSelect={(item) => {
                                    setselectedsubitem(item);
                                    setsubitemform(prev => ({
                                        ...prev,
                                        // maincode:item?.
                                        ItmCode: item?.ItmCode || "",
                                    }));
                                }}
                            />
                        </View> */}

                    </View>
                </ScrollView>
                )}

                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    padding: 15,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderColor: '#eee'
                }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#ccc',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 6,
                            marginRight: 10
                        }}
                        onPress={goBackFromSubItemForm}
                    >
                        <Text style={{ fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={subItemFormLoading}
                        style={{
                            backgroundColor: '#007EA7',
                            opacity: subItemFormLoading ? 0.55 : 1,
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 6,
                            minWidth: 120,
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        disabled={isLoading}
                        onPress={() => {
                            if (isModifyMode) {
                                handleModifySubItem();
                            } else {
                                handlesubitemadd();
                            }
                            console.log("Sub Item", subitemform);
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                            {isModifyMode ? 'Update Sub Item' : 'Add Sub Item'}
                        </Text>
                    </TouchableOpacity>

                </View>

                {/* Full screen loader while Sub Item Add/Modify is saving */}
                {subItemSaveLoading && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            elevation: 9999,
                        }}
                    >
                        <View
                            style={{
                                minWidth: 150,
                                minHeight: 120,
                                paddingHorizontal: 24,
                                paddingVertical: 20,
                                borderRadius: 16,
                                backgroundColor: '#fff',
                                alignItems: 'center',
                                justifyContent: 'center',
                                elevation: 8,
                            }}
                        >
                            <ActivityIndicator size="large" color="#007EA7" />
                            <Text
                                style={{
                                    marginTop: 12,
                                    color: '#18212F',
                                    fontSize: 14,
                                    fontWeight: '700',
                                }}
                            >
                                {isModifyMode ? 'Updating Sub Item...' : 'Adding Sub Item...'}
                            </Text>
                        </View>
                    </View>
                )}

            </View>
        </SafeAreaView>
    );
};


const BrowseTab: React.FC = () => {
    const ctx = useYarnManagement();
    const {
        isLoading,
        setIsLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,
    } = ctx;
    return (
        <SafeAreaView
            edges={["top", "bottom", "left", "right"]}
            style={{ flex: 1, backgroundColor: YARN_UI.primary }}
        >
            <StatusBar style="light" backgroundColor={YARN_UI.primary} />
            <View style={yarnUi.screen}>
                <View style={yarnUi.browseHeader}>
                    <TouchableOpacity style={yarnUi.headerBack} onPress={goToListScreen}>
                        <Icon name="arrow-back" size={23} color="#fff" />
                    </TouchableOpacity>
                    <View style={yarnUi.browseHeaderText}>
                        <Text style={yarnUi.browseTitle}>Sub Item List</Text>
                        <Text style={yarnUi.browseSubTitle}>Select a sub item to manage party mapping</Text>
                    </View>
                </View>

                <View style={yarnUi.parentCard}>
                    <Text style={yarnUi.parentCode}>{browseParentItem?.itmcode || '-'}</Text>
                    <Text style={yarnUi.parentName} numberOfLines={2}>{browseParentItem?.WNameCode || '-'}</Text>
                </View>

                <View style={yarnUi.listHead}>
                    <Text style={yarnUi.listTitle}>Sub Items</Text>
                    <View style={yarnUi.countPill}>
                        <Text style={yarnUi.countText}>{browsedata?.length || 0}</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 88 }}>
                    {isLoading ? (
                        <YarnSkeleton variant="browse" />
                    ) : !browsedata || browsedata.length === 0 ? (
                        <View style={yarnUi.emptyState}>
                            <View style={yarnUi.emptyIcon}>
                                <Icon name="inventory-2" size={28} color={YARN_UI.primary} />
                            </View>
                            <Text style={yarnUi.emptyTitle}>No sub items found</Text>
                            <Text style={yarnUi.emptySub}>Create a sub item first, then it will appear here.</Text>
                        </View>
                    ) : (
                        browsedata.map((item, index) => (
                            <View key={item?.itmcode || index} style={yarnUi.subCard}>
                                <View style={yarnUi.subIcon}>
                                    <Icon name="inventory-2" size={22} color={YARN_UI.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text numberOfLines={2} style={yarnUi.subName}>{item.WNameCode || '-'}</Text>
                                    <View style={yarnUi.codeRow}>
                                        <Text style={yarnUi.codeChip}>{item.itmcode || '-'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={yarnUi.mapButton}
                                    onPress={async () => {
                                        setSelectedBrowseItem(item);
                                        await fetchpartydata();
                                        await fetchpartybrowse(activeTab, item.itmcode);
                                        setpartycard(true);
                                        setshowbrwosecard(false);
                                        setCurrentScreen('PARTY');
                                    }}
                                >
                                    <Icon name="add" size={25} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={yarnUi.bottomBar}>
                    <TouchableOpacity style={yarnUi.secondaryBtn} onPress={goToListScreen}>
                        <Icon name="close" size={19} color="#344054" />
                        <Text style={[yarnUi.secondaryText, { marginLeft: 7 }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};


const PartyTab: React.FC = () => {
    const ctx = useYarnManagement();
    const {
        isLoading,
        setIsLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        partyReturnToSubItemList,
        goBackFromParty,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,
    } = ctx;
    return (
        <>
            <View style={{ flex: 1, backgroundColor: YARN_UI.canvas }}>
                <StatusBar style="light" backgroundColor={YARN_UI.primary} />
                {/* Keep Party screen header below the status bar, same as Sub Item screen. */}
                <SafeAreaView
                    edges={["top"]}
                    style={{ backgroundColor: YARN_UI.primary }}
                >
                    {/* {isLoading && <FullScreenLoader />} */}
                    {/* <View style={yarnmanagementsystemstyle.topHeader}>
                        <Text style={yarnmanagementsystemstyle.topHeaderTitle}>
                            Sub Item: {browseParentItem?.WNameCode || '-'}
                        </Text>
                    </View> */}
                    <View style={[
                        yarnmanagementsystemstyle.topHeader,
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 10
                        }
                    ]}>
                    <TouchableOpacity
                        onPress={goBackFromParty}
                        style={{
                            width: 40,
                            height: 40,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Icon name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    {/* 📝 TITLE */}
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                            yarnmanagementsystemstyle.topHeaderTitle,
                            {
                                flex: 1,
                                marginRight: 10
                            }
                        ]}
                    >
                        Sub Item: {browseParentItem?.WNameCode || '-'}
                    </Text>

                    </View>
                </SafeAreaView>
                <View style={yarnmanagementsystemstyle.formCard}>
                    <View style={yarnmanagementsystemstyle.inputGroup}>
                        <Text style={yarnmanagementsystemstyle.label}>
                            Party <Text style={{ color: 'red' }}>*</Text>
                        </Text>

                        <PartyDropdown
                            data={partydata}
                            placeholder="Choose party..."
                            labelKey={["accountname", "acccode"]}
                            valueKey="acccode"
                            pageSize={12}
                            initialValue={selectedparty ?? []}
                            selected={selectedparty ?? []}
                            type="partydata"
                            multiple={false}
                            onSelect={(item) => {
                                setselectedparty(item);
                                setpartyForm(prev => {
                                    const updated = {
                                        ...prev,
                                        accountname: item.accountname,   // array
                                        acccode: item.acccode,     // array
                                    };

                                    return {
                                        ...updated,
                                        // linkitmcode: buildMainItem(updated)
                                    };
                                });
                            }}
                        />

                    </View>

                    {/* Item Name */}
                    <View style={yarnmanagementsystemstyle.inputGroup}>
                        <Text style={yarnmanagementsystemstyle.label}>
                            Item Name <Text style={{ color: 'red' }}>*</Text>
                        </Text>

                        <View style={yarnmanagementsystemstyle.inputBox}>
                            <TextInput
                                placeholder="Main Item..."
                                value={partyForm.ItemName || ''}
                                onChangeText={(text) =>
                                    setpartyForm(prev => ({
                                        ...prev,
                                        ItemName: text
                                    }))
                                }
                                style={{ color: '#000', height: '100%' }}
                            />
                        </View>
                    </View>

                    {/* 🔻 BUTTONS */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        marginTop: 0
                    }}>
                        <TouchableOpacity
                            style={yarnmanagementsystemstyle.cancelBtnInline}
                            onPress={goBackFromParty}
                        >
                            <Icon name="cancel" size={18} color="#fff" />
                            <Text style={yarnmanagementsystemstyle.cancelBtnText}>
                                cancel
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={yarnmanagementsystemstyle.addBtnInline}
                            onPress={handleaddparty}
                        >
                            <Icon name="add-circle" size={18} color="#fff" />
                            <Text style={yarnmanagementsystemstyle.addBtnText}>
                                Add Item
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>

                {/* 🔥 HEADING */}
                <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    marginVertical: 10,
                    marginLeft: 10,
                    color: '#333'
                }}>
                    Item List
                </Text>

                {/* 🔥 LIST ONLY SCROLLABLE ✅ */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingBottom: 20,
                        paddingHorizontal: 10
                    }}
                >
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between'
                    }}>
                        {browserpartydata.length > 0 ? (
                            browserpartydata.map((item, index) => {
                                const colors = CARD_COLORS1[index % CARD_COLORS1.length];

                                return (
                                    <View
                                        key={index}
                                        style={{
                                            width: '100%',
                                            borderRadius: 10,
                                            marginBottom: 10,
                                            overflow: 'hidden',
                                            elevation: 3
                                        }}
                                    >
                                        <View style={{
                                            padding: 12,
                                            backgroundColor: colors[0],
                                            minHeight: 80,
                                            borderRadius: 10
                                        }}>

                                            <Text style={{
                                                color: '#fff',
                                                // marginTop: 5,
                                                fontSize: 13,
                                                fontWeight: '600',
                                            }}>
                                                Item: {item?.ItmName}
                                            </Text>

                                            <Text style={{
                                                color: '#fff',
                                                fontWeight: '600',
                                                fontSize: 13
                                            }}>
                                                Code: {item?.ItmCode}
                                            </Text>

                                            <Text style={{
                                                color: '#fff',
                                                fontWeight: '500',
                                                fontSize: 13
                                            }}>
                                                Party: {item?.ParName}
                                            </Text>

                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={{
                                width: '100%',
                                textAlign: 'center',
                                marginTop: 20
                            }}>
                                No Data Found
                            </Text>
                        )}
                    </View>
                </ScrollView>

            </View>
        </>
    );
};

const YarnManagementSystem: React.FC<Props> = ({ token, username }) => {

    const [isLoading, setIsLoading] = useState(false);
    // Dedicated loader only for the Create New Sub Item transition.
    // Keeps the Sub Item List skeleton from appearing while yarnitemshow loads.
    const [subItemOpeningLoading, setSubItemOpeningLoading] = useState(false);
    // Dedicated loader for the Sub Item CREATE/MODIFY form.
    // This is intentionally separate from isLoading because isLoading is also
    // used by the Sub Item LIST skeleton.
    const [subItemFormLoading, setSubItemFormLoading] = useState(false);
    const [subItemSaveLoading, setSubItemSaveLoading] = useState(false);
    // Dedicated loader for yarnitemdelete; independent from list/form loaders.
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deletePermissionVisible, setDeletePermissionVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleteTargetType, setDeleteTargetType] = useState<'MAIN' | 'SUB'>('MAIN');
    const [getDataSaved, setDataSaved] = useState(false);
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const today = new Date();
    const [FormState, setFormState] = useState({
        values: {
            prpcode: '',
            yarnstrcode: '',
            yearno: ''
        }
    });
    const [spunForm, setSpunForm] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: '',
        count_no: '',
        others: ''

    });

    const [filamentForm, setFilamentForm] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: '',
        type_id: '',
        type: '',
        lustre_id: '',
        lustre: '',
        other_id: '',
        name: '',
        count_no: '',
        others: ''
    });

    const [subitemform, setsubitemform] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: '',
        type_id: '',
        type: '',
        lustre_id: '',
        lustre: '',
        other_id: '',
        name: '',
        Per: '',
        mitmcode: '',
        WBlend: '',
        WYarnType: '',
        WNameCode: '',
        others: '',
        subtype_id: '',
        subtype_name: '',
        count_no: ''

    });
    const [mappedData, setMappedData] = useState([]);
    const [blendList, setBlendList] = useState([
        {
            id: '',
            name: '',
            per: ''
        }
    ]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeTab, setActiveTab] = useState('Spun');
    const [showSpunCard, setShowSpunCard] = useState(false);
    const [showFilamentCard, setShowFilamentCard] = useState(false);
    const [blenddata, setblenddata] = useState([]);
    const [selectedblend, setselectedblend] = useState([]);
    const [selectedfilamentblend, setselectedfilamentblend] = useState([]);
    const [countdata, setcountdata] = useState([]);
    const [selectedcount, setselectedcount] = useState([]);
    const [selectedsubcount, setselectedsubcount] = useState([]);
    const [selectedfilamentcount, setselectedfilamentcount] = useState([]);
    const [plydata, setplydata] = useState([]);
    const [selectedply, setselectedply] = useState([]);
    const [selectedfilamentply, setselectedfilamentply] = useState([]);
    const [typedata, settypedata] = useState([]);
    const [selectedtype, setselectedtype] = useState([]);
    const [lustredata, setlustredata] = useState([]);
    const [selectedlustre, setselectedlustre] = useState([]);
    const [othersdata, setothersdata] = useState([]);
    const [selectedothers, setselectedothers] = useState([]);
    const [itemdata, setitemdata] = useState([]);
    const [selecteditem, setselecteditem] = useState([]);
    const [selectedsubitem, setselectedsubitem] = useState([]);
    const [mitemdata, setmitemdata] = useState([]);
    const [data, setdata] = useState([]);
    const [selectedmitem, setselectedmitem] = useState([]);
    const [selectedfilamentitem, setselectedfilamentitem] = useState([]);
    const [showSubItemCard, setShowSubItemCard] = useState(false);
    const [showbrwosecard, setshowbrwosecard] = useState(false);
    const [selectedsubply, setselectedsubply] = useState([]);
    const [subitemtypedata, setsubitemtypedata] = useState([]);
    const [selectedsubitemtypedata, setselectedsubitemtypedata] = useState([]);
    const [browsedata, setbrowsedata] = useState([]);  // 👈 MUST
    const [browseLoading, setBrowseLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [browseParentItem, setBrowseParentItem] = useState(null);
    const [selectedBrowseItem, setSelectedBrowseItem] = useState(null);
    const [partycard, setpartycard] = useState(false);
    const [partydata, setpartydata] = useState([]);
    const [partyForm, setpartyForm] = useState({
        accountname: '',
        acccode: '',
        ItemName: ''
    });
    const [selectedparty, setselectedparty] = useState([]);
    const [btnLoading, setBtnLoading] = useState(false);
    const [browserpartydata, setbrowserpartydata] = useState([]);
    const [cardSearch, setCardSearch] = useState('');
    const [actionItem, setActionItem] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [isModifyMode, setIsModifyMode] = useState(false);

    // Screen-style navigation. Only one screen is rendered at a time.
    // LIST -> SPUN_FORM / FILAMENT_FORM / SUB_ITEM / BROWSE / PARTY
    const [currentScreen, setCurrentScreen] = useState('LIST');

    // Sub Item screen has two states: existing list and create form.
    const [subItemTab, setSubItemTab] = useState('LIST');
    const [subItemParent, setSubItemParent] = useState(null);
    // Remembers where Party/Browse was opened from.
    // true = opened from Sub Item LIST, so Back/Cancel must return there.
    const [partyReturnToSubItemList, setPartyReturnToSubItemList] = useState(false);

    // IMPORTANT: Add mode must always start with a completely clean form.
    // Otherwise values loaded by yarnitemshow during Modify remain visible
    // when the user cancels and opens Add again.
    const resetSpunForm = useCallback(() => {
        setSpunForm({
            blend: '',
            count: '',
            ply: '',
            linkitmcode: '',
            denier: '',
            blend_id: '',
            count_id: '',
            ply_id: '',
            ItmCode: '',
            count_no: '',
            others: ''
        });
        setselectedblend([]);
        setselectedcount([]);
        setselectedply([]);
        setselecteditem([]);
    }, []);

    const resetFilamentForm = useCallback(() => {
        setFilamentForm({
            blend: '',
            count: '',
            ply: '',
            linkitmcode: '',
            denier: '',
            blend_id: '',
            count_id: '',
            ply_id: '',
            ItmCode: '',
            type_id: '',
            type: '',
            lustre_id: '',
            lustre: '',
            other_id: '',
            name: '',
            count_no: '',
            others: ''
        });
        setselectedfilamentblend([]);
        setselectedfilamentcount([]);
        setselectedfilamentply([]);
        setselectedtype([]);
        setselectedlustre([]);
        setselectedothers([]);
        setselectedfilamentitem([]);
    }, []);

    const resetYarnForms = useCallback(() => {
        resetSpunForm();
        resetFilamentForm();
        setIsModifyMode(false);
    }, [resetSpunForm, resetFilamentForm]);

    const goToListScreen = useCallback(() => {
        // Cancel any in-flight yarnitemshow request so a late Modify response
        // cannot refill the form after the user has cancelled it.
        if (cancelToken.current) {
            // cancelToken.current.cancel('Modify cancelled by user');
            cancelToken.current = null;
        }

        resetYarnForms();
        setCurrentScreen('LIST');
        setShowSpunCard(false);
        setShowFilamentCard(false);
        setShowSubItemCard(false);
        setSubItemTab('LIST');
        setSubItemParent(null);
        setPartyReturnToSubItemList(false);
        setshowbrwosecard(false);
        setpartycard(false);
        setShowActionMenu(false);
        setActionItem(null);
    }, [resetYarnForms]);

    // Sub Item form/list exit: go directly to the main Yarn list
    // and refresh the Browse API after the redirect.
    const goToSubItemMainList = useCallback(() => {
        resetYarnForms();
        setCurrentScreen('LIST');
        setShowSpunCard(false);
        setShowFilamentCard(false);
        setShowSubItemCard(false);
        setSubItemTab('LIST');
        setSubItemParent(null);
        setshowbrwosecard(false);
        setpartycard(false);
        setShowActionMenu(false);
        setActionItem(null);
        fetchbrowse(activeTab);
    }, [resetYarnForms, activeTab]);

    // Back from Sub Item LIST must always use the same navigation
    // as the main-list exit. Keeping one source of truth prevents the
    // screen from falling back to the Browse/Sub Item mapping screen.
    const goBackFromSubItemList = useCallback(() => {
        goToSubItemMainList();
    }, [goToSubItemMainList]);

    // console.log("browserpartydata", browserpartydata)

    const cancelToken = useRef(null);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken.current?.token,
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
            if (response.data?.success) {
                setAllPropertyData(response.data.response.data);
            }

        } catch (error) {
            console.error("Error fetching property group:", error);
        }
    };

    useEffect(() => {
        if (isDrawerVisible) {
            // fetchPropertyGroup();
            // soshow();
        }
    }, [isDrawerVisible]);

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        try {
            setIsLoading(true);

            const source = axios.CancelToken.source(); // ✅ local token

            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                return_json_data: "1"
            };

            console.log("historyPayload:", historyPayload);

            const response = await axios.post(
                `${API}/api/getyarndefault`,
                historyPayload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );

            console.log("POST API Response:", response);

            const data = response?.data?.data?.main || {};

            if (response?.data?.success && data) {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        prpcode: data.prpcode || '',
                        yarnstrcode: data.yarnstrcode || '',
                        yearno: data.yearno || ''
                    }
                }));

            }

        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlenddata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
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
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
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
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };
            // console.log("ply historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnply`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("ply API Response:", response);

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

    const fetchtype = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            // if (cancelToken.current) {
            //     cancelToken.current.cancel("Cancelled previous request");
            // }

            // cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            console.log("type historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarntype`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("type1111 API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                settypedata(data);
            } else {
                settypedata([]);
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

    const fetchlustre = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        // if (!FormState.values.PrpOf) return;
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            // console.log("lustre historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnlustre`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("lustre API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setlustredata(data);
            } else {
                setlustredata([]);
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

    const fetchmitem = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                strcode: FormState.values.yarnstrcode,
                yarntype: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            console.log("master historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/getyarnmasteritem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Master API Response:", response);

            const data = response?.data?.data?.data || [];
            const mapped = response?.data?.data?.mapped_data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setmitemdata(data);
                setMappedData(mapped);

                return mapped;
            } else {
                setmitemdata([]);
                setMappedData([]);
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

    const fetchOthresdata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };
            // console.log("Others historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnother`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("Others API Response:", response);
            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setothersdata(data);
            } else {
                setothersdata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getothers error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemdata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                strcode: FormState.values.yarnstrcode,
                prptype: userPtype,
                // prptype: 'S',
                prpcode: FormState.values.prpcode,
                // txntype: 'yarn_creation_item_master',
                yearno: "27"
            };

            // console.log("item:", historyPayload);

            const response = await axios.get(
                `${API}/api/getitem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("item API Response:", response);

            const data = response.data.response.data || [];
            if (response?.data?.success && response.data.response.data.length > 0) {
                setitemdata(data);
            } else {
                setitemdata([]);
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

    const fetchyarntype = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            // if (cancelToken.current) {
            //     cancelToken.current.cancel("Cancelled previous request");
            // }
            // cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };
            console.log("yarn type historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarntypesubitem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("yarn type Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setsubitemtypedata(data);
            } else {
                setsubitemtypedata([]);
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

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };

    const fetchpartydata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prpcode: FormState.values.prpcode,
                prptype: userPtype,
                yearno: FormState.values.yearno || getCurrentFinancialYear(),
                strcode: FormState.values.yarnstrcode,
                txntype: 'yarn_creation_item_master',
                partytype: 'p',
                type: 'P',
                page: '',
                limit: '',
                search: '',
                isceo: '',
                partype: '',
                grntype: '',
                parcode: '',
                fetch: '',
                acccode: '',
                billdate:
                    '',
                strtype: '',
                isfaint: ''
            };
            console.log("party type historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/accountbasic`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("party type Response:", response);

            const data = response?.data?.response?.data || [];
            if (response?.data?.success && response?.data?.response?.data?.length > 0) {
                setpartydata(data);
            } else {
                setpartydata([]);
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

    const handleModifyItem = async (item) => {
        setShowActionMenu(false);
        setActionItem(null);

        const itmcode = item?.itmcode;
        const strcode = FormState.values.yarnstrcode;
        const userPtype = await AsyncStorage.getItem('user_prptype');

        if (!itmcode) {
            Alert.alert("Error", "Item code not found.");
            return;
        }

        try {
            setIsLoading(true);

            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();

            // yarnitemshow needs only itmcode, strcode and prptype.
            const payload = {
                itmcode,
                strcode,
                prptype: userPtype
            };

            console.log("yarnitemshow Payload:", payload);

            const response = await axios.get(
                `${API}/api/yarnitemshow`,
                getRequestConfig({
                    params: payload,
                    cancelToken: cancelToken.token
                })
            );

            console.log("yarnitemshow Response:", response?.data);

            const mainItem = response?.data?.data?.maindata?.[0];

            if (!response?.data?.success || !mainItem) {
                Alert.alert(
                    "Warning",
                    response?.data?.message || "Item details not found."
                );
                return;
            }

            // The API returns maincode in the format:
            // 67/7 Wors ELASTOMULTIESTER MODEL Testentry
            // So count_no = 67 and ply = 7.
            const mainCodeParts = String(mainItem?.maincode || '').trim().match(
                /^([^/\s]+)\/([^\s]+)\s+(.*)$/
            );

            const countNo = mainCodeParts?.[1] || '';
            const plyValue = mainCodeParts?.[2] || '';

            const countName = mainItem?.CountType || mainItem?.count || '';
            const otherValue = mainItem?.other || '';

            // Match API values with the actual dropdown objects so the
            // dropdowns display the selected values instead of only raw text.
            const findByIdOrName = (list, value, keys = ['id', 'name']) => {
                if (!value && value !== 0) return null;

                const stringValue = String(value);
                return (list || []).find(obj =>
                    keys.some(key => String(obj?.[key] ?? '') === stringValue)
                ) || null;
            };

            const findPly = (value) => {
                if (!value && value !== 0) return null;
                const stringValue = String(value);
                return (plydata || []).find(obj =>
                    String(obj?.ply ?? '') === stringValue ||
                    String(obj?.id ?? '') === stringValue
                ) || null;
            };

            // BlendDisplay is preferred when the API sends it.
            // Fallback: the blend field contains blend ids such as "11/10".
            const apiBlendDisplay = Array.isArray(mainItem?.BlendDisplay)
                ? mainItem.BlendDisplay
                : [];

            let blendItems = apiBlendDisplay
                .map(b => ({
                    ...b,
                    id: b?.id ?? b?.blendid ?? b?.code,
                    name: b?.name ?? b?.blend ?? b?.BlendName ?? ''
                }))
                .filter(b => b.id !== undefined && b.id !== null);

            if (blendItems.length === 0 && mainItem?.blend) {
                const blendIds = String(mainItem.blend)
                    .split(/[\/,\s]+/)
                    .map(v => v.trim())
                    .filter(Boolean);

                blendItems = blendIds.map(id => {
                    return findByIdOrName(blenddata, id) || {
                        id,
                        name: id
                    };
                });
            } else {
                // Use the currently loaded dropdown objects whenever possible.
                blendItems = blendItems.map(apiBlend =>
                    findByIdOrName(blenddata, apiBlend.id) || apiBlend
                );
            }

            const selectedCountObj =
                findByIdOrName(countdata, countName) || {
                    id: mainItem?.count || countName,
                    name: countName,
                    formula: ''
                };

            const selectedPlyObj =
                findPly(plyValue) || {
                    id: plyValue,
                    ply: plyValue
                };

            const baseForm = {
                ItmCode: String(mainItem?.itmcode || itmcode),
                linkitmcode: mainItem?.maincode || '',
                denier: mainItem?.denier || '',
                count_no: countNo,
                count: selectedCountObj?.name || countName,
                count_id: selectedCountObj?.id || '',
                formula: selectedCountObj?.formula || '',
                ply: selectedPlyObj?.ply || plyValue,
                ply_id: selectedPlyObj?.id || '',
                blend: blendItems.map(b => b?.name).filter(Boolean),
                blend_id: blendItems.map(b => b?.id).filter(Boolean),
                others: otherValue
            };

            if (activeTab === 'Spun') {
                setIsModifyMode(true);

                setselectedblend(blendItems);
                setselectedcount(selectedCountObj);
                setselectedply(selectedPlyObj);

                setSpunForm(prev => ({
                    ...prev,
                    ...baseForm
                }));

                setShowFilamentCard(false);
                setShowSubItemCard(false);
                setshowbrwosecard(false);
                setpartycard(false);
                setShowSpunCard(true);
                setCurrentScreen('SPUN_FORM');
            } else {
                const selectedTypeObj =
                    findByIdOrName(typedata, mainItem?.Type, ['id', 'type']) || (
                        mainItem?.Type ? { id: mainItem.Type, type: mainItem.Type } : null
                    );

                const selectedLustreObj =
                    findByIdOrName(lustredata, mainItem?.Lustre, ['id', 'lustre']) || (
                        mainItem?.Lustre ? { id: mainItem.Lustre, lustre: mainItem.Lustre } : null
                    );

                setIsModifyMode(true);

                setselectedfilamentblend(blendItems);
                setselectedfilamentcount(selectedCountObj);
                setselectedfilamentply(selectedPlyObj);
                setselectedtype(selectedTypeObj);
                setselectedlustre(selectedLustreObj);

                setFilamentForm(prev => ({
                    ...prev,
                    ...baseForm,
                    type_id: selectedTypeObj?.id || '',
                    type: selectedTypeObj?.type || mainItem?.Type || '',
                    lustre_id: selectedLustreObj?.id || '',
                    lustre: selectedLustreObj?.lustre || mainItem?.Lustre || '',
                    other_id: '',
                    name: '',
                    others: otherValue
                }));

                setShowSpunCard(false);
                setShowSubItemCard(false);
                setshowbrwosecard(false);
                setpartycard(false);
                setShowFilamentCard(true);
                setCurrentScreen('FILAMENT_FORM');
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("yarnitemshow request cancelled:", error.message);
            } else {
                console.log("yarnitemshow error:", error);
                Alert.alert("Error", "Unable to load item details.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteItem = (item) => {
        if (!item) return;

        console.log('Delete Main Item:', item);

        // Close Item Actions first.
        setShowActionMenu(false);
        setActionItem(null);

        // Store exactly the row selected for deletion.
        setDeleteTarget(item);
        setDeleteTargetType('MAIN');
        setDeletePermissionVisible(true);
    };

    // Dedicated yarnwbrowse call for the Sub Item list.
    const fetchSubItemList = async (item) => {
        if (!item?.itmcode) {
            Alert.alert('Error', 'Main item code not found.');
            setbrowsedata([]);
            return;
        }

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const itemPrptype =
            item?.prptype ??
            item?.PrpType ??
            item?.PRPTYPE ??
            item?.WPrpType ??
            userPtype;

        try {
            setIsLoading(true);
            const payload = {
                txntype: 'yarn_creation_item_master',
                mitmcode: item.itmcode,
                prptype: itemPrptype,
            };

            const response = await axios.get(
                `${API}/api/yarnwbrowse`,
                getRequestConfig({ params: payload })
            );

            const list = Array.isArray(response?.data?.data?.maindata)
                ? response.data.data.maindata
                : [];

            setbrowsedata(list);
        } catch (error) {
            console.log('Sub Item yarnwbrowse error:', error);
            setbrowsedata([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSubItemForm = async (item = subItemParent) => {
        const parentItem = item || subItemParent;
        if (!parentItem) {
            Alert.alert('Error', 'Main item not found.');
            return;
        }

        const mainCode = parentItem?.itmcode;
        const strcode = FormState.values.yarnstrcode;
        const userPtype = await AsyncStorage.getItem('user_prptype');

        if (!mainCode) {
            Alert.alert('Error', 'Main item code not found.');
            return;
        }

        try {
            // Show the actual CREATE form skeleton immediately.
            // Do not use isLoading here because it belongs to the Sub Item LIST.
            setSubItemFormLoading(true);
            setSubItemOpeningLoading(false);

            // Keep the selected MAIN item as the parent for Create New Sub Item.
            setSubItemParent(parentItem);
            setIsModifyMode(false);
            setSubItemTab('CREATE');
            setShowSubItemCard(true);
            setShowSpunCard(false);
            setShowFilamentCard(false);
            setshowbrwosecard(false);
            setpartycard(false);
            setCurrentScreen('SUB_ITEM');

            // Create New Sub Item -> load the selected Main Item details first.
            // Main Item code is sent as itmcode to yarnitemshow.
            const payload = {
                itmcode: mainCode,
                strcode,
                prptype: userPtype
            };

            console.log('Create New Sub Item yarnitemshow Payload:', payload);

            const response = await axios.get(
                `${API}/api/yarnitemshow`,
                getRequestConfig({
                    params: payload
                })
            );

            console.log('Create New Sub Item yarnitemshow Response:', response?.data);

            const showItem = response?.data?.data?.maindata?.[0];

            if (!response?.data?.success || !showItem) {
                Alert.alert(
                    'Warning',
                    response?.data?.message || 'Main item details not found.'
                );
                return;
            }

            // The CREATE screen is already visible with its form skeleton.
            // Now load the remaining master data without changing screens.
            // Existing mapping/value-setting logic is kept below.
            // IMPORTANT: fetchmitem() return value is preserved because it is
            // required by the existing blend fallback/value mapping.
            const [_, mapped] = await Promise.all([
                soshow(),
                fetchmitem(),
                fetchBlendcount(),
                fetchBlendply(),
                fetchOthresdata(),
                fetchyarntype(),
            ]);

            // BlendDisplay is the source for Sub Item blend rows.
            // If the API returns an empty BlendDisplay, keep the existing
            // main-item blend mapping as fallback.
            const apiBlendList = Array.isArray(showItem?.BlendDisplay)
                ? showItem.BlendDisplay
                    .map(blend => ({
                        id: String(blend?.id ?? ''),
                        name: blend?.name || '',
                        per: String(blend?.per ?? '')
                    }))
                    .filter(blend => blend.name)
                : [];

            const selectedBlendId = String(showItem?.blend ?? parentItem?.WBlend ?? '');

            // CountTypeId from yarnitemshow is the actual count master id.
            // Use it to restore the formula used by Sub Item denier calculation.
            const selectedCountId = String(
                showItem?.CountTypeId ??
                parentItem?.WCounttype ??
                ''
            );

            const selectedCountObj =
                (countdata || []).find(
                    ct => String(ct?.id ?? '') === selectedCountId
                ) ||
                (countdata || []).find(
                    ct => String(ct?.name ?? '') === String(showItem?.CountType ?? '')
                ) ||
                null;

            const selectedCountFormula = selectedCountObj?.formula || '';

            const blendObj = (mapped || []).find(
                b =>
                    String(b.blendid) === selectedBlendId &&
                    String(b.itmcode) === String(mainCode)
            );

            let fallbackBlendList = [];
            if (blendObj?.blend_names?.length > 0) {
                fallbackBlendList = blendObj.blend_names.map(b => ({
                    id: String(b.id ?? ''),
                    name: b.name || '',
                    per: ''
                }));

                if (fallbackBlendList.length === 1) {
                    fallbackBlendList[0].per = '100';
                }
            }

            setBlendList(apiBlendList.length > 0 ? apiBlendList : fallbackBlendList);

            // WPly -> Ply dropdown.
            const apiPly = String(showItem?.WPly ?? '');
            const matchedPly =
                (plydata || []).find(p => String(p?.ply ?? '') === apiPly) ||
                (plydata || []).find(p => String(p?.id ?? '') === apiPly);

            const selectedPly = matchedPly ||
                (apiPly ? { id: apiPly, ply: apiPly } : []);

            setselectedsubply(selectedPly);

            // subyarntype/subyarntypename -> Yarn Type dropdown.
            const apiSubTypeId = String(showItem?.subyarntype ?? '');
            const apiSubTypeName = String(showItem?.subyarntypename ?? '');

            const matchedSubType =
                (subitemtypedata || []).find(
                    type => String(type?.id ?? '') === apiSubTypeId
                ) ||
                (subitemtypedata || []).find(
                    type => String(type?.name ?? '') === apiSubTypeName
                );

            const selectedSubType =
                matchedSubType ||
                (apiSubTypeId || apiSubTypeName
                    ? { id: apiSubTypeId, name: apiSubTypeName }
                    : []);

            setselectedsubitemtypedata(selectedSubType);
            setselectedsubitem(selectedSubType);

            // Set Create New Sub Item form from yarnitemshow response.
            setsubitemform(prev => ({
                ...prev,
                WNameCode: showItem?.itmname || parentItem?.WNameCode || '',
                WBlend: selectedBlendId,
                WYarnType: parentItem?.WYarnType || '',
                mitmcode: mainCode,
                WCounttype: selectedCountId,
                ItmCode: mainCode,
                linkitmcode: showItem?.maincode || '',
                denier: String(showItem?.denier ?? ''),
                formula: selectedCountFormula,
                blend: (apiBlendList.length > 0 ? apiBlendList : fallbackBlendList)
                    .map(blend => blend.name),
                blend_id: (apiBlendList.length > 0 ? apiBlendList : fallbackBlendList)
                    .map(blend => blend.id),
                count: String(showItem?.CountType ?? showItem?.count ?? ''),
                count_no: String(showItem?.count ?? ''),
                count_id: selectedCountId,
                ply: apiPly,
                ply_id: selectedPly?.id ? String(selectedPly.id) : apiPly,
                subtype_id: apiSubTypeId,
                subtype_name: apiSubTypeName,
                others: showItem?.other ?? '',
                name: showItem?.itmname || ''
            }));

            setSubItemFormLoading(false);

        } catch (error) {
            console.log('Create New Sub Item yarnitemshow error:', error);
            setSubItemFormLoading(false);
            setSubItemOpeningLoading(false);
            setSubItemTab('LIST');
            setShowSubItemCard(true);
            setCurrentScreen('SUB_ITEM');
            Alert.alert('Error', 'Unable to load main item details.');
        }
    };

    const handleSubItemCreate = async (item) => {
        setShowActionMenu(false);
        setActionItem(null);
        setSubItemParent(item);
        setSubItemTab('LIST');
        setShowSpunCard(false);
        setShowFilamentCard(false);
        setshowbrwosecard(false);
        setpartycard(false);
        setShowSubItemCard(true);
        setCurrentScreen('SUB_ITEM');
        await fetchSubItemList(item);
    };

    const handleSubItemModify = async (item) => {
        const parent = subItemParent;

        const itmcode = item?.itmcode;
        const strcode = FormState.values.yarnstrcode;
        const userPtype = await AsyncStorage.getItem('user_prptype');

        if (!itmcode) {
            Alert.alert('Error', 'Sub item code not found.');
            return;
        }

        // When Modify is clicked from the Sub Item List,
        // fetch the selected sub item's details using yarnitemshow.
        const payload = {
            itmcode,
            strcode,
            prptype: userPtype
        };

        console.log('Sub Item yarnitemshow Payload:', payload);

        try {
            setIsLoading(true);

            const response = await axios.get(
                `${API}/api/yarnitemshow`,
                getRequestConfig({
                    params: payload
                })
            );

            console.log('Sub Item yarnitemshow Response:', response?.data);

            const showItem = response?.data?.data?.maindata?.[0];

            if (!response?.data?.success || !showItem) {
                Alert.alert(
                    'Warning',
                    response?.data?.message || 'Sub item details not found.'
                );
                return;
            }

            // Keep the existing Sub Item Modify form flow,
            // but use the selected row's itmcode for the yarnitemshow request.
            setsubitemform(prev => ({
                ...prev,
                WNameCode: parent?.WNameCode || prev.WNameCode || '',
                WBlend: item?.WBlend || prev.WBlend || '',
                WYarnType: item?.WYarnType || prev.WYarnType || '',
                mitmcode: parent?.itmcode || item?.mitmcode || prev.mitmcode || '',
                ItmCode: item?.itmcode || prev.ItmCode || '',
                linkitmcode: item?.WNameCode || prev.linkitmcode || '',
                denier: item?.WDenier || item?.denier || prev.denier || '',
                count_no: item?.WCount || item?.count || prev.count_no || '',
                others: item?.WOther || item?.other || prev.others || '',
            }));

            setIsModifyMode(true);
            setSubItemTab('CREATE');
        } catch (error) {
            console.log('Sub Item yarnitemshow error:', error);
            Alert.alert('Error', 'Unable to load sub item details.');
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Load selected Sub Item details from yarnitemshow and map the complete response into the Sub Item Modify form.
    const handleSubItemModifyShow = async (item) => {
        const parent = subItemParent;
        const itmcode = item?.itmcode;
        const strcode = FormState.values.yarnstrcode;
        const userPtype = await AsyncStorage.getItem('user_prptype');

        if (!itmcode) {
            Alert.alert('Error', 'Sub item code not found.');
            return;
        }

        const payload = {
            itmcode,
            strcode,
            prptype: userPtype
        };

        console.log('Sub Item Modify Show Payload:', payload);

        try {
            setIsLoading(true);

            const response = await axios.get(
                `${API}/api/yarnitemshow`,
                getRequestConfig({
                    params: payload
                })
            );

            console.log('Sub Item Modify Show Response:', response?.data);

            const showItem = response?.data?.data?.maindata?.[0];

            if (!response?.data?.success || !showItem) {
                Alert.alert(
                    'Warning',
                    response?.data?.message || 'Sub item details not found.'
                );
                return;
            }

            // BlendDisplay -> Blend textbox rows + percentages.
            const apiBlendList = Array.isArray(showItem?.BlendDisplay)
                ? showItem.BlendDisplay
                    .map(blend => ({
                        id: String(blend?.id ?? ''),
                        name: blend?.name || '',
                        per: String(blend?.per ?? '')
                    }))
                    .filter(blend => blend.name)
                : [];

            setBlendList(apiBlendList);

            // WPly -> actual Ply dropdown object.
            const apiPly = String(showItem?.WPly ?? '');
            const matchedPly =
                (plydata || []).find(p => String(p?.ply ?? '') === apiPly) ||
                (plydata || []).find(p => String(p?.id ?? '') === apiPly);
            const selectedPly = matchedPly || (apiPly ? { id: apiPly, ply: apiPly } : []);
            setselectedsubply(selectedPly);

            // subyarntype/subyarntypename -> actual Yarn Type dropdown object.
            const apiSubTypeId = String(showItem?.subyarntype ?? '');
            const apiSubTypeName = String(showItem?.subyarntypename ?? '');
            const matchedSubType =
                (subitemtypedata || []).find(type => String(type?.id ?? '') === apiSubTypeId) ||
                (subitemtypedata || []).find(type => String(type?.name ?? '') === apiSubTypeName);
            const selectedSubType =
                matchedSubType ||
                (apiSubTypeId || apiSubTypeName
                    ? { id: apiSubTypeId, name: apiSubTypeName }
                    : []);

            setselectedsubitemtypedata(selectedSubType);
            setselectedsubitem(selectedSubType);

            // Set all Sub Item form fields from yarnitemshow response.
            setsubitemform(prev => ({
                ...prev,
                WNameCode: parent?.WNameCode || showItem?.itmname || '',
                WBlend: showItem?.blend ?? '',
                WYarnType: parent?.WYarnType || item?.WYarnType || prev.WYarnType || '',
                mitmcode: parent?.itmcode || item?.mitmcode || prev.mitmcode || '',
                ItmCode: String(showItem?.itmcode || itmcode),
                linkitmcode: showItem?.maincode || '',
                denier: String(showItem?.denier ?? ''),
                blend: apiBlendList.map(blend => blend.name),
                blend_id: apiBlendList.map(blend => blend.id),
                count: String(showItem?.count ?? ''),
                count_no: String(showItem?.count ?? ''),
                count_id: String(showItem?.count ?? ''),
                ply: apiPly,
                ply_id: selectedPly?.id ? String(selectedPly.id) : apiPly,
                subtype_id: apiSubTypeId,
                subtype_name: apiSubTypeName,
                others: showItem?.other ?? '',
                name: showItem?.itmname || ''
            }));

            setIsModifyMode(true);
            setSubItemTab('CREATE');
        } catch (error) {
            console.log('Sub Item Modify Show error:', error);
            Alert.alert('Error', 'Unable to load sub item details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubItemDelete = (item) => {
        if (!item) return;

        console.log('Delete Sub Item:', item);

        // Close Item Actions first.
        setShowActionMenu(false);
        setActionItem(null);

        // Store exactly the row selected for deletion.
        setDeleteTarget(item);
        setDeleteTargetType('SUB');
        setDeletePermissionVisible(true);
    };

    const confirmDeleteItem = async () => {
        if (!deleteTarget || deleteLoading) return;

        // The selected row's own item code is always used.
        const itemCode =
            deleteTarget?.itmcode ||
            deleteTarget?.mitmcode ||
            deleteTarget?.ItmCode ||
            '';

        if (!itemCode) {
            setDeletePermissionVisible(false);
            setDeleteTarget(null);
            Alert.alert(
                'Delete Item',
                'Item code not found. Unable to delete this item.'
            );
            return;
        }

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const prptype =
            deleteTarget?.prptype ??
            deleteTarget?.PrpType ??
            deleteTarget?.PRPTYPE ??
            deleteTarget?.WPrpType ??
            userPtype;

        const strcode = FormState.values.yarnstrcode || '';

        const payload = {
            prptype,
            itmcode: itemCode,
            strcode,
            txntype: 'yarn_creation_item_master',
        };

        console.log('yarnitemdelete Payload:', payload);
        console.log('yarnitemdelete Type:', deleteTargetType);

        setDeleteLoading(true);

        try {
            const response = await axios.post(
                `${API}/api/yarnitemdelete`,
                getRequestConfig({ params: payload })
            );

            console.log('yarnitemdelete Response:', response?.data);

            const message =
                response?.data?.response?.message ||
                response?.data?.data?.response?.message ||
                response?.data?.message ||
                'Delete completed successfully.';

            if (response?.data?.success === true) {
                // Close permission after successful delete.
                setDeletePermissionVisible(false);
                setDeleteTarget(null);

                // Refresh only the list from which the delete was performed.
                if (deleteTargetType === 'MAIN') {
                    await fetchbrowse(activeTab);
                } else if (subItemParent?.itmcode) {
                    await fetchSubItemList(subItemParent);
                }

                setDeleteLoading(false);
                Alert.alert('Success', message);
            } else {
                setDeleteLoading(false);
                Alert.alert('Delete Failed', message);
            }
        } catch (error) {
            console.log('yarnitemdelete error:', error);
            setDeleteLoading(false);
            Alert.alert(
                'Delete Failed',
                'Unable to delete item. Please try again.'
            );
        }
    };

    const handleBrowseItem = async (item) => {
        setShowActionMenu(false);
        setActionItem(null);

        // Remember that Browse Item was opened from the Sub Item LIST.
        // This makes Party -> Back/Cancel return to the same Sub Item LIST.
        const openedFromSubItemList = currentScreen === 'SUB_ITEM' && subItemTab === 'LIST';
        setPartyReturnToSubItemList(openedFromSubItemList);
        setBrowseParentItem(item);
        setSelectedBrowseItem(item);
        await fetchpartydata();
        await fetchpartybrowse(activeTab, item?.itmcode);

        setpartyForm({
            accountname: '',
            acccode: '',
            ItemName: ''
        });
        setselectedparty([]);
        setpartycard(true);
        setshowbrwosecard(false);
        setCurrentScreen('PARTY');
    };

    const goBackFromParty = useCallback(() => {
        setpartycard(false);
        setShowActionMenu(false);
        setActionItem(null);

        if (partyReturnToSubItemList) {
            // Return to the exact Sub Item LIST from which Browse Item was opened.
            setshowbrwosecard(false);
            setShowSubItemCard(true);
            setSubItemTab('LIST');
            setCurrentScreen('SUB_ITEM');

            // Refresh only the Sub Item list, not the outer Browse screen.
            if (subItemParent?.itmcode) {
                fetchSubItemList(subItemParent);
            }
        } else {
            // Normal Browse screen flow remains unchanged.
            setshowbrwosecard(true);
            setCurrentScreen('BROWSE');
        }
    }, [partyReturnToSubItemList, subItemParent]);

    // Android hardware back from Party/Browse Item.
    // If Party was opened from Sub Item LIST, return to that same list.
    useEffect(() => {
        if (currentScreen !== 'PARTY') return;

        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            goBackFromParty();
            return true;
        });

        return () => subscription.remove();
    }, [currentScreen, goBackFromParty]);

    const handleCardMenu = (item) => {
        setActionItem(item);
        setShowActionMenu(true);
    };

    const fetchbrowsedata = async (item) => {
        setBrowseParentItem(item);
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                mitmcode: item.itmcode,
                txntype: 'yarn_creation_item_master',
            };

            console.log("browsepayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnwbrowse`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("browse API Response:", response);

            // const data = response?.data?.data?.maindata || [];
            const data = Array.isArray(response?.data?.data?.maindata)
                ? response.data.data.maindata
                : [];
            if (response?.data?.success && response?.data?.data?.maindata?.length > 0) {
                setbrowsedata(data);
                setShowSpunCard(false);
                setShowFilamentCard(false);
                setShowSubItemCard(false);
                setpartycard(false);
                setshowbrwosecard(true);
                setCurrentScreen('BROWSE');
            } else {
                setbrowsedata([]);
                setShowSpunCard(false);
                setShowFilamentCard(false);
                setShowSubItemCard(false);
                setpartycard(false);
                setshowbrwosecard(true);
                setCurrentScreen('BROWSE');
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

    // const fetchbrowsedata = async (item) => {
    //     console.log("Function called");
    //     try {
    //         setBrowseLoading(true);

    //         const userPtype = await AsyncStorage.getItem('user_prptype');
    //         // if (!item?.mitmcode) {
    //         //     console.log("mitmcode missing:", item);
    //         //     setBrowseLoading(false);
    //         //     return;
    //         // }

    //         const response = await axios.get(`${API}/api/yarnwbrowse`, {
    //             params: {
    //                 prptype: userPtype,
    //                 mitmcode: item.mitmcode,
    //                 txntype: 'yarn_creation_item_master'
    //             }
    //         });

    //         const data = Array.isArray(response?.data?.data?.maindata)
    //             ? response.data.data.maindata
    //             : [];

    //         setbrowsedata(data);

    //         // ✅ OPEN SCREEN ONLY AFTER DATA COMES
    //         setshowbrwosecard(true);

    //     } catch (error) {
    //         console.log("API Error:", error);
    //         setbrowsedata([]);
    //     } finally {
    //         setBrowseLoading(false);
    //     }
    // };

    useEffect(() => {
        if (!token) return;

        // These master APIs belong to the main Spun/Filament forms.
        // Do not prefetch them while the Sub Item LIST is visible.
        if (currentScreen !== 'SPUN_FORM' && currentScreen !== 'FILAMENT_FORM') {
            return;
        }

        if (FormState.values.prpcode && FormState.values.yarnstrcode) {
            fetchBlenddata();
            fetchBlendcount();
            fetchBlendply();
            fetchtype();
            fetchlustre();
            fetchOthresdata();
            fetchItemdata();
        }
    }, [
        FormState.values.prpcode,
        FormState.values.yarnstrcode,
        activeTab,
        token,
        currentScreen
    ]);

    // const buildMainItem = (values) => {
    //     const { count_no, count, ply, blend, others } = values;

    //     if (!count_no || !count || !ply || !blend || !others) return '';

    //     let blendStr = '';

    //     if (Array.isArray(blend)) {
    //         // ✅ handles array of objects OR array of strings
    //         blendStr = blend
    //             .map(b => typeof b === 'object' ? b?.name : b)
    //             .filter(Boolean)
    //             .join(' ');
    //     }
    //     else if (typeof blend === 'object') {
    //         blendStr = blend?.name || '';
    //     }
    //     else {
    //         blendStr = blend;
    //     }

    //     return `${count_no}/${ply} ${count} ${blendStr} ${others}`;
    // };

    // const calculateDenier = (values) => {
    //     const count = parseFloat(values.count_no);
    //     const ply = parseFloat(values.ply);

    //     if (!count || !ply) return '';

    //     return ((5315 / (count / ply)) + 5).toFixed(2);
    // };

    const buildMainItem = (values) => {
        const { count_no, count, ply, blend, others } = values;

        if (!count_no || !count || !ply || !blend) return '';

        let blendStr = '';

        if (Array.isArray(blend)) {
            blendStr = blend
                .map(b => typeof b === 'object' ? b?.name : b)
                .filter(Boolean)
                .join(' ');
        } else if (typeof blend === 'object') {
            blendStr = blend?.name || '';
        } else {
            blendStr = blend;
        }

        // 🔥 main fix
        return [
            `${count_no}/${ply}`,
            count,
            blendStr,
            others   // 👈 optional
        ]
            .filter(val => val && val.toString().trim() !== '') // ❌ remove blank
            .join(' '); // ✅ clean string
    };

    const roundDenier = (value: number) => {
        if (!Number.isFinite(value)) return '';

        // Always round UP to nearest 5
        return String(Math.ceil(value / 5) * 5);
    };

    const calculateDenier = (values, formula) => {
        const count = parseFloat(values.count_no);
        const ply = parseFloat(values.ply);

        if (!count || !ply || !formula) return '';

        try {
            // replace variables
            let expr = formula
                .replace(/Count/g, count)
                .replace(/ply/g, ply);

            // evaluate expression
            // const result = eval(expr);

            // return Number(result).toFixed(2);

            const result = eval(expr);

            return roundDenier(Number(result));

        } catch (e) {
            console.log("Formula error:", e);
            return '';
        }
    };

    const filamentbuildMainItem = (values) => {
        const { count_no, count, ply, lustre, type, others } = values;

        if (!count_no || !count || !ply || !lustre || !type) return '';

        return `${count_no}/${ply} ${count} ${lustre} ${type} ${others || ''}`.trim();
    };

    const calculatefilamentDenier = (values, formula) => {
        const count = Number(values.count_no);
        const ply = Number(values.ply);
        if (!count || !ply) return '';

        // return (count * ply + 5).toString();
        try {
            // replace variables
            let expr = formula
                .replace(/Count/g, count)
                .replace(/ply/g, ply);

            // evaluate expression
            // const result = eval(expr);

            // return Number(result).toFixed(2);

            const result = eval(expr);

            return roundDenier(Number(result));

        } catch (e) {
            console.log("Formula error:", e);
            return '';
        }
    };

    // const buildSubItem = (values, blendList) => {
    //     const { count, ply, name } = values;

    //     if (!count || !ply) return '';

    //     let blendPart = '';

    //     if (blendList?.length > 0) {
    //         blendPart = blendList
    //             .map(b => `${b.name}${b.per ? ` ${b.per}%` : ''}`)
    //             .join(' ');
    //     }

    //     return `${count}/${ply} ${blendPart} ${name || ''}`.trim();
    // };

    const buildSubItem = (values, blendList) => {
        const { count_no, ply, others } = values;

        if (!count_no || !ply) return '';

        const total = blendList.reduce(
            (sum, item) => sum + Number(item.per || 0),
            0
        );

        if (blendList.length > 0 && total !== 100) {
            return '';  // 🔥 yaha control
        }

        // 🔥 Blend part
        let blendPart = '';

        if (blendList?.length > 0) {
            blendPart = blendList
                .map(b => `${b.name}${b.per ? ` ${b.per}%` : ''}`)
                .join(' ');
        }

        return `${count_no}/${ply} ${blendPart} ${others || ''}`.trim();
    };

    // const calculateSubitemDenier = (values) => {
    //     const count = Number(values.count_no);
    //     const ply = Number(values.ply);
    //     if (!count || !ply) return '';
    //     return (count * ply).toString();
    // };

    const calculateSubitemDenier = (values) => {
        const count = Number(values.count_no);
        const ply = Number(values.ply);

        if (!count || !ply) return '';

        const countType = countdata?.find(
            ct => String(ct.id) === String(values.WCounttype)
        );

        // Prefer the formula restored from yarnitemshow -> CountTypeId
        // and fall back to the count master formula.
        const formula = values.formula || countType?.formula;

        console.log("Sub Item Count:", count);
        console.log("Sub Item Ply:", ply);
        console.log("Sub Item WCounttype:", values.WCounttype);
        console.log("Sub Item Formula:", formula);

        if (!formula) return '';

        try {
            const expr = formula
                .replace(/Count/g, count)
                .replace(/ply/g, ply);

            // const result = eval(expr);

            // return Number(result).toFixed(2);

            const result = eval(expr);

            return roundDenier(Number(result));

        } catch (error) {
            console.log("Sub Item Formula Error:", error);
            return '';
        }
    };

    const handleLoadPress = () => {
        setIsDrawerVisible(false);
    };

    const validateSpunForm = () => {
        if (!spunForm.blend_id) {
            return "Please select Blend";
        }
        // if (!spunForm.others) {
        //     return "Please Enter Other Value";
        // }
        if (!spunForm.count_no) {
            return "Please Enter Count Value";
        }
        if (!spunForm.count_id) {
            return "Please select Count";
        }
        if (!spunForm.ply_id) {
            return "Please select Ply";
        }
        // if (!spunForm.ItmCode) {
        //     return "Please select Link Item";
        // }
        // if (!spunForm.linkitmcode) {
        //     return "Main Item is required";
        // }

        return null;
    };

    // Modify uses the SAME payload structure/values as Add.
    // The only difference is the POST endpoint: /api/yarncreationmodify.
    const handleModifySpun = async () => {
        await handleaddspun();
    };

    const handleaddspun = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const errorMessage = validateSpunForm();
        if (errorMessage) {
            Alert.alert("Validation", errorMessage);
            return;
        }
        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();
            const Payload = {
                maincode: spunForm.linkitmcode,
                denier: spunForm.denier,
                // blend: spunForm.blend_id,
                blend: Array.isArray(spunForm.blend_id)
                    ? spunForm.blend_id.join('/')
                    : spunForm.blend_id || '',
                counttype: spunForm.count_id,
                ply: spunForm.ply_id,
                linkitmcode: spunForm.ItmCode || '',
                prptype: userPtype,
                // prptype: 'S',
                txntype: 'yarn_creation_item_master',
                yarntype: activeTab == 'Spun' ? '1' : '2',
                strcode: FormState.values.yarnstrcode,
                count: spunForm.count_no,
                other: spunForm.others,
                ...(isModifyMode ? { itmcode: spunForm.ItmCode || '' } : {})
            };

            console.log("Spun Payload:", Payload);

            const response = await axios.post(
                `${API}/api/${isModifyMode ? 'yarncreationmodify' : 'yarnadd'}`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log(isModifyMode ? "spun modify response" : "spun add response", response);
            if (response?.data?.success) {

                const savedItemCode =
                    response?.data?.data?.data?.itmcode ||
                    spunForm.ItmCode ||
                    spunForm.linkitmcode;

                console.log("savedItemCode", savedItemCode);

                Alert.alert(
                    "Success",
                    isModifyMode
                        ? `Item ${savedItemCode} modified successfully.`
                        : `Item ${savedItemCode} Saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setIsLoading(true);
                                setSpunForm({
                                    blend: '',
                                    blend_id: '',
                                    count: '',
                                    count_id: '',
                                    ply: '',
                                    ply_id: '',
                                    linkitmcode: '',
                                    denier: '',
                                    ItmCode: '',
                                    count_no: '',
                                    others: ''
                                });
                                setselectedblend([]);
                                setselectedcount([]);
                                setselectedply([]);
                                setselecteditem([]);
                                setShowSpunCard(false);
                                setCurrentScreen('LIST');
                                fetchbrowse(activeTab);
                                setIsLoading(false);
                            }
                        }
                    ]
                );
            }
            else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }

        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const validateFilamentForm = () => {
        if (!filamentForm.blend_id) {
            return "Please select Blend";
        }
        if (!filamentForm.count_id) {
            return "Please select Count Type";
        }
        if (!filamentForm.count_no) {
            return "Please enter Count value";
        }
        if (!filamentForm.ply_id) {
            return "Please select Ply";
        }
        if (!filamentForm.type_id) {
            return "Please Filament select Type";
        }
        if (!filamentForm.lustre_id) {
            return "Please select Lustre";
        }
        // if (!filamentForm.others) {
        //     return "Please Enter Other value";
        // }
        // if (!filamentForm.ItmCode) {
        //     return "Please select Link Item";
        // }

        // if (!filamentForm.linkitmcode) {
        //     return "Main Item is required";
        // }

        return null; // ✅ all valid
    };

    // Modify uses the SAME payload structure/values as Add.
    // The only difference is the POST endpoint: /api/yarncreationmodify.
    const handleModifyFilament = async () => {
        await handleaddfilament();
    };

    const handleaddfilament = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        const errorMessage = validateFilamentForm();
        if (errorMessage) {
            Alert.alert("Validation", errorMessage);
            return;
        }

        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();

            const Payload = {
                maincode: filamentForm.linkitmcode,
                denier: filamentForm.denier,
                blend: Array.isArray(filamentForm.blend_id)
                    ? filamentForm.blend_id.join('/')
                    : filamentForm.blend_id || '',
                counttype: filamentForm.count_id,
                ply: filamentForm.ply_id,
                linkitmcode: filamentForm.ItmCode || '',
                // other: filamentForm.other_id,
                other: filamentForm.others,
                lustre: filamentForm.lustre_id,
                type: filamentForm.type_id,
                prptype: userPtype,
                // prptype: 'S',
                txntype: 'yarn_creation_item_master',
                yarntype: activeTab == 'Spun' ? '1' : '2',
                strcode: FormState.values.yarnstrcode,
                count: filamentForm.count_no,
                ...(isModifyMode ? { itmcode: filamentForm.ItmCode || '' } : {})
            };
            console.log("Filament Payload:", Payload);
            const response = await axios.post(
                `${API}/api/${isModifyMode ? 'yarncreationmodify' : 'yarnadd'}`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log(isModifyMode ? "filament modify response" : "filament save API Response:", response);
            if (response?.data?.success === true) {

                const savedItemCode =
                    response?.data?.data?.data?.itmcode ||
                    filamentForm.ItmCode ||
                    filamentForm.linkitmcode;

                Alert.alert(
                    "Success",
                    isModifyMode
                        ? `Item ${savedItemCode} modified successfully.`
                        : `Item ${savedItemCode} saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setFilamentForm({
                                    blend: '',
                                    blend_id: '',
                                    count: '',
                                    count_id: '',
                                    ply: '',
                                    ply_id: '',
                                    type: '',
                                    type_id: '',
                                    lustre: '',
                                    lustre_id: '',
                                    name: '',
                                    other_id: '',
                                    linkitmcode: '',
                                    denier: '',
                                    ItmCode: '',
                                    count_no: '',
                                    others: ''
                                });

                                setselectedfilamentblend([]);
                                setselectedfilamentcount([]);
                                setselectedfilamentply([]);
                                setselectedtype([]);
                                setselectedlustre([]);
                                setselectedothers([]);
                                setselectedfilamentitem([]);

                                setShowFilamentCard(false);
                                setCurrentScreen('LIST');
                                setIsModifyMode(false);
                                fetchbrowse(activeTab);
                            }
                        }
                    ]
                );

            } else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API error:", error);
                Alert.alert("Error", "Something went wrong");
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = async () => {
        setCardSearch('');

        // ADD must never inherit data from the previous MODIFY operation.
        // Clear both forms before opening the selected tab's form.
        if (cancelToken.current) {
            // cancelToken.current.cancel('Starting Add mode');
            cancelToken.current = null;
        }
        resetYarnForms();

        if (activeTab === 'Spun') {
            await soshow(); // ✅ ab valid hai

            setShowSubItemCard(false);
            setshowbrwosecard(false);
            setpartycard(false);
            setShowSpunCard(true);
            setShowFilamentCard(false);
            setIsModifyMode(false);
            setCurrentScreen('SPUN_FORM');
        } else {
            await soshow();
            setShowSubItemCard(false);
            setshowbrwosecard(false);
            setpartycard(false);
            setShowFilamentCard(true);
            setShowSpunCard(false);
            setIsModifyMode(false);
            setCurrentScreen('FILAMENT_FORM');
        }
    };

    const subitemvalidate = () => {
        if (!subitemform.WNameCode) {
            Alert.alert("Validation", "Yarn Main Code required");
            return false;
        }

        if (!blendList || blendList.length === 0) {
            Alert.alert("Validation", "Please select blend");
            return false;
        }

        let total = 0;

        for (let i = 0; i < blendList.length; i++) {
            const per = Number(blendList[i].per);

            if (!per || per <= 0) {
                Alert.alert("Validation", `Enter valid % for ${blendList[i].name}`);
                return false;
            }

            total += per;
        }

        if (total !== 100) {
            Alert.alert("Validation", `Total percentage must be 100. Current: ${total}`);
            return false;
        }

        // if (!subitemform.count_id) {
        //     Alert.alert("Validation", "Please select Count");
        //     return false;
        // }

        if (!subitemform.count_no) {
            Alert.alert("Validation", "Please enter count value");
            return false;
        }

        if (!subitemform.ply_id) {
            Alert.alert("Validation", "Please select Ply");
            return false;
        }

        if (!subitemform.subtype_id) {
            Alert.alert("Validation", "Please enter yarn type");
            return false;
        }

        // if (!subitemform.others) {
        //     Alert.alert("Validation", "Please enter others Value");
        //     return false;
        // }
        if (!subitemform.linkitmcode) {
            Alert.alert("Validation", "Please enter Sub Item Name");
            return false;
        }

        // if (!subitemform.ItmCode) {
        //     Alert.alert("Validation", "Please select Link Item");
        //     return false;
        // }

        return true;  // 🔥 MOST IMPORTANT
    };

    const handleModifySubItem = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const isValid = subitemvalidate();

        if (!isValid) return;

        // Modify payload = same fields as Add Sub Item payload + itmcode.
        const finalBlendList = [...blendList];

        try {
            setSubItemSaveLoading(true);

            const source = axios.CancelToken.source();

            const Payload = {
                maincode: subitemform.linkitmcode,
                denier: subitemform.denier,
                blendid: subitemform.WBlend,
                count: subitemform.count_no,
                ply: subitemform.ply_id,
                mitmcode: subitemform.mitmcode || '',
                blend_names: finalBlendList.map(b => ({
                    id: b.id,
                    name: b.name,
                    per: Number(b.per || 0)
                })),
                prptype: userPtype,
                txntype: 'yarn_creation_item_master',
                yarntype: subitemform.WYarnType,
                strcode: FormState.values.yarnstrcode,
                linkitmcode: subitemform.ItmCode || '',
                other: subitemform.others || '',
                subyarntype: subitemform.subtype_id || '',
                itmcode: subitemform.ItmCode || ''
            };

            console.log("Sub Item Modify Payload:", Payload);

            const response = await axios.post(
                `${API}/api/yarncreationmodify`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );

            console.log("Sub Item modify response", response);

            if (response?.data?.success) {
                const savedItemCode =
                    response?.data?.data?.data?.itmcode ||
                    subitemform.ItmCode ||
                    '';

                Alert.alert(
                    "Success",
                    `Sub Item ${savedItemCode} updated successfully.`,
                    [{
                        text: "OK",
                        onPress: () => {
                            setsubitemform({
                                blend: '',
                                count: '',
                                ply: '',
                                linkitmcode: '',
                                denier: '',
                                blend_id: '',
                                count_id: '',
                                ply_id: '',
                                ItmCode: '',
                                type_id: '',
                                type: '',
                                lustre_id: '',
                                lustre: '',
                                other_id: '',
                                name: '',
                                Per: '',
                                mitmcode: '',
                                WBlend: '',
                                WYarnType: '',
                                WNameCode: '',
                                others: '',
                                subtype_id: '',
                                subtype_name: '',
                                count_no: ''
                            });

                            setBlendList([]);
                            setselectedcount([]);
                            setselectedply([]);
                            setselectedmitem([]);
                            setselectedothers([]);
                            setselectedsubitem([]);
                            setselectedsubply([]);
                            setselectedsubcount([]);
                            setselectedsubitemtypedata([]);

                            setIsModifyMode(false);
                            goToSubItemMainList();
                        }
                    }]
                );
            } else {
                Alert.alert(
                    "Warning",
                    response?.data?.message || "Unable to update Sub Item."
                );
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("Sub Item modify error:", error);
                Alert.alert("Error", "Unable to update Sub Item.");
            }
        } finally {
            setSubItemSaveLoading(false);
        }
    };

    const handlesubitemadd = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        console.log("yarn type", subitemform.WYarnType)
        const isValid = subitemvalidate();

        if (!isValid) return;
        //   if (!subitemvalidate()) return;
        const finalBlendList = [...blendList];
        try {
            setSubItemSaveLoading(true);
            const source = axios.CancelToken.source();
            const Payload = {
                maincode: subitemform.linkitmcode,
                denier: subitemform.denier,
                blendid: subitemform.WBlend,
                // count: subitemform.count_id,
                count: subitemform.count_no,
                ply: subitemform.ply_id,
                mitmcode: subitemform.mitmcode || '',
                blend_names: finalBlendList.map(b => ({
                    id: b.id,
                    name: b.name,
                    per: Number(b.per || 0)
                })),
                prptype: userPtype,
                // prptype: 'S',
                txntype: 'yarn_creation_item_master',
                yarntype: subitemform.WYarnType,
                strcode: FormState.values.yarnstrcode,
                linkitmcode: subitemform.ItmCode || '',
                other: subitemform.others || '',
                subyarntype: subitemform.subtype_id || ''
            };

            console.log("Spun Payload:", Payload);

            const response = await axios.post(
                `${API}/api/addyarnsubitem`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log("spun add response", response);
            if (response?.data?.success) {
                const newItemCode = response?.data?.data?.data?.itmcode;
                Alert.alert(
                    "Success",
                    `Item ${newItemCode} Saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setIsLoading(true);
                                setsubitemform({
                                    blend: '',
                                    count: '',
                                    ply: '',
                                    linkitmcode: '',
                                    denier: '',
                                    blend_id: '',
                                    count_id: '',
                                    ply_id: '',
                                    ItmCode: '',
                                    type_id: '',
                                    type: '',
                                    lustre_id: '',
                                    lustre: '',
                                    other_id: '',
                                    name: '',
                                    Per: '',
                                    mitmcode: '',
                                    WBlend: '',
                                    WYarnType: '',
                                    WNameCode: '',
                                    others: '',
                                    subtype_id: '',
                                    subtype_name: '',
                                    count_no: ''
                                });
                                setBlendList([]);
                                setselectedcount([]);
                                setselectedply([]);
                                setselectedmitem([]);
                                setselectedothers([]);
                                setselectedsubitem([]);
                                setselectedsubply([]);
                                setselectedsubcount([]);
                                setselectedsubitem([]);
                                goToSubItemMainList();
                            }
                        }
                    ]
                );
            }
            else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }
        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setSubItemSaveLoading(false);
        }
    };

    

    const fetchbrowse = async (tabValue) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                // prptype: 'S',
                strcode: FormState.values.yarnstrcode||'002',
                txntype: 'yarn_creation_item_master',
                yarntype: tabValue == 'Spun' ? '1' : '2',
            };

            console.log("master historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/getyarnmasteritem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Master API Response:", response, historyPayload);

            const data = response?.data?.data?.data || [];
            const mapped = response?.data?.data?.mapped_data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setdata(data);
            } else {
                setdata([]);
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

    const partyitemvalidation = () => {
        if (!partyForm.acccode) {
            Alert.alert("Validation", "Party Can not be blank");
            return false;
        }
        if (!partyForm.ItemName) {
            Alert.alert("Validation", "Please enter Item value");
            return false;
        }
        return true;
    };

    const handleaddparty = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const isValid = partyitemvalidation();
        if (!isValid) return;
        if (!selectedBrowseItem?.itmcode) {
            Alert.alert("Error", "Please select item from list");
            return;
        }
        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();
            const Payload = {
                prptype: userPtype,
                parcode: partyForm.acccode,
                parname: partyForm.accountname,
                // itmcode: browseParentItem.itmcode,
                itmcode: selectedBrowseItem?.itmcode,
                // prptype: 'S',
                itmname: partyForm.ItemName,
                txntype: 'yarn_creation_item_master',
                yarntype: subitemform.WYarnType,
                strcode: FormState.values.yarnstrcode,
            };

            console.log("party Payload:", Payload);

            const response = await axios.post(
                `${API}/api/yarnitemd1add`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log("party add response", response);
            if (response?.data?.success) {
                const newItemCode = response?.data?.data?.data?.itmcode;
                Alert.alert(
                    "Success",
                    `Item Saved successfully.`,
                    [
                        {
                            text: "OK",
                            // onPress: () => {
                            //     setIsLoading(true);
                            //     setpartyForm({
                            //         accountname: '',
                            //         acccode: '',
                            //         ItemName: ''
                            //     });
                            //     setselectedparty([]);
                            //     setpartycard(false);
                            //     await fetchpartybrowse(activeTab, browseParentItem.itmcode);

                            //     fetchbrowse(activeTab);
                            // }
                            onPress: async () => {
                                setpartyForm({
                                    accountname: '',
                                    acccode: '',
                                    ItemName: ''
                                });

                                setselectedparty([]);
                                // setpartycard(false);

                                await fetchpartybrowse(activeTab, selectedBrowseItem?.itmcode);

                                // fetchbrowse(activeTab);
                            }
                        }
                    ]
                );
            }
            else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }
        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchpartybrowse = async (tabValue, itmcode) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                // cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                itmcode: itmcode,
                prptype: userPtype,
                strcode: FormState.values.yarnstrcode,
                txntype: 'yarn_creation_item_master',
                yarntype: tabValue == 'Spun' ? '1' : '2',
                prpcode: 'SIP'
            };

            console.log("party historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnitemd1browse`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("party API Response:", response);

            const data = response?.data?.data?.maindata || [];
            const mapped = response?.data?.data?.mapped_data || [];
            if (response?.data?.success && response?.data?.data?.maindata?.length > 0) {
                setbrowserpartydata(data);
            } else {
                setbrowserpartydata([]);
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

    // useEffect(() => {
    //     fetchbrowse(activeTab);
    //     soshow();
    // }, [activeTab]);

    useEffect(() => {
        if (!token) return;
        const loadData = async () => {
            await soshow();              // ✅ pehle
            await fetchbrowse(activeTab); // ✅ baad mein
        };

        loadData();
    }, [activeTab, token]);

    const getTotalPercentage = (list) => {
        return list.reduce((sum, item) => sum + Number(item.per || 0), 0);
    };

    const total = getTotalPercentage(blendList);

    const filteredData = useMemo(() => {
        const search = cardSearch.trim().toLowerCase();

        if (!search) return data;

        return data.filter(item =>
            Object.values(item || {}).some(value =>
                String(value ?? '').toLowerCase().includes(search)
            )
        );
    }, [data, cardSearch]);

    /*-------------------------------------------------browse carddddddddddd--------------------------------------------------*/
    /*-------------------------------------------browse over--------------------------------------------------------------------*/

    // useEffect(() => {
    //     soshow();
    // }, []);

    const yarnContext = {
        isLoading,
        setIsLoading,
        subItemOpeningLoading,
        setSubItemOpeningLoading,
        subItemFormLoading,
        subItemSaveLoading,
        setSubItemSaveLoading,
        getDataSaved,
        setDataSaved,
        setupDate,
        setSetupDate,
        showPicker,
        setShowPicker,
        isDrawerVisible,
        setIsDrawerVisible,
        selectedYear,
        setSelectedYear,
        getAllPropertyData,
        setAllPropertyData,
        FormState,
        setFormState,
        spunForm,
        setSpunForm,
        filamentForm,
        setFilamentForm,
        subitemform,
        setsubitemform,
        mappedData,
        setMappedData,
        blendList,
        setBlendList,
        getAllYearData,
        setAllYearData,
        activeTab,
        setActiveTab,
        showSpunCard,
        setShowSpunCard,
        showFilamentCard,
        setShowFilamentCard,
        blenddata,
        setblenddata,
        selectedblend,
        setselectedblend,
        selectedfilamentblend,
        setselectedfilamentblend,
        countdata,
        setcountdata,
        selectedcount,
        setselectedcount,
        selectedsubcount,
        setselectedsubcount,
        selectedfilamentcount,
        setselectedfilamentcount,
        plydata,
        setplydata,
        selectedply,
        setselectedply,
        selectedfilamentply,
        setselectedfilamentply,
        typedata,
        settypedata,
        selectedtype,
        setselectedtype,
        lustredata,
        setlustredata,
        selectedlustre,
        setselectedlustre,
        othersdata,
        setothersdata,
        selectedothers,
        setselectedothers,
        itemdata,
        setitemdata,
        selecteditem,
        setselecteditem,
        selectedsubitem,
        setselectedsubitem,
        mitemdata,
        setmitemdata,
        data,
        setdata,
        selectedmitem,
        setselectedmitem,
        selectedfilamentitem,
        setselectedfilamentitem,
        showSubItemCard,
        setShowSubItemCard,
        subItemTab,
        setSubItemTab,
        subItemParent,
        setSubItemParent,
        showbrwosecard,
        setshowbrwosecard,
        selectedsubply,
        setselectedsubply,
        subitemtypedata,
        setsubitemtypedata,
        selectedsubitemtypedata,
        setselectedsubitemtypedata,
        browsedata,
        setbrowsedata,
        browseLoading,
        setBrowseLoading,
        selectedItem,
        setSelectedItem,
        browseParentItem,
        setBrowseParentItem,
        selectedBrowseItem,
        setSelectedBrowseItem,
        partycard,
        setpartycard,
        partydata,
        setpartydata,
        partyForm,
        setpartyForm,
        selectedparty,
        setselectedparty,
        btnLoading,
        setBtnLoading,
        browserpartydata,
        setbrowserpartydata,
        cardSearch,
        setCardSearch,
        actionItem,
        setActionItem,
        showActionMenu,
        setShowActionMenu,
        isModifyMode,
        setIsModifyMode,
        currentScreen,
        setCurrentScreen,
        partyReturnToSubItemList,
        goBackFromParty,
        today,
        resetSpunForm,
        resetFilamentForm,
        resetYarnForms,
        goToListScreen,
        goToSubItemMainList,
        goBackFromSubItemList,
        cancelToken,
        getRequestConfig,
        fetchPropertyGroup,
        openDrawer,
        closeDrawer,
        soshow,
        fetchBlenddata,
        fetchBlendcount,
        fetchBlendply,
        fetchtype,
        fetchlustre,
        fetchmitem,
        fetchOthresdata,
        fetchItemdata,
        fetchyarntype,
        getCurrentFinancialYear,
        fetchpartydata,
        handleModifyItem,
        handleDeleteItem,
        handleSubItemCreate,
        fetchSubItemList,
        handleOpenSubItemForm,
        handleSubItemModify,
        handleSubItemModifyShow,
        handleSubItemDelete,
        handleBrowseItem,
        handleCardMenu,
        fetchbrowsedata,
        buildMainItem,
        roundDenier,
        calculateDenier,
        filamentbuildMainItem,
        calculatefilamentDenier,
        buildSubItem,
        calculateSubitemDenier,
        handleLoadPress,
        validateSpunForm,
        handleModifySpun,
        handleaddspun,
        validateFilamentForm,
        handleModifyFilament,
        handleaddfilament,
        handleAddClick,
        subitemvalidate,
        handlesubitemadd,
        handleModifySubItem,
        fetchbrowse,
        partyitemvalidation,
        handleaddparty,
        fetchpartybrowse,
        getTotalPercentage,
        total,
        CARD_COLORS1,
        filteredData,
        CARD_COLORS,
        token,
        username,
    };

    // Full-screen main item forms (Spun / Filament).
    // Sub Item screen is intentionally left unchanged below.
    const renderMainItemForm = (isSpun: boolean) => (
        <YarnManagementContext.Provider value={yarnContext}>
            <View style={{ flex: 1, backgroundColor: YARN_UI.canvas }}>
                <StatusBar barStyle="light-content" backgroundColor={YARN_UI.primary} />

                <SafeAreaView
                    edges={['top']}
                    style={{ backgroundColor: YARN_UI.primary }}
                >
                    <View style={yarnUi.browseHeader}>
                        <TouchableOpacity
                            style={yarnUi.headerBack}
                            onPress={goToListScreen}
                            activeOpacity={0.8}
                        >
                            <Icon name="arrow-back" size={23} color="#fff" />
                        </TouchableOpacity>

                        <View style={yarnUi.browseHeaderText}>
                            <Text style={yarnUi.browseTitle}>
                                {isSpun ? 'Spun Item' : 'Filament Item'}
                            </Text>
                            <Text style={yarnUi.browseSubTitle}>
                                {isSpun
                                    ? (isModifyMode ? 'Modify spun main item' : 'Create spun main item')
                                    : (isModifyMode ? 'Modify filament main item' : 'Create filament main item')}
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>

                <View style={{ flex: 1 }}>
                    {isSpun ? <SpunTab /> : <FilamentTab />}
                </View>

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
            </View>
        </YarnManagementContext.Provider>
    );

    if (showSpunCard) {
        return renderMainItemForm(true);
    }

    if (showFilamentCard) {
        return renderMainItemForm(false);
    }

    return (
        <YarnManagementContext.Provider value={yarnContext}>
            {/* <SafeAreaView style={{ flex: 1, backgroundColor: YARN_UI.primary }}>
                <StatusBar barStyle="light-content" backgroundColor={YARN_UI.primary} /> */}

            {currentScreen === 'SUB_ITEM' ? (
                <SubItemCreateTab />
            ) : currentScreen === 'BROWSE' ? (
                <BrowseTab />
            ) : currentScreen === 'PARTY' ? (
                <PartyTab />
            ) : (
                <View style={{ flex: 1, backgroundColor: YARN_UI.canvas }}>
                    <HeaderBarwithBack
                        userName={username}
                        header={'Yarn Managment System'}
                        subHeader={'Manage Your Yarn Items And Create Sub Items'}
                        breadcrumb={'Yarn managmen system'}
                        SearchBar={false}
                    />

                    <View style={{ flex: 1 }}>
                        <View style={yarnmanagementsystemstyle.container}>
                            <View style={yarnmanagementsystemstyle.mainCard}>
                                {currentScreen === 'LIST' && (
                                    <View style={yarnmanagementsystemstyle.tabContainer}>
                                        <TouchableOpacity
                                            style={[
                                                yarnmanagementsystemstyle.tab,
                                                activeTab === 'Spun' && yarnmanagementsystemstyle.activeTab,
                                            ]}
                                            onPress={() => {
                                                setActiveTab('Spun');
                                                setdata([]);
                                                setShowSpunCard(false);
                                                setShowFilamentCard(false);
                                                setCurrentScreen('LIST');
                                                fetchbrowse('Spun');
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    yarnmanagementsystemstyle.tabText,
                                                    activeTab === 'Spun' && yarnmanagementsystemstyle.activeTabText,
                                                ]}
                                            >
                                                Spun
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                yarnmanagementsystemstyle.tab,
                                                activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTab,
                                            ]}
                                            onPress={() => {
                                                setActiveTab('Filaments');
                                                setdata([]);
                                                setShowSpunCard(false);
                                                setShowFilamentCard(false);
                                                setCurrentScreen('LIST');
                                                fetchbrowse('Filaments');
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    yarnmanagementsystemstyle.tabText,
                                                    activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTabText,
                                                ]}
                                            >
                                                Filament
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {currentScreen === 'LIST' && (
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                            borderWidth: 1,
                                            borderColor: '#D9E2EC',
                                            borderRadius: 12,
                                            marginTop: 10,
                                            marginBottom: 10,
                                            paddingHorizontal: 12,
                                            height: 46,
                                            elevation: 2,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.08,
                                            shadowRadius: 4,
                                        }}
                                    >
                                        <Icon name="search" size={22} color="#64748B" />
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                marginLeft: 8,
                                                color: '#111827',
                                                fontSize: 14,
                                            }}
                                            placeholder="Search all fields..."
                                            placeholderTextColor="#94A3B8"
                                            value={cardSearch}
                                            onChangeText={setCardSearch}
                                        />
                                        {cardSearch.length > 0 && (
                                            <TouchableOpacity onPress={() => setCardSearch('')}>
                                                <Icon name="close" size={20} color="#64748B" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                <Modal
                                    visible={showActionMenu && !!actionItem}
                                    transparent
                                    animationType="slide"
                                    onRequestClose={() => {
                                        setShowActionMenu(false);
                                        setActionItem(null);
                                    }}
                                >
                                    <View style={yarnUi.actionBackdrop}>
                                        <View style={yarnUi.actionSheet}>
                                            <View style={yarnUi.grabber} />

                                            <View style={yarnUi.actionHead}>
                                                <View style={yarnUi.actionHeadIcon}>
                                                    <Icon name="inventory-2" size={23} color={YARN_UI.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={yarnUi.actionTitle}>Item Actions</Text>
                                                    <Text style={yarnUi.actionItemName} numberOfLines={1}>
                                                        {actionItem?.WNameCode || actionItem?.mitmcode || 'Selected yarn item'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                activeOpacity={0.75}
                                                onPress={() => handleModifyItem(actionItem)}
                                                style={yarnUi.actionRow}
                                            >
                                                <View style={yarnUi.actionIcon}>
                                                    <Icon name="edit" size={20} color={YARN_UI.primary} />
                                                </View>
                                                <Text style={yarnUi.actionLabel}>Modify Item</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                activeOpacity={0.75}
                                                onPress={() => handleSubItemCreate(actionItem)}
                                                style={yarnUi.actionRow}
                                            >
                                                <View style={yarnUi.actionIcon}>
                                                    <Icon name="add-box" size={20} color={YARN_UI.primary} />
                                                </View>
                                                <Text style={yarnUi.actionLabel}>Create Sub Item</Text>
                                            </TouchableOpacity>

                                            {/* Browse Item -> open the same Sub Items list used by Create Sub Item. */}
                                            <TouchableOpacity
                                                activeOpacity={0.75}
                                                onPress={() => handleSubItemCreate(actionItem)}
                                                style={yarnUi.actionRow}
                                            >
                                                <View style={yarnUi.actionIcon}>
                                                    <Icon name="folder-open" size={20} color={YARN_UI.primary} />
                                                </View>
                                                <Text style={yarnUi.actionLabel}>Browse Item</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                activeOpacity={0.75}
                                                onPress={() => handleDeleteItem(actionItem)}
                                                style={yarnUi.actionRow}
                                            >
                                                <View style={[yarnUi.actionIcon, yarnUi.dangerIcon]}>
                                                    <Icon name="delete-outline" size={21} color={YARN_UI.danger} />
                                                </View>
                                                <Text style={[yarnUi.actionLabel, yarnUi.dangerText]}>Delete Item</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => {
                                                    setShowActionMenu(false);
                                                    setActionItem(null);
                                                }}
                                                style={yarnUi.actionCancel}
                                            >
                                                <Text style={yarnUi.secondaryText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Modal>


                                {/* =========================================================
                                    CUSTOM DELETE PERMISSION MODAL
                                    - Shows the exact selected row
                                    - Uses the selected row's own itmcode
                                    - Own delete loading state
                                    ========================================================= */}
                                <Modal
                                    visible={deletePermissionVisible}
                                    transparent
                                    animationType="fade"
                                    statusBarTranslucent
                                    onRequestClose={() => {
                                        if (!deleteLoading) {
                                            setDeletePermissionVisible(false);
                                            setDeleteTarget(null);
                                        }
                                    }}
                                >
                                    <View
                                        style={{
                                            flex: 1,
                                            backgroundColor: 'rgba(15, 23, 42, 0.58)',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingHorizontal: 22,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: '100%',
                                                maxWidth: 430,
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: 22,
                                                overflow: 'hidden',
                                                elevation: 16,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 7 },
                                                shadowOpacity: 0.28,
                                                shadowRadius: 14,
                                            }}
                                        >
                                            {/* Header */}
                                            <View
                                                style={{
                                                    backgroundColor: '#FFF1F2',
                                                    paddingHorizontal: 20,
                                                    paddingVertical: 18,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 50,
                                                        height: 20,
                                                        borderRadius: 25,
                                                        backgroundColor: '#FEE2E2',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginRight: 14,
                                                    }}
                                                >
                                                    <Icon
                                                        name="delete-outline"
                                                        size={20}
                                                        color="#DC2626"
                                                    />
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={{
                                                            fontSize: 16,
                                                            fontWeight: '500',
                                                            color: '#000',
                                                        }}
                                                    >
                                                        Delete Item
                                                    </Text>
                                                    {/* <Text
                                                        style={{
                                                            marginTop: 3,
                                                            fontSize: 13,
                                                            fontWeight: '700',
                                                            color: '#B91C1C',
                                                        }}
                                                    >
                                                        Permanent action
                                                    </Text> */}
                                                </View>
                                            </View>

                                            {/* Body */}
                                            <View
                                                style={{
                                                    paddingHorizontal: 20,
                                                    paddingTop: 22,
                                                    paddingBottom: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        lineHeight: 18,
                                                        fontWeight: '500',
                                                        color: '#000',
                                                        marginBottom: 18,
                                                    }}
                                                >
                                                    Are you sure you want to delete this item?
                                                </Text>

                                                {/* Selected item information */}
                                                <View
                                                    style={{
                                                        backgroundColor: '#F8FAFC',
                                                        borderWidth: 1,
                                                        borderColor: '#E2E8F0',
                                                        borderRadius: 15,
                                                        padding: 10,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: '800',
                                                            color: '#000',
                                                            marginBottom: 7,
                                                        }}
                                                    >
                                                        {deleteTargetType === 'SUB' ? 'SUB ITEM' : 'ITEM'}
                                                    </Text>

                                                    <Text
                                                        numberOfLines={3}
                                                        style={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            color: '#0000',
                                                        }}
                                                    >
                                                        {deleteTarget?.WNameCode ||
                                                            deleteTarget?.itmname ||
                                                            deleteTarget?.ItmName ||
                                                            'Selected Item'}
                                                    </Text>

                                                    {/* <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            marginTop: 13,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 14,
                                                                fontWeight: '700',
                                                                color: '#64748B',
                                                                marginRight: 9,
                                                            }}
                                                        >
                                                            Item Code
                                                        </Text>

                                                        <View
                                                            style={{
                                                                backgroundColor: '#E0F2FE',
                                                                borderRadius: 9,
                                                                paddingHorizontal: 11,
                                                                paddingVertical: 6,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: '#0369A1',
                                                                    fontSize: 14,
                                                                    fontWeight: '800',
                                                                }}
                                                            >
                                                                {deleteTarget?.itmcode ||
                                                                    deleteTarget?.mitmcode ||
                                                                    deleteTarget?.ItmCode ||
                                                                    '-'}
                                                            </Text>
                                                        </View>
                                                    </View> */}
                                                </View>

                                                {/* Warning */}
                                                <View
                                                    style={{
                                                        marginTop: 16,
                                                        backgroundColor: '#FEF2F2',
                                                        borderRadius: 13,
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 12,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: 15,
                                                            backgroundColor: '#FEE2E2',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Icon
                                                            name="warning-amber"
                                                            size={18}
                                                            color="#DC2626"
                                                        />
                                                    </View>

                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text
                                                            style={{
                                                                fontSize: 14,
                                                                fontWeight: '800',
                                                                color: '#B91C1C',
                                                            }}
                                                        >
                                                            This action cannot be undone.
                                                        </Text>
                                                        {/* <Text
                                                            style={{
                                                                marginTop: 3,
                                                                fontSize: 12,
                                                                color: '#7F1D1D',
                                                            }}
                                                        >
                                                            The selected item will be permanently removed.
                                                        </Text> */}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Delete button only. Cancel stays removed/commented as requested. */}
                                            <View
                                                style={{
                                                    paddingHorizontal: 20,
                                                    paddingVertical: 18,
                                                }}
                                            >
                                                {/*
                                                <TouchableOpacity
                                                    disabled={deleteLoading}
                                                    onPress={() => {
                                                        if (deleteLoading) return;
                                                        setDeletePermissionVisible(false);
                                                        setDeleteTarget(null);
                                                    }}
                                                >
                                                    <Text>CANCEL</Text>
                                                </TouchableOpacity>
                                                */}

                                                <TouchableOpacity
                                                    disabled={deleteLoading}
                                                    activeOpacity={0.8}
                                                    onPress={confirmDeleteItem}
                                                    style={{
                                                        width: '100%',
                                                        height: 54,
                                                        borderRadius: 14,
                                                        backgroundColor: deleteLoading
                                                            ? '#F87171'
                                                            : '#DC2626',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'row',
                                                    }}
                                                >
                                                    {deleteLoading ? (
                                                        <>
                                                            <ActivityIndicator
                                                                size="small"
                                                                color="#FFFFFF"
                                                            />
                                                            <Text
                                                                style={{
                                                                    marginLeft: 9,
                                                                    fontSize: 14,
                                                                    fontWeight: '500',
                                                                    color: '#FFFFFF',
                                                                }}
                                                            >
                                                                DELETING...
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Icon
                                                                name="delete-outline"
                                                                size={20}
                                                                color="#FFFFFF"
                                                            />
                                                            <Text
                                                                style={{
                                                                    marginLeft: 8,
                                                                    fontSize: 14,
                                                                    fontWeight: '500',
                                                                    color: '#FFFFFF',
                                                                }}
                                                            >
                                                                DELETE ITEM
                                                            </Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </Modal>

                                {activeTab === 'Spun' && <SpunTab />}
                                {activeTab === 'Filaments' && <FilamentTab />}
                            </View>
                        </View>
                    </View>

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
                </View>
            )}
            {/* </SafeAreaView> */}
        </YarnManagementContext.Provider>
    );

};
export default YarnManagementSystem;
