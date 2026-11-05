import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { API } from '@/common/API/dynamicAPI';

interface ApiRequestConfig extends AxiosRequestConfig {
    showLoader?: boolean;
    setLoading?: (loading: boolean) => void;
}

export const apiRequest = async (
    method: 'get' | 'post',
    endpoint: string,
    payload?: any,
    config?: ApiRequestConfig
): Promise<AxiosResponse> => {
    const { showLoader = true, setLoading, ...rest } = config || {};
    console.log("Common API", API);

    if (showLoader && setLoading) {
        setLoading(true);
    }

    try {
        const headers = {
            Authorization: `Bearer ${rest?.headers?.Authorization || ''}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...rest?.headers,
        };

        const requestConfig: AxiosRequestConfig = {
            ...rest,
            headers,
        };

        let response: AxiosResponse;
        if (method === 'get') {
            response = await axios.get(`${API}${endpoint}`, {
                ...requestConfig,
                params: payload,
            });
        } else {
            response = await axios.post(`${API}${endpoint}`, payload, requestConfig);
        }

        return response;
    } catch (error) {
        throw error;
    } finally {
        if (showLoader && setLoading) {
            setLoading(false);
        }
    }
};