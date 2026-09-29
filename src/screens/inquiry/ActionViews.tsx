// FILE: src/screens/inquiry/ActionViews.tsx
// Send quotation / Confirm / Reject (legacy SendQuotation, ConfirmInquiry,
// RejectInquiry screens). Same endpoints + payloads:
//   POST /api/inquiries/{id}/email     { email, subject, message, prptype, yearno }
//   POST /api/inquiries/{id}/whatsapp  { mobile, message, prptype, yearno }
//   GET  /api/inquiries/{id}/pdf
//   POST /api/inquiries/{id}/confirm   { payment_terms, delivery_terms, remarks, prptype, yearno }
//   POST /api/inquiries/{id}/reject    { reason, remarks, prptype, yearno }
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav } from './InquiryContext';
import { errMsg, formatDate, Inquiry, INQUIRY_REJECT_REASONS, isValidEmail, isValidMobile } from './inquiryModel';
import { Banner, Btn, Card, Field, MONO, RadioList, ViewShell } from './ui';

function useInquiryHead(id: number) {
  const { api } = useInquiry();
  const [inq, setInq] = useState<Inquiry | null>(null);
  useEffect(() => {
    let alive = true;
    api.show(id).then((d) => { if (alive) setInq(d); }).catch(() => undefined);
    return () => { alive = false; };
  }, [api, id]);
  return inq;
}

function Head({ inq }: { inq: Inquiry | null }) {
  if (!inq) return null;
  return (
    <View style={s.head}>
      <Text style={s.headNo}>{inq.inquiry_no}</Text>
      <Text style={s.headParty}>{inq.party_name}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

type Channel = 'email' | 'whatsapp';

export function QuotationView({ id }: { id: number }) {
  const { api } = useInquiry();
  const nav = useInquiryNav();
  const inq = useInquiryHead(id);
  const [channel, setChannel] = useState<Channel>('email');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [mobile, setMobile] = useState('');
  const [waMsg, setWaMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!inq) return;
    setSubject(`Quotation ${inq.inquiry_no} - ${inq.party_name}`);
    setEmailMsg(`Dear ${inq.party_name},\n\nPlease find attached our quotation ${inq.inquiry_no} dated ${formatDate(inq.inquiry_date)}.\n\nLooking forward to your response.\n\nRegards,\nSales Team`);
    setWaMsg(`Dear ${inq.party_name},\n\nPlease find attached our quotation ${inq.inquiry_no}.\n\nLooking forward to your response.\n\nRegards,\nSales Team`);
  }, [inq]);

  const sendEmail = async () => {
    if (!isValidEmail(email)) { AppAlert.alert('Invalid Email', 'Please enter a valid email address'); return; }
    setSending(true);
    try {
      await api.sendEmail(id, { email: email.trim(), subject, message: emailMsg });
      AppAlert.alert('Sent!', 'Quotation emailed successfully', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to send email'));
    } finally {
      setSending(false);
    }
  };

  const sendWhatsapp = async () => {
    if (!isValidMobile(mobile)) { AppAlert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile'); return; }
    setSending(true);
    try {
      await api.sendWhatsapp(id, { mobile: mobile.trim(), message: waMsg });
      AppAlert.alert('Sent!', 'Quotation sent via WhatsApp', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to send WhatsApp'));
    } finally {
      setSending(false);
    }
  };

  const pdf = async () => {
    setPdfBusy(true);
    try {
      const { pdf_url } = await api.pdf(id);
      if (pdf_url) await Linking.openURL(pdf_url);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to generate PDF'));
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <ViewShell title="Send Quotation" subtitle={inq ? `${inq.inquiry_no} · ${inq.party_name}` : null} maxWidth={720}>
      <Head inq={inq} />
      <View style={s.tabs}>
        {(['email', 'whatsapp'] as Channel[]).map((c) => (
          <TouchableOpacity key={c} onPress={() => setChannel(c)} style={[s.tab, channel === c && s.tabOn]} activeOpacity={0.75}>
            <Text style={[s.tabText, channel === c && { color: '#fff' }]}>{c === 'email' ? 'Email' : 'WhatsApp'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {channel === 'email' ? (
        <Card>
          <Field label="To Email" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="party@example.com" />
          <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Quotation subject" />
          <Field label="Message" value={emailMsg} onChangeText={setEmailMsg} multiline placeholder="Email body" inputStyle={{ minHeight: 140 }} />
          <Banner tone="info" icon="attach-file" text="PDF quotation will be attached automatically" />
          <Btn title="Send Email" icon="email" variant="accent" onPress={sendEmail} loading={sending} />
        </Card>
      ) : (
        <Card>
          <Field label="Mobile Number" required value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="10-digit mobile" maxLength={13} />
          <Field label="Message" value={waMsg} onChangeText={setWaMsg} multiline placeholder="WhatsApp message" inputStyle={{ minHeight: 120 }} />
          <Banner tone="info" icon="attach-file" text="PDF will be sent as document attachment" />
          <Btn title="Send via WhatsApp" icon="chat" variant="accent" onPress={sendWhatsapp} loading={sending} />
        </Card>
      )}
      <Btn title="Download PDF" icon="picture-as-pdf" variant="outline" onPress={pdf} loading={pdfBusy} />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */

export function ConfirmView({ id }: { id: number }) {
  const { api } = useInquiry();
  const nav = useInquiryNav();
  const inq = useInquiryHead(id);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.confirm(id, { payment_terms: paymentTerms, delivery_terms: deliveryTerms, remarks });
      const soNo = res?.sales_order?.so_no;
      AppAlert.alert('Confirmed!', `Sales Order ${soNo ?? ''} has been created successfully.`, [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to confirm'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewShell title="Confirm Inquiry" subtitle={inq ? `${inq.inquiry_no} · ${inq.party_name}` : null} maxWidth={720}>
      <Head inq={inq} />
      <Banner tone="success" icon="check-circle" title="Confirm Inquiry" text="This will create a Sales Order with all costed designs from this inquiry." />
      <Card>
        <Field label="Payment Terms" value={paymentTerms} onChangeText={setPaymentTerms} multiline placeholder="e.g., 30% advance, 70% on delivery" />
        <Field label="Delivery Terms" value={deliveryTerms} onChangeText={setDeliveryTerms} multiline placeholder="e.g., Delivery within 45 days from order" />
        <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline placeholder="Any additional notes for the sales order" style={{ marginBottom: 0 }} />
      </Card>
      <View style={s.btnRow}>
        <Btn title="Cancel" variant="secondary" onPress={nav.back} style={{ flex: 1 }} />
        <Btn title="Confirm & Create Sales Order" icon="check" variant="accent" onPress={submit} loading={saving} style={{ flex: 2 }} />
      </View>
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */

export function RejectView({ id }: { id: number }) {
  const { api } = useInquiry();
  const nav = useInquiryNav();
  const inq = useInquiryHead(id);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason) { AppAlert.alert('Reason required', 'Please select a rejection reason'); return; }
    setSaving(true);
    try {
      await api.reject(id, { reason, remarks });
      AppAlert.alert('Rejected', 'Inquiry has been marked as rejected', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to reject'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewShell title="Reject Inquiry" subtitle={inq ? `${inq.inquiry_no} · ${inq.party_name}` : null} maxWidth={720}>
      <Head inq={inq} />
      <Banner tone="danger" icon="info-outline" title="Mark as Rejected" text="Select the reason for rejection. This helps you track why inquiries don't convert." />
      <Card title="Reason *">
        <RadioList options={INQUIRY_REJECT_REASONS} value={reason} onChange={setReason} color={T.red} />
      </Card>
      <Card>
        <Field label="Additional Remarks" value={remarks} onChangeText={setRemarks} multiline placeholder="Any details (optional)" style={{ marginBottom: 0 }} />
      </Card>
      <View style={s.btnRow}>
        <Btn title="Cancel" variant="secondary" onPress={nav.back} style={{ flex: 1 }} />
        <Btn title="Confirm Rejection" icon="close" variant="danger" onPress={submit} loading={saving} style={{ flex: 2 }} />
      </View>
    </ViewShell>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: T.nav, borderRadius: 14, padding: 14, marginBottom: 10 },
  headNo: { fontSize: 17, fontWeight: '900', color: '#fff', fontFamily: MONO },
  headParty: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 3, marginBottom: 10 },
  tab: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
