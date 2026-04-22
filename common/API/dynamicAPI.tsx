import AsyncStorage from '@react-native-async-storage/async-storage';

const IS_LOCAL = true; //true = local apis url , false = live api url

export let API: string = IS_LOCAL 
        ? "http://192.168.13.100:4007" 
        : "https://apig.tms-webapp.com";

export let PRINTSTICKER = IS_LOCAL 
        ? "http://192.168.13.100:4007/api/print-grey-in-stock" 
        : "https://apig.tms-webapp.com/api/print-grey-in-stock";

export let PRINTERSLISTAPI = IS_LOCAL 
        ? "http://192.168.13.130:4000/printers" 
        : "http://192.168.0.6:4000/printers";

export const initAPI = async (): Promise<string> => {

    const selected_property = await AsyncStorage.getItem("selected_property");    
    
    if (IS_LOCAL) {
        API = "http://192.168.13.100:4007";
    } else {
        API = selected_property === "rayons"
            ? "https://apiy.tms-webapp.com"
            : "https://apig.tms-webapp.com";        
    }
    
    return API;
};

export const initAPIForSticker = async (): Promise<string> => {    
    PRINTSTICKER = IS_LOCAL 
    ? "http://192.168.13.100:4007/api/print-grey-in-stock"
    : "https://apig.tms-webapp.com/api/print-grey-in-stock"; 
    
    return PRINTSTICKER;
};

export const initAPIForPrinterList = async (): Promise<string> => {    
    PRINTERSLISTAPI = IS_LOCAL
    ? "http://192.168.13.130:4007/printers"
    : "http://192.168.0.6:4000/printers"
    
    return PRINTERSLISTAPI;
};