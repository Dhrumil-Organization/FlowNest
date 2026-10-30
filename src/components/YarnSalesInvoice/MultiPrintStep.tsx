// FILE: src/components/SalesInvoiceBrowse/MultiPrintStep.tsx
// MULTI PRINT screen — one page, no list, no Load, no modal:
//   Property, Year, Store, Print Type, From / To Date, and right under the dates the Multi Print form
//   (Sales A/c, Voucher No, Party, Print Format) with the Print button. Print -> PDF screen.
import { AppAlert } from '@/common/utils/appAlert';
import { Card, PickField } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchPropertyData, fetchStores } from './api';
import { buildYearOptions, financialYearDates, Row, storeCode, storeName, TXN_OPTIONS, txnLabel } from './model';
import MultiPrintForm from './MultiPrintForm';
import { CONTENT, DmyDateField, PickerSheet } from './ui';

type Props = { token: string; API: string; onOpenPdf: (pdfUrl: string, title: string) => void };

export default function MultiPrintStep({ token, API, onOpenPdf }: Props) {
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [storeData, setStoreData] = useState<Row[]>([]);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [txntype, setTxntype] = useState<string>(TXN_OPTIONS[0].txntype);
  const [txnPickerVisible, setTxnPickerVisible] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());

  // Property list — a single property is picked for you
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchPropertyData(API, token).then((data) => {
      if (!alive) return;
      const list = data || [];
      setPropertyData(list);
      if (list.length === 1) setSelectedProperty(list[0]);
    });
    return () => {
      alive = false;
    };
  }, [API, token]);

  // Store list — follows the picked property / year; a single store is picked for you
  useEffect(() => {
    const prp = selectedProperty?.PrpCode;
    if (!token || !prp) {
      setStoreData([]);
      setSelectedStore(null);
      return;
    }
    let alive = true;
    fetchStores(API, token, String(prp), selectedYear).then((list) => {
      if (!alive) return;
      setStoreData(list);
      setSelectedStore((prev) => {
        const keep = prev && list.find((s) => storeCode(s) === storeCode(prev));
        return keep || (list.length === 1 ? list[0] : null);
      });
    });
    return () => {
      alive = false;
    };
  }, [API, token, selectedProperty?.PrpCode, selectedYear]);

  const pickYear = (year: string) => {
    setSelectedYear(year);
    const d = financialYearDates(year);
    if (d) {
      setFromDate(d.from);
      setToDate(d.to);
    }
    setYearPickerVisible(false);
  };

  // Print pressed -> criteria must be complete
  const criteriaOk = () => {
    if (!selectedProperty?.PrpCode) return AppAlert.alert('Required', 'Please select property'), false;
    if (!selectedYear) return AppAlert.alert('Required', 'Please select year'), false;
    if (!selectedStore) return AppAlert.alert('Required', 'Please select store'), false;
    return true;
  };

  // criteria handed to the form (its apis run again whenever one of these changes)
  const ctx = {
    prpcode: selectedProperty?.PrpCode ? String(selectedProperty.PrpCode) : '',
    yearno: selectedYear,
    strcode: selectedStore ? storeCode(selectedStore) : '',
    txntype,
  };

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={[CONTENT, st.body]} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 16 }}>
          <View>
            {/* <Text style={st.kicker}>Sales Invoice</Text> */}
            <Text style={st.title}>MultiPrint</Text>
          </View>
          <PickField
            label="Property *"
            value={selectedProperty?.LngName}
            placeholder="Select property"
            icon="business"
            onPress={() => setPropertyPickerVisible(true)}
          />
          <PickField label="Year *" value={selectedYear} placeholder="Select year" icon="calendar-month" onPress={() => setYearPickerVisible(true)} />
          <PickField
            label="Store *"
            value={selectedStore ? storeName(selectedStore) : ''}
            placeholder={selectedProperty ? 'Select store' : 'Select property first'}
            icon="store"
            onPress={() => (selectedProperty ? setStorePickerVisible(true) : AppAlert.alert('Required', 'Please select property first'))}
          />
          <PickField label="Print Type" value={txnLabel(txntype)} placeholder="Select print type" icon="print" onPress={() => setTxnPickerVisible(true)} />
          <View style={st.dateRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={st.label}>From Date</Text>
              <DmyDateField value={fromDate} onChange={setFromDate} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={st.label}>To Date</Text>
              <DmyDateField value={toDate} onChange={setToDate} />
            </View>
          </View>
          <MultiPrintForm
            API={API}
            token={token}
            ctx={ctx}
            dateFrom={fromDate}
            dateTo={toDate}
            onBeforePrint={criteriaOk}
            onPdf={onOpenPdf}
          />
        </Card>
      </ScrollView>

      <PickerSheet
        open={propertyPickerVisible}
        title="Select Property"
        searchPlaceholder="Search property..."
        rows={propertyData}
        keyOf={(p) => String(p.PrpCode)}
        labelOf={(p) => String(p.LngName ?? '')}
        searchOf={(p) => String(p.LngName ?? '')}
        selectedKey={selectedProperty ? String(selectedProperty.PrpCode) : ''}
        onPick={(p) => {
          setSelectedProperty(p);
          setPropertyPickerVisible(false);
        }}
        onClose={() => setPropertyPickerVisible(false)}
      />
      <PickerSheet
        open={storePickerVisible}
        title="Select Store"
        searchPlaceholder="Search store..."
        rows={storeData}
        keyOf={(s) => storeCode(s)}
        labelOf={(s) => storeName(s)}
        searchOf={(s) => storeName(s)}
        selectedKey={selectedStore ? storeCode(selectedStore) : ''}
        onPick={(s) => {
          setSelectedStore(s);
          setStorePickerVisible(false);
        }}
        onClose={() => setStorePickerVisible(false)}
      />
      <PickerSheet
        open={txnPickerVisible}
        title="Select Print Type"
        rows={TXN_OPTIONS}
        keyOf={(o) => o.txntype}
        labelOf={(o) => o.label}
        selectedKey={txntype}
        onPick={(o) => {
          setTxntype(o.txntype);
          setTxnPickerVisible(false);
        }}
        onClose={() => setTxnPickerVisible(false)}
      />
      <PickerSheet
        open={yearPickerVisible}
        title="Select Year"
        rows={yearOptions}
        keyOf={(y) => y}
        labelOf={(y) => y}
        selectedKey={selectedYear}
        onPick={pickYear}
        onClose={() => setYearPickerVisible(false)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  body: { padding: 12 },
  kicker: { fontSize: 11, fontWeight: '800', color: T.copper, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', color: T.ink, marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
});
