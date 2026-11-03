// FILE: src/screens/reports/assignReport/assignReportApi.ts
// Reports → Assign Report — the web ERP's "Reports" (UserDashbord/components/Reports) on FlowNest.
// Same two backend calls as the web screen, nothing new on the server:
//   GET  /api/get_user_saved_report_settings   the reports assigned to the user + their saved settings
//   POST /api/rpt_gateway                       runs one saved setting -> rows + grid definition, or a PDF / Excel
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { resolveNewErpApiBaseUrl } from '../../../api/client';

export type SavedSetting = { name: string; value: Record<string, any> };
export type SavedReport = { rptid: string | number; rptname: string; settings: SavedSetting[] };

export type SettingsAnswer = {
  reports: SavedReport[];
  /** mail scheduler: the login's e-mail set-up (profile) */
  email: string;
  isEmailValid: boolean;
  emailPwdSet: boolean;
  currentdate: string;
  weekstartdate: string;
  weekenddate: string;
  monthstartdate: string;
  monthenddate: string;
};

/** rptsettings[0] of the gateway answer (comma lists, one entry per column) */
export type RptSettings = {
  rptid?: string | number;
  settingsrptid?: string | number;
  rptcols: string;
  rptcolslabels: string;
  rptcolswidth: string;
  rptcolsalign: string;
  rptorderbycol: string;
  rpttype?: string;
  rptsumfields: string;
  rptnumberformat: string;
  rptgroupcol: string;
  rptcolsskip: string;
};

export type GatewayAnswer = {
  rows: Record<string, any>[];
  tbls: any[];
  settings: RptSettings | null;
  /** when the setting is an export: the file */
  file: { name: string; kind: 'pdf' | 'excel' | string; base64: string } | null;
  message: string;
};

async function base() {
  const selectedProperty = await AsyncStorage.getItem('selected_property');
  return resolveNewErpApiBaseUrl(selectedProperty).replace(/\/+$/, '');
}

async function headers() {
  const token = (await AsyncStorage.getItem('access_token')) || '';
  if (!token) throw new Error('Unauthenticated.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-platform': 'mob',
  };
}

const msgOf = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.response?.data?.response?.message || (e?.code === 'ECONNABORTED' ? 'The request timed out.' : e?.message) || fallback;

/** one saved mail schedule (rptmailschedulebrowse row / rptmailscheduleadd payload) */
export type MailSchedule = Record<string, any> & {
  rptid: string | number; rptname: string; settingsname: string; schedtype: string; status: string;
  schedmonths: string; schedweeks: string; scheddays: string; scheddt: string; subject: string;
  mailto: string; mailcc: string; mailbcc: string; interval: number | string;
};

export const MailScheduleAPI = {
  /** the empty record (its keys = the payload keys of add / edit) */
  async template(): Promise<Record<string, any>> {
    try {
      const res = await axios.get(`${await base()}/api/rptmailscheduleshow`, { headers: await headers(), timeout: 60000 });
      const main = res.data?.data?.main;
      return Array.isArray(main) && main[0] && typeof main[0] === 'object' ? main[0] : {};
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not load the mail schedule form.'));
    }
  },
  async list(): Promise<MailSchedule[]> {
    try {
      const res = await axios.get(`${await base()}/api/rptmailschedulebrowse`, { headers: await headers(), timeout: 60000 });
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not load the mail schedules.'));
    }
  },
  /** action add | edit — the payload has every key of the template + action */
  async save(action: 'add' | 'edit', payload: Record<string, any>): Promise<string> {
    try {
      const res = await axios.post(`${await base()}/api/${action === 'edit' ? 'rptmailscheduleedit' : 'rptmailscheduleadd'}`, { ...payload, action }, { headers: await headers(), timeout: 60000 });
      if (res.data?.success !== true) throw new Error(res.data?.message || 'Could not save the schedule.');
      return String(res.data.message || 'Saved.');
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not save the schedule.'));
    }
  },
  async remove(rptid: string | number, settingsname: string): Promise<string> {
    try {
      const res = await axios.post(`${await base()}/api/rptmailscheduledelete`, { action: 'delete', rptid, settingsname }, { headers: await headers(), timeout: 60000 });
      if (res.data?.success !== true) throw new Error(res.data?.message || 'Could not delete the schedule.');
      return String(res.data.message || 'Deleted.');
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not delete the schedule.'));
    }
  },
};

export const AssignReportAPI = {
  async settings(): Promise<SettingsAnswer> {
    try {
      const res = await axios.get(`${await base()}/api/get_user_saved_report_settings`, { headers: await headers(), timeout: 60000 });
      const r = res.data?.response || {};
      return {
        reports: Array.isArray(r.data) ? r.data : [],
        email: String(r.email || ''),
        isEmailValid: !(r.email === '' || r.email == null || String(r.isemailvalid) === '0'),
        emailPwdSet: !(r.emailpwd === '' || r.emailpwd == null),
        currentdate: String(r.currentdate || ''),
        weekstartdate: String(r.weekstartdate || ''),
        weekenddate: String(r.weekenddate || ''),
        monthstartdate: String(r.monthstartdate || ''),
        monthenddate: String(r.monthenddate || ''),
      };
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not load your reports.'));
    }
  },

  /** runs one saved setting (its whole value object, dates replaced by what the user typed) */
  async run(payload: Record<string, any>): Promise<GatewayAnswer> {
    let res: any;
    try {
      res = await axios.post(`${await base()}/api/rpt_gateway`, payload, { headers: await headers(), timeout: 300000 });
    } catch (e: any) {
      throw new Error(msgOf(e, 'Could not run the report.'));
    }
    const d = res.data || {};
    if (d.success === false) throw new Error(d.message || 'Could not run the report.');
    const r = d.response || {};
    if (r.error === true) throw new Error(r.message || 'Could not run the report.');
    return {
      rows: Array.isArray(r.data) ? r.data : [],
      tbls: Array.isArray(r.tbls) ? r.tbls : [],
      settings: Array.isArray(r.rptsettings) && r.rptsettings[0] ? r.rptsettings[0] : null,
      file: r.filename && r.filedata ? { name: String(r.filename), kind: String(r.export || ''), base64: String(r.filedata) } : null,
      message: String(r.message || ''),
    };
  },
};
