import { useState } from 'react';
import { MobileUserPreferenceAPI } from '../common/API/mobileUserPreferenceApi';

interface Props {
    UserId: number | string;
    ModuleCode: string;
    ModuleName: string;
    ScreenCode: string;
    ScreenName: string;
    token: string;
}

export const useMobileUserPreference = ({
    UserId,
    ModuleCode,
    ModuleName,
    ScreenCode,
    ScreenName,
    token,
}: Props) => {
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState<any[]>([]);

    const loadDefaultPreference = async () => {
        try {
            setLoading(true);

            const response = await MobileUserPreferenceAPI.get(
                {
                    UserId: Number(UserId),
                    ModuleCode,
                    ScreenCode,
                },
                token
            );

            if (response.data.status) {

                let pref = response.data.data?.PreferenceJson;

                if (typeof pref === 'string') {
                    try {
                        pref = JSON.parse(pref);
                    } catch (e) {
                        console.log('PreferenceJson parse error', e);
                    }
                }

                return pref;
            }

            return null;
        } finally {
            setLoading(false);
        }
    };

    const loadPreferenceByName = async (CriteriaName: string) => {
        try {
            setLoading(true);

            const response = await MobileUserPreferenceAPI.get(
                {
                    UserId: Number(UserId),
                    ModuleCode,
                    ScreenCode,
                    CriteriaName,
                },
                token
            );

            if (response.data.status) {

                let pref = response.data.data?.PreferenceJson;

                if (typeof pref === 'string') {
                    try {
                        pref = JSON.parse(pref);
                    } catch (e) {
                        console.log('PreferenceJson parse error', e);
                    }
                }

                return pref;
            }

            return null;
        } finally {
            setLoading(false);
        }
    };

    const loadPreferenceList = async () => {
        try {
            setLoading(true);

            const response = await MobileUserPreferenceAPI.list(
                {
                    UserId: Number(UserId),
                    ModuleCode,
                    ScreenCode,
                },
                token
            );

            const list = response.data.data || [];
            setPreferences(list);

            return list;
        } finally {
            setLoading(false);
        }
    };

    const savePreference = async ({
        CriteriaName = 'Default',
        PreferenceJson,
        IsDefault = true,
    }: any) => {
        try {
            setLoading(true);

            const response = await MobileUserPreferenceAPI.save(
                {
                    UserId: Number(UserId),
                    ModuleCode,
                    ModuleName,
                    ScreenCode,
                    ScreenName,
                    CriteriaName,
                    PreferenceJson,
                    IsDefault,
                },
                token
            );

            return response.data;
        } finally {
            setLoading(false);
        }
    };

    const deletePreference = async (CriteriaName: string) => {
        try {
            setLoading(true);

            const response = await MobileUserPreferenceAPI.delete(
                {
                    UserId: Number(UserId),
                    ModuleCode,
                    ScreenCode,
                    CriteriaName,
                },
                token
            );

            return response.data;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        preferences,
        loadDefaultPreference,
        loadPreferenceByName,
        loadPreferenceList,
        savePreference,
        deletePreference,
    };
};