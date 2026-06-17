// import AsyncStorage from '@react-native-async-storage/async-storage';

// export let API: string = "https://apig.tms-webapp.com"; // ✅ default

// export const initAPI = async (): Promise<string> => {
//     const selected_property = await AsyncStorage.getItem("selected_property");

//     if (selected_property === "rayons") {
//         API = "https://apiy.tms-webapp.com";
//     } else {
//         // ✅ sudamo_knits OR null OR anything -> default apig
//         API = "https://apig.tms-webapp.com";
//     }

//     console.log("✅ initAPI done | selected_property:", selected_property, "| API:", API);

//     return API;
// };

import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔁 Change only this flag when needed
const IS_LOCAL = false; // true = it will use local apis url , false = it will use live api url

export let API: string = IS_LOCAL ? "http://192.168.13.100:4016" : "https://apig.tms-webapp.com";

//export let PRINTSTICKER = IS_LOCAL ? "http://192.168.13.130:4000/print-grey-in-stock" : "http://192.168.0.6:4000/print-grey-in-stock"
export let PRINTSTICKER = IS_LOCAL ? "http://192.168.13.100:4016/api/print-grey-in-stock" : "https://apig.tms-webapp.com/api/print-grey-in-stock"
export let PRINTERSLISTAPI = IS_LOCAL ? "http://192.168.13.130:4000/printers" : "http://192.168.0.6:4000/printers"



export const initAPI = async (): Promise<string> => {
    const selected_property = await AsyncStorage.getItem("selected_property");

    if (IS_LOCAL) {
        // Local server
        API = "http://192.168.13.100:4016";
    } else {
        // Live server
        if (selected_property === "rayons") {
            API = "https://apiy.tms-webapp.com";
        } else {
            API = "https://apig.tms-webapp.com";
        }
    }

    console.log(
        "✅ initAPI done | selected_property:",
        selected_property,
        "| API:",
        API
    );

    return API;
};

export const initAPIForSticker = async (): Promise<string> => {
    const selected_property = await AsyncStorage.getItem("selected_property");

    if (IS_LOCAL) {
        // Local server
        PRINTSTICKER = "http://192.168.13.100:4016/api/print-grey-in-stock";
    } else {
        // Live server only for sudamo
        PRINTSTICKER = "https://apig.tms-webapp.com/api/print-grey-in-stock";
    }

    return PRINTSTICKER;
};

export const initAPIForPrinterList = async (): Promise<string> => {
    const selected_property = await AsyncStorage.getItem("selected_property");

    if (IS_LOCAL) {
        // Local server
        PRINTERSLISTAPI = "http://192.168.13.130:4000/printers";
    } else {
        // Live server only for sudamo
        PRINTERSLISTAPI = "http://192.168.0.6:4000/printers";
    }

    return PRINTERSLISTAPI;
};