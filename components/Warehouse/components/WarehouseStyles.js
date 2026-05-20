import { StyleSheet } from "react-native";

export const COLORS = {
    primary: "#4F35D9",
    primaryDark: "#31208F",
    green: "#169400",
    greenLight: "#DDF9D7",
    red: "#FF3B14",
    redLight: "#FFE4DD",
    grey: "#ECECEC",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    white: "#FFFFFF",
    selected: "#EEF2FF",
};

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F6FA",
    },

    container: {
        padding: 14,
    },

    card: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
    },

    label: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 6,
    },

    input: {
        height: 42,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.white,
        color: COLORS.text,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
    },

    between: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    button: {
        height: 46,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14,
    },

    buttonText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 14,
    },

    bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    bottomText: {
        color: COLORS.white,
        fontWeight: "700",
    },

    bottomButton: {
        backgroundColor: "#fff",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
    },

    bottomButtonText: {
        color: COLORS.primary,
        fontWeight: "800",
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    pickerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000"
    },

    pickerSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 10
    },

    pickerItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    bigInput: {
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 12,
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    inputText: {
        flex: 1,
        color: "#000"
    },

});