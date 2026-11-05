// FILE: src/components/WarehouseNEW/CriteriaStep.tsx
// Step 1 — port of legacy Warehouse/WarehouseCriteriaScreen.tsx (live JSX only).
// Same load order, saved-criteria restore, validations, alert texts and
// PREVIEW payload. The Item / Merge / Grade / Shade radio rows and their four
// modals are commented out / unreachable in legacy, so they are not rendered.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, Field, PickField, SectionHead, Segment } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  buildPreviewPayload,
  fetchAllStoredata,
  fetchPropertyData,
  fetchWarehouseLocations,
  loadDefaultPreference,
  saveDefaultPreference,
} from './api';
import { CriteriaForm, getCurrentFinancialYear, INITIAL_FORM, Row, STOCK_TYPE_OPTIONS } from './model';
import { CONTENT, PickerSheet, useCols } from './ui';

type Props = {
  token: string;
  API: string;
  userid?: any;
  /** legacy navigation.navigate('WarehouseDashboard', { criteria: form, dashboardData }) */
  onPreview: (params: { criteria: CriteriaForm; dashboardData: Row[] }) => void;
};

export default function CriteriaStep({ token, API, userid, onPreview }: Props) {
  const { isPhone } = useCols();
  const [loading, setLoading] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [storeData, setStoreData] = useState<Row[]>([]);
  const [form, setForm] = useState<CriteriaForm>(INITIAL_FORM);

  const setValue = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  // Saved criteria restore (legacy initScreen) — only when userid + token exist.
  useEffect(() => {
    if (!userid || !token) return;
    let alive = true;

    const initScreen = async () => {
      try {
        const properties = await fetchPropertyData(API, token);
        if (!alive) return;
        setPropertyData(properties || []);
        const saved = await loadDefaultPreference(API, token, userid);
        if (!alive) return;

        const criteria = saved?.criteria || {};
        const loadedForm = {
          prpgroup: 'Yarn Division',
          prpcode: criteria?.prpcodes || criteria?.prpcode || '',
          strcode: criteria?.strcode || '',
          yearno: criteria?.yearno || getCurrentFinancialYear(),
          stockType: criteria?.stocktype || criteria?.stockType || 'ALL',
        };

        setForm((prev) => ({ ...prev, ...loadedForm }));

        if (loadedForm.prpcode && properties?.length > 0) {
          const matchedProperty = properties.find((x) => String(x.PrpCode) === String(loadedForm.prpcode));
          if (matchedProperty) setSelectedProperty(matchedProperty);

          const stores = await fetchAllStoredata(API, token, loadedForm.prpcode);
          if (!alive) return;
          setStoreData(stores || []);

          if (loadedForm.strcode && stores?.length > 0) {
            const matchedStore = stores.find((x) => String(x.StrCode) === String(loadedForm.strcode));
            if (matchedStore) setSelectedStore(matchedStore);
          }
        }
      } catch (err: any) {
        console.log('[WarehouseNEW] initScreen error =>', err?.response?.data || err);
      }
    };

    initScreen();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userid, token]);

  // Property list on mount (legacy second mount effect).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchPropertyData(API, token);
      if (alive) setPropertyData(data || []);
    };
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stores of the chosen property.
  useEffect(() => {
    if (!form.prpcode) return;
    let alive = true;
    const load = async () => {
      const stores = await fetchAllStoredata(API, token, form.prpcode);
      if (alive) setStoreData(stores || []);
    };
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.prpcode]);

  const handlePreview = async () => {
    if (!form.prpcode) {
      AppAlert.alert('Validation', 'Property is required');
      return;
    }
    if (!form.strcode) {
      AppAlert.alert('Validation', 'Store is required');
      return;
    }
    const userPtype = await AsyncStorage.getItem('user_prptype');
    try {
      setLoading(true);
      const payload = buildPreviewPayload(userPtype, form.prpcode, form.strcode, form.stockType);
      const responseData = await fetchWarehouseLocations(API, token, payload);

      if (userid) {
        await saveDefaultPreference(API, token, userid, {
          criteria: buildPreviewPayload(userPtype, form.prpcode, form.strcode, form.stockType),
        });
      }

      if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
        AppAlert.alert('No Data Found', 'No warehouse data available');
        return;
      }

      onPreview({ criteria: form, dashboardData: responseData });
    } catch (e: any) {
      console.log('[WarehouseNEW] preview api error ::', e?.response?.data || e?.message);
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const propertyLabel =
    selectedProperty?.LngName ||
    propertyData.find((x) => String(x.PrpCode) === String(form.prpcode))?.LngName ||
    '';
  const storeLabel =
    selectedStore?.StrName || storeData.find((x) => String(x.StrCode) === String(form.strcode))?.StrName || '';

  // The legacy <Picker> showed its first item ("All") for the initial 'ALL' value.
  const stockValue = STOCK_TYPE_OPTIONS.some((o) => o.value === form.stockType) ? form.stockType : 'All';

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[CONTENT, { maxWidth: 720, padding: isPhone ? 12 : 16, gap: 12 }]}
      >
        <Card style={{ gap: 12 }}>
          <SectionHead title="Property Details" />
          <Field label="Property Group" required value="Yarn Division" placeholder="Property Group" editable={false} />
        </Card>

        <Card style={{ gap: 12 }}>
          <SectionHead title="Warehouse Selection" />
          <PickField
            label="Prod. Property"
            value={String(propertyLabel || '')}
            placeholder="Select Property"
            onPress={() => setPropertyPickerVisible(true)}
          />
          <PickField
            label="Prod. Store"
            value={String(storeLabel || '')}
            placeholder="Select Store"
            onPress={() => setStorePickerVisible(true)}
          />
          <Segment
            label="Stock Type"
            value={stockValue}
            options={STOCK_TYPE_OPTIONS}
            onChange={(value) => setValue('stockType', value)}
          />
        </Card>

        <Btn label="PREVIEW" icon="visibility" kind="copper" onPress={handlePreview} loading={loading} />
      </ScrollView>

      <PickerSheet
        open={propertyPickerVisible}
        title="Select Property"
        searchPlaceholder="Search property..."
        rows={propertyData}
        keyOf={(row) => String(row.PrpCode)}
        labelOf={(row) => String(row.LngName ?? '')}
        searchOf={(row) => row.LngName}
        selectedKey={String(form.prpcode || '')}
        onClose={() => setPropertyPickerVisible(false)}
        onPick={(item) => {
          setSelectedProperty(item);
          setValue('prpcode', item?.PrpCode || '');
          setPropertyPickerVisible(false);
        }}
      />

      {/* legacy store picker: lists StrName, but its search box matches StrCode */}
      <PickerSheet
        open={storePickerVisible}
        title="Select Store"
        searchPlaceholder="Search property..."
        rows={storeData}
        keyOf={(row) => String(row.StrCode)}
        labelOf={(row) => String(row.StrName ?? '')}
        searchOf={(row) => row.StrCode}
        selectedKey={String(form.strcode || '')}
        onClose={() => setStorePickerVisible(false)}
        onPick={(item) => {
          setSelectedStore(item);
          setValue('strcode', item?.StrCode || '');
          setStorePickerVisible(false);
        }}
      />
    </View>
  );
}
