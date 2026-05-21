// import API from "./API";
import { API } from '../../../common/API/dynamicAPI';

export const warehouseApi = {
    getCriteriaMaster: async () => {
        return API.get("/warehouse/criteria-master");
    },

    getDashboard: async (payload) => {
        return API.post("/warehouse/dashboard", payload);
    },

    loadCartons: async (payload) => {
        return API.post("/warehouse/cartons/load", payload);
    },

    validateCartonScan: async (payload) => {
        return API.post("/warehouse/cartons/validate-scan", payload);
    },

    saveAssign: async (payload) => {
        return API.post("/warehouse/cartons/assign", payload);
    },

    saveTransfer: async (payload) => {
        return API.post("/warehouse/cartons/transfer", payload);
    },    
};