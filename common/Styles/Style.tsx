
import { StyleSheet } from 'react-native';
import theme from '../../android/app/src/theme';
export const homeScreen_styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f8f9fa',
    },
    searchBar: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    listContainer: {
        paddingBottom: 20,
    },
    appButton: {
        alignItems: 'center',
        margin: 8,
        paddingVertical: 12,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    appName: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
});

export const loginScreen_styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    heading: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#000',
    },
    input: {
        backgroundColor: '#fff',
        marginBottom: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        color: '#000',
    },
    passwordInput: {
        // borderColor: '#007AFF',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export const cameraScreen_styles = StyleSheet.create({
    container: { flex: 1 },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
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
    disabledcapture: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: '#ccc',
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

export const header_styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        right: 10,
        zIndex: 999,
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 20, // round
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    disabledbutton: {
        backgroundColor: '#ccc',
        borderRadius: 20, // round
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
});

export const networkSpeed_styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 140,
        right: 10,
        zIndex: 999,
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 20, // round
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    disabledbutton: {
        backgroundColor: '#ccc',
        borderRadius: 20, // round
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
});

export const crlimtreq_styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        paddingBottom: 80,
    },
    containerTable: {
        flex: 1,
        // padding: 10,
        paddingHorizontal: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    pdfHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    pdfHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    pdfHeaderButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    pdfLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container_list: {
        flex: 1,
        // padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    container_list123: {
        // flex: 1,
        height: '90%',
        // padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    disabledCard: {
        opacity: 0.6,
    },
    closeButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END, // Purple theme
        padding: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(229, 216, 255)',
    },
    acceptedCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(164, 255, 167)',
    },
    rejectedCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(255, 193, 193)',
    },
    dateContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#BDBDBD',
        borderRadius: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 1,
    },
    dateText: {
        fontSize: 12,
        color: '#555',
    },
    cardHeaderContainer: {
        backgroundColor: '#E3F2FD', // Light blue (optional: change to light purple)
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginHorizontal: -15,
        marginBottom: 10,
    },
    cardHeader: {
        width: '70%',
    },
    overlayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlay: {
        width: '90%',
        borderRadius: 15,
        backgroundColor: 'white',
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    overlayGradient: {
        padding: 25,
    },
    overlayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 15,
    },
    loadingText: {
        fontSize: 16,
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    responseText: {
        fontSize: 16,
        color: 'green',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    overlayPartyName: {
        fontSize: 16,
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    overlayButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    overlayButton: {
        flex: 1,
        marginHorizontal: 5,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    overlayButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    cardHeaderText: {
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cardSubHeader: {
        borderColor: '#B3E5FC',
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: '100%',
    },
    cardSubHeaderText: {
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    cardSubHeaderhistory: {
        // borderColor: theme.BRAND_GRADIENT_END,
        // borderWidth: 2,
        padding: 10,
        borderRadius: 5,
        // marginBottom: 10,
        alignSelf: 'center',
        width: '100%',
        maxWidth: '100%',
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    cardSubHeaderTexthistory: {
        color: '#fff', // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    twoColumnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    keyValuePair: {
        width: '48%',
    },
    fullWidthRow: {
        marginBottom: 10,
    },
    key: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#555',
        marginBottom: 3,
    },
    value: {
        fontSize: 14,
        color: '#333',
    },
    valueWord: {
        fontSize: 13,
        color: 'gray',
        fontStyle: 'italic',
        alignSelf: 'flex-end',
    },
    Authvalue: {
        fontSize: 14,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: 'bold',
    },
    valueAuthorised: {
        fontSize: 14,
        color: 'rgba(0, 128, 0, 0.8)',
        fontWeight: 'bold',
    },
    valueRejected: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        fontWeight: 'bold',
    },
    valueBold: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    valuegreen: {
        fontSize: 14,
        color: 'rgba(0, 128, 0, 0.8)',
    },
    editableValue: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    editableValueBlack: {
        fontSize: 14,
        color: 'rgb(0, 0, 0)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    editableValue1: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        // borderWidth: 1,
        // borderColor: 'rgba(0, 0, 0, 0.1)',
        // borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    overlayText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    stampContainer: {
        position: 'absolute',
        top: '80%',
        left: '80%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stampContainerPOS: {
        position: 'absolute',
        top: '52%',
        left: '90%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stampContainerYOS: {
        position: 'absolute',
        top: '57%',
        left: '93%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stamp: {
        width: 100,
        height: 60,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '0deg' }],
        borderWidth: 1,
        borderColor: '#999',
    },
    stampAccepted: {
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(46, 125, 50, 0.9)',
    },
    stampRejected: {
        backgroundColor: 'rgba(244, 67, 54, 0.7)',
        borderColor: 'rgba(198, 40, 40, 0.9)',
    },
    stampText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    topButton: {
        position: 'absolute',
        right: 20,
        bottom: 100,
        backgroundColor: '#fff', // Purple theme
        width: 40,
        height: 40,
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.26)',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        zIndex: 1,
    },
    historyButton: {
        position: 'absolute',
        right: 20,
        top: 100, // Adjusted to avoid overlap with header
        backgroundColor: 'rgba(106, 13, 173, 0.4)', // Purple theme
        width: 40,
        height: 40,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        width: '100%',
        textAlign: 'center'
    },
    emptyTextRed: {
        fontSize: 16,
        color: 'red',
        width: '100%',
        textAlign: 'center'
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Light gray background
        paddingTop: 50,
    },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
        paddingVertical: 10,
    },
    tab: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.BRAND_GRADIENT_END, // Purple theme
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.BRAND_GRADIENT_END, // Purple theme
    },
    modalSearchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    listIconContainer: {
        position: 'absolute',
        top: -50,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 3,
        padding: 4,
    },
    listIconContaineradd: {
        position: 'absolute',
        bottom: 140,
        right: 15,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    listIconText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        alignSelf: 'center',
    },
    horizontalListContainer: {
        flex: 1,
    },
    horizontalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardContent: {
        padding: 12,
    },
    partyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333',
    },
    partyAddress: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    partyDetails: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    historyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    historyDetails: {
        marginTop: 8,
    },
    historyKeyValue: {
        fontSize: 14,
        marginBottom: 4,
        color: '#555',
    },
    label: {
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END, // Purple theme
    },
    tabContainer1: {
        flexDirection: 'row',
        // marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
        paddingVertical: 1,
    },
    tab1: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab1: {
        borderBottomColor: theme.BRAND_GRADIENT_END,
    },
    tabText1: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.BRAND_GRADIENT_END,
    },
    pendingCardall: {
        borderColor: 'rgba(112, 112, 112, 0.3)',
    },
    stampPendingall: {
        backgroundColor: 'rgba(173, 173, 173, 0.7)',
        borderColor: 'rgba(140, 140, 140, 0.9)',
    },

    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        height: '100%',
        width: '100%',
    },
    noDataText: {
        fontSize: 16,
        color: '#000',
    },


    carouselCardActive: {
        width: 280,
        height: '90%',
        transform: [{ scale: 1 }],
        elevation: 12,
        shadowOpacity: 0.4,
    },
    carouselCardInactive: {
        width: 240,
        height: '80%',
        transform: [{ scale: 0.9 }],
        opacity: 0.6,
        elevation: 4,
    },
    // carouselCardContent: {
    //     flex: 1,
    //     padding: 10,
    //     // borderStyle: 'solid',
    //     // borderColor: 'rgb(255, 255, 255)',
    // },
    // carouselCardTitle: {
    //     fontSize: 16,
    //     fontWeight: 'bold',
    //     // color: theme.BRAND_GRADIENT_END,
    //     color: '#fff',
    //     marginBottom: 8,
    //     textAlign: 'center',
    //     borderBottomColor: 'rgb(255, 255, 255)',
    //     borderBottomWidth: 1,
    //     paddingBottom: 6,

    // },
    // carouselCardText: {
    //     fontSize: 13,
    //     color: '#fff',
    //     marginBottom: 5,
    //     textAlign: 'left',
    //     fontWeight: '800',
    // },
    // carouselCardKey: {
    //     // fontWeight: 'bold',
    //     color: '#fff',
    //     fontSize: 13,
    // },
    infoIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoCount: {
        color: '#2196F3',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    //   
    // ... aapke existing styles
    carouselModalOverlay: {
        flex: 1,
        backgroundColor: 'white',  // Full-screen white
    },
    modalCloseButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 8,
    },
    verticalScrollContainer: {
        paddingTop: 50,  // Close button ke neeche space
        paddingHorizontal: 10,
    },
    designCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    designCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 6,
    },
    itemCardTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 10,
    },
    tableContainer: {
        minWidth: 500,  // Horizontal scroll ke liye
    },
    tableScrollWrapper: {
        width: 500,   // table width bigger than screen
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#4a6fa5",
        paddingVertical: 10,
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tableHeaderText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 4,
        fontSize: 12,
    },

    tableCell: {
        textAlign: 'center',
        color: '#555',
        paddingHorizontal: 4,
        fontSize: 12,
    },
    rowCard: {
        backgroundColor: "#fff",
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee"
    },

    rowItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },

    label: {
        fontSize: 12,
        color: "#666"
    },

    value: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333"
    },
    accordionCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 14,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        overflow: "hidden"
    },

    accordionHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        backgroundColor: "#f7f7f7",
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },

    accordionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333"
    },

    accordionSubTitle: {
        fontSize: 13,
        color: "#666",
        marginTop: 2
    },

    accordionBody: {
        padding: 12
    },

    rowCard: {
        backgroundColor: "#fafafa",
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee"
    },

    rowItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },

    label: {
        fontSize: 12,
        color: "#777"
    },

    value: {
        fontSize: 13,
        fontWeight: "600",
        color: "#222"
    },
    countBadge: {
        backgroundColor: "#2196F3",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 8
    },

    countText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700"
    },
    // Column widths
    shadeColumn: { width: 120 },
    qtyColumn: { width: 80 },
    rateColumn: { width: 100 },
    amountColumn: { width: 120 },
    discColumn: { width: 80 },
    gridCard: {
        flex: 1,
        backgroundColor: "#fafafa",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: "#eee"
    },

    gridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6
    },

    gridLabel: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
        flex: 1
    },

    gridValue: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#222",
        flex: 1,
        textAlign: "right",
        flexWrap: "wrap"
    },
    // 
    carouselCardContainer: {
        paddingVertical: 50,
        alignItems: 'center', // Center the cards horizontally
        justifyContent: 'center', // Center the cards vertically (if needed).
        // height: '100%', 

    },

    // Individual carousel card
    carouselCard: {
        width: 280, // Adjust width as needed
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3, // For Android shadow
        shadowColor: '#000', // For iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginHorizontal: 8, // Space between cards.
    },

    // Header container with gradient
    headerContainer: {
        padding: 15,
    },

    // Content inside the card
    carouselCardContent: {
        padding: 10,
    },

    // Title of the card
    carouselCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },

    // Key label (e.g., "Design Name:")
    carouselCardKey: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
        marginBottom: 4,
    },

    // Value text (e.g., "DIRECTOR")
    carouselCardText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'normal',
    },


    /**yarn purchase order sub card css start */
    expandRow: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 8,
    },

    expandButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    expandText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333'
    },

    subCard: {
        backgroundColor: '#f0eeee',
        marginTop: 12,
        padding: 10,
        borderRadius: 10,
        //borderLeftWidth: 4,
        //borderLeftColor: '#c2c1c1',
        color: '#000',
        elevation: 4
    },

    subTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
        color: '#000'
    },

    subRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 15, // or marginRight
        marginVertical: 2,
        color: '#000'
    },
    subcardtext: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'normal',
        width: '25%'
    },
    subcardtextval: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
    },
    subcardtitle: {
        color: '#000',
        fontSize: 18,
        verticalAlign: 'middle',
        textAlign: 'center',
        width: '100%',
        backgroundColor: '#ccc',
        padding: 5,
        borderRadius: 8
    },
    subRow1: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    subCol: {
        flex: 1,
    },

    subcardtext1: {
        fontSize: 12,
        color: '#777',
    },

    subcardtextval1: {
        fontSize: 14,
        color: '#000',
        fontWeight: '600',
    },
    /**yarn purchase order sub card css end */
});

export const checkingScannerStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        paddingBottom: 80,
    },
    flexContainer: {
        flexDirection: 'row',
        //margin: 20
        paddingHorizontal: 10,
        paddingVertical: 20
    },
    titleTextWithIcon: {
        fontSize: 18,
        color: '#000',
        width: '66.8%',
        fontWeight: 'bold'
    },
    cameraIcon: {
        color: '#007EA7',
        fontSize: 25,
        marginRight: 10,
    },
    cameraBox: {
        width: 300,
        height: 250,
        borderWidth: 2,
        borderColor: 'black',
        overflow: 'hidden'
    },
    cameraView: {
        width: '100%',
        height: 350,
        borderRadius: 10,
        overflow: 'hidden',
        padding: 20,
        margin: 20
    },
    cameraContainer: {
        width: '100%',
        height: 300,
        alignSelf: 'center',
        marginTop: 0,
        borderRadius: 10,
        overflow: 'hidden'
    },

    camera: {
        width: '100%',
        height: '100%',
        position: 'absolute'
    },

    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    scanBox: {
        width: 220,
        height: 220,
        borderWidth: 3,
        borderColor: '#00FFAA',
        borderRadius: 10
    },
    label: {
        paddingVertical: 5,
        //paddingHorizontal: 10,
        color: '#000000',
        marginTop: 10,
        fontWeight: "500"
    },



    input: {
        paddingVertical: 0,
        paddingHorizontal: 20,
        color: '#000000',
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 6,
        //padding: 10,
        //marginTop: 5
    },
    inputDisabled: {
        backgroundColor: '#DDD',
        paddingVertical: 0,
        paddingHorizontal: 20,
        color: '#000000',
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 6,
        //padding: 10,
        //marginTop: 5
    },

    // dropdown: {
    //     borderWidth: 1,
    //     borderColor: "#000",
    //     borderRadius: 6,
    //     marginTop: 5
    // },



    submitBtn: {
        marginTop: 20,
        backgroundColor: "#007EA7",
        padding: 12,
        borderRadius: 8,
        alignItems: "center"
    },

    submitText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600"
    },

    infoBox: {
        marginTop: 10,
        backgroundColor: "#eef4ff",
        padding: 5,
        borderRadius: 6
    },

    infoText: {
        color: "#5b6d8a",
        textAlign: 'center'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    halfInput: {
        flex: 1,
        marginRight: 2
    },

    halfInputDisabled: {
        flex: 1,
        marginRight: 2,
    },
    halfInputLast: {
        flex: 1
    },
    picker: {
        color: '#000',
        height: 50,
    },
    dropdownIcon: {
        position: "absolute",
        right: 8,
        top: 5,
        pointerEvents: "none"
    },
    dropdown: {
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 6,
        marginTop: 5,
        height: 40,
        justifyContent: 'center',
        width: '90%'


    },
    dropdownIconDelete: {
        position: "absolute",
        right: -15,
        top: -37,
        //pointerEvents: "none",
        color: 'red',
        width: '10%',
        //backgroundColor : '#ccc'

    },
    viewCustom: {

    },
    //absoluteFill: {}
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15
    },

    printBtn: {
        flex: 1,
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8
    },

    clearBtn: {
        flex: 1,
        backgroundColor: '#dc3545',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 8
    },

    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    label1: {
        paddingVertical: 5,
        //paddingHorizontal: 10,
        color: '#000000',
        marginTop: 10,
        fontWeight: "500",
        marginRight: 20
    },
    switch: {
        lineHeight: 1,
        marginTop: 10
    },
});

export const yarnstockverificatio_styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 3,
        paddingRight: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        //paddingBottom: 80,
        paddingBottom: 15,
    },
    containerTable: {
        flex: 1,
        // padding: 10,
        paddingHorizontal: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    pdfHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    pdfHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    pdfHeaderButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    pdfLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container_list: {
        flex: 1,
        // padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    container_list123: {
        // flex: 1,
        height: '90%',
        // padding: 10,
        backgroundColor: '#f8f9fa', // Light gray background
        // paddingBottom: 80,
    },
    disabledCard: {
        opacity: 0.6,
    },
    closeButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END, // Purple theme
        padding: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(229, 216, 255)',
    },
    acceptedCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(164, 255, 167)',
    },
    rejectedCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 8,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'rgb(255, 193, 193)',
    },
    dateContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#BDBDBD',
        borderRadius: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 1,
    },
    dateText: {
        fontSize: 12,
        color: '#555',
    },
    cardHeaderContainer: {
        backgroundColor: '#E3F2FD', // Light blue (optional: change to light purple)
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginHorizontal: -15,
        marginBottom: 10,
    },
    cardHeader: {
        width: '70%',
    },
    overlayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlay: {
        width: '90%',
        borderRadius: 15,
        backgroundColor: 'white',
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    overlayGradient: {
        padding: 25,
    },
    overlayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 15,
    },
    loadingText: {
        fontSize: 16,
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    responseText: {
        fontSize: 16,
        color: 'green',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    overlayPartyName: {
        fontSize: 16,
        color: theme.BRAND_GRADIENT_END, // Purple theme
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    overlayButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    overlayButton: {
        flex: 1,
        marginHorizontal: 5,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    overlayButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    cardHeaderText: {
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cardSubHeader: {
        borderColor: '#B3E5FC',
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: '100%',
    },
    cardSubHeaderText: {
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    cardSubHeaderhistory: {
        // borderColor: theme.BRAND_GRADIENT_END,
        // borderWidth: 2,
        padding: 10,
        borderRadius: 5,
        // marginBottom: 10,
        alignSelf: 'center',
        width: '100%',
        maxWidth: '100%',
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    cardSubHeaderTexthistory: {
        color: '#fff', // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    twoColumnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    keyValuePair: {
        width: '48%',
    },
    fullWidthRow: {
        marginBottom: 10,
    },
    key: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#555',
        marginBottom: 3,
    },
    value: {
        fontSize: 14,
        color: '#333',
    },
    valueWord: {
        fontSize: 13,
        color: 'gray',
        fontStyle: 'italic',
        alignSelf: 'flex-end',
    },
    Authvalue: {
        fontSize: 14,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: 'bold',
    },
    valueAuthorised: {
        fontSize: 14,
        color: 'rgba(0, 128, 0, 0.8)',
        fontWeight: 'bold',
    },
    valueRejected: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        fontWeight: 'bold',
    },
    valueBold: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    valuegreen: {
        fontSize: 14,
        color: 'rgba(0, 128, 0, 0.8)',
    },
    editableValue: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    editableValueBlack: {
        fontSize: 14,
        color: 'rgb(0, 0, 0)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    editableValue1: {
        fontSize: 14,
        color: 'rgba(255, 0, 0, 0.8)',
        // borderWidth: 1,
        // borderColor: 'rgba(0, 0, 0, 0.1)',
        // borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    overlayText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    stampContainer: {
        position: 'absolute',
        top: '80%',
        left: '80%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stampContainerPOS: {
        position: 'absolute',
        top: '52%',
        left: '90%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stampContainerYOS: {
        position: 'absolute',
        top: '57%',
        left: '93%',
        marginLeft: -50,
        marginTop: 20,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stamp: {
        width: 100,
        height: 60,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '0deg' }],
        borderWidth: 1,
        borderColor: '#999',
    },
    stampAccepted: {
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(46, 125, 50, 0.9)',
    },
    stampRejected: {
        backgroundColor: 'rgba(244, 67, 54, 0.7)',
        borderColor: 'rgba(198, 40, 40, 0.9)',
    },
    stampText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    topButton: {
        position: 'absolute',
        right: 20,
        bottom: 100,
        backgroundColor: '#fff', // Purple theme
        width: 40,
        height: 40,
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.26)',
        alignItems: 'center',
        elevation: 5, // shadow Android
        shadowColor: '#000', // shadow iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        zIndex: 1,
    },
    historyButton: {
        position: 'absolute',
        right: 20,
        top: 100, // Adjusted to avoid overlap with header
        backgroundColor: 'rgba(106, 13, 173, 0.4)', // Purple theme
        width: 40,
        height: 40,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Light gray background
        paddingTop: 50,
    },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
        paddingVertical: 10,
    },
    tab: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.BRAND_GRADIENT_END, // Purple theme
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.BRAND_GRADIENT_END, // Purple theme
    },
    modalSearchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    listIconContainer: {
        position: 'absolute',
        top: -50,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 3,
        padding: 4,
    },
    listIconContaineradd: {
        position: 'absolute',
        bottom: 140,
        right: 15,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    listIconText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        alignSelf: 'center',
    },
    horizontalListContainer: {
        flex: 1,
    },
    horizontalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardContent: {
        padding: 12,
    },
    partyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333',
    },
    partyAddress: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    partyDetails: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    historyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    historyDetails: {
        marginTop: 8,
    },
    historyKeyValue: {
        fontSize: 14,
        marginBottom: 4,
        color: '#555',
    },
    label: {
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END, // Purple theme
    },
    tabContainer1: {
        flexDirection: 'row',
        // marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
        paddingVertical: 1,
    },
    tab1: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab1: {
        borderBottomColor: theme.BRAND_GRADIENT_END,
    },
    tabText1: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.BRAND_GRADIENT_END,
    },
    pendingCardall: {
        borderColor: 'rgba(112, 112, 112, 0.3)',
    },
    stampPendingall: {
        backgroundColor: 'rgba(173, 173, 173, 0.7)',
        borderColor: 'rgba(140, 140, 140, 0.9)',
    },

    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        height: '100%',
        width: '100%',
    },
    noDataText: {
        fontSize: 16,
        color: '#000',
    },


    carouselCardActive: {
        width: 280,
        height: '90%',
        transform: [{ scale: 1 }],
        elevation: 12,
        shadowOpacity: 0.4,
    },
    carouselCardInactive: {
        width: 240,
        height: '80%',
        transform: [{ scale: 0.9 }],
        opacity: 0.6,
        elevation: 4,
    },
    // carouselCardContent: {
    //     flex: 1,
    //     padding: 10,
    //     // borderStyle: 'solid',
    //     // borderColor: 'rgb(255, 255, 255)',
    // },
    // carouselCardTitle: {
    //     fontSize: 16,
    //     fontWeight: 'bold',
    //     // color: theme.BRAND_GRADIENT_END,
    //     color: '#fff',
    //     marginBottom: 8,
    //     textAlign: 'center',
    //     borderBottomColor: 'rgb(255, 255, 255)',
    //     borderBottomWidth: 1,
    //     paddingBottom: 6,

    // },
    // carouselCardText: {
    //     fontSize: 13,
    //     color: '#fff',
    //     marginBottom: 5,
    //     textAlign: 'left',
    //     fontWeight: '800',
    // },
    // carouselCardKey: {
    //     // fontWeight: 'bold',
    //     color: '#fff',
    //     fontSize: 13,
    // },
    infoIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoCount: {
        color: '#2196F3',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    //   
    // ... aapke existing styles
    carouselModalOverlay: {
        flex: 1,
        backgroundColor: 'white',  // Full-screen white
    },
    modalCloseButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 8,
    },
    verticalScrollContainer: {
        paddingTop: 50,  // Close button ke neeche space
        paddingHorizontal: 10,
    },
    designCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    designCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 6,
    },
    itemCardTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 10,
    },
    tableContainer: {
        minWidth: 500,  // Horizontal scroll ke liye
    },
    tableScrollWrapper: {
        width: 500,   // table width bigger than screen
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#4a6fa5",
        paddingVertical: 10,
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tableHeaderText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 4,
        fontSize: 12,
    },

    tableCell: {
        textAlign: 'center',
        color: '#555',
        paddingHorizontal: 4,
        fontSize: 12,
    },
    rowCard: {
        backgroundColor: "#fff",
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee"
    },

    rowItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },

    label: {
        fontSize: 12,
        color: "#666"
    },

    value: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333"
    },
    accordionCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 14,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        overflow: "hidden"
    },

    accordionHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        backgroundColor: "#f7f7f7",
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },

    accordionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333"
    },

    accordionSubTitle: {
        fontSize: 13,
        color: "#666",
        marginTop: 2
    },

    accordionBody: {
        padding: 12
    },

    rowCard: {
        backgroundColor: "#fafafa",
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee"
    },

    rowItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },

    label: {
        fontSize: 12,
        color: "#777"
    },

    value: {
        fontSize: 13,
        fontWeight: "600",
        color: "#222"
    },
    countBadge: {
        backgroundColor: "#2196F3",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 8
    },

    countText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700"
    },
    // Column widths
    shadeColumn: { width: 120 },
    qtyColumn: { width: 80 },
    rateColumn: { width: 100 },
    amountColumn: { width: 120 },
    discColumn: { width: 80 },
    gridCard: {
        flex: 1,
        backgroundColor: "#fafafa",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: "#eee"
    },

    gridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6
    },

    gridLabel: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
        flex: 1
    },

    gridValue: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#222",
        flex: 1,
        textAlign: "right",
        flexWrap: "wrap"
    }
});

export const StyleSheetPCA = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 0,
        paddingRight: 0,
        paddingLeft: 0,
        backgroundColor: '#e5ebf1',
        paddingBottom: 0,
    },
    listIconContainer: {
        position: 'absolute',
        top: -50,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 3,
        padding: 4,
    },

    confirmOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center"
    },
    confirmBox: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        elevation: 5
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: 'darkblue',
        textAlign: 'center'
    },
    confirmTextLabel: {
        fontSize: 15,
        marginBottom: 5,
        color: '#000',
        width: '8%'
    },
    confirmText: {
        fontSize: 15,
        marginBottom: 5,
        color: '#000'
    },
    confirmButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 15
    },
    confirmBtn: {
        flex: 1,
        height: 40,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 5
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center"
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        width: '35%'   // fixed label width
    },

    value: {
        fontSize: 15,
        color: '#000',
        width: '65%',
        textAlign: 'left'
    },
    

});