import axios from 'axios';
import { initAPI } from './dynamicAPI';

const getAuthConfig = (token: string) => ({
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-platform': 'mob',
    },
});

export const MobileUserPreferenceAPI = {
    save: async (payload: any, token: string) => {
        const API = await initAPI();

        console.log('Preference Save API:', `${API}/api/mobile-user-preference/save`);
        console.log('Preference Save Payload:', payload);

        const res = await axios.post(
            `${API}/api/mobile-user-preference/save`,
            payload,
            getAuthConfig(token)
        );

        console.log('Preference Save Response:', res.data);

        return res;
    },

    get: async (payload: any, token: string) => {
        const API = await initAPI();

        return axios.post(
            `${API}/api/mobile-user-preference/get`,
            payload,
            getAuthConfig(token)
        );
    },

    list: async (payload: any, token: string) => {
        const API = await initAPI();

        return axios.post(
            `${API}/api/mobile-user-preference/list`,
            payload,
            getAuthConfig(token)
        );
    },

    delete: async (payload: any, token: string) => {
        const API = await initAPI();

        return axios.post(
            `${API}/api/mobile-user-preference/delete`,
            payload,
            getAuthConfig(token)
        );
    },

    makeDefault: async (payload: any, token: string) => {
        const API = await initAPI();

        return axios.post(
            `${API}/api/mobile-user-preference/make-default`,
            payload,
            getAuthConfig(token)
        );
    },
};