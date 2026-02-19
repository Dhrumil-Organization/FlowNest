import AsyncStorage from '@react-native-async-storage/async-storage';

export let API: string = "https://apig.tms-webapp.com"; // ✅ default

export const initAPI = async (): Promise<string> => {
    const selected_property = await AsyncStorage.getItem("selected_property");

    if (selected_property === "rayons") {
        API = "https://apiy.tms-webapp.com";
    } else {
        // ✅ sudamo_knits OR null OR anything -> default apig
        API = "https://apig.tms-webapp.com";
    }

    console.log("✅ initAPI done | selected_property:", selected_property, "| API:", API);

    return API;
};
