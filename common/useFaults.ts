import AppAlert from '@/common/utils/appAlert';
import axios from 'axios';
import { useState } from 'react';
import { Alert } from 'react-native';
import { API } from './API/dynamicAPI';

interface Fault {
  Faults: string;
  RDesc: string;
  Remark: string;
  RsnCode: string;
  SrNo: string;
  SubSr: string;
  UId: string;
}

export const useFaults = (token: string) => {
  const [faultsData, setFaultsData] = useState<Fault[]>([]);
  const [faultsLoading, setFaultsLoading] = useState<boolean>(false);
  const [showFaultsModal, setShowFaultsModal] = useState<boolean>(false);

  const fetchFaultsData = async (params: {
    UId: string;
    SrNo: string;
    BeamNo: string;
    ShfCode: string;
    ChkDate: string;
    PrpCode: string;
    yearno: string;
    txntype: string;
  }) => {
    setFaultsLoading(true);
    try {
      const response = await axios.get(`${API}/api/get_checking_fault_help`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params,
      });

      if (response.data.success && response.data.response.data) {
        setFaultsData(response.data.response.data);
        setShowFaultsModal(true);
      } else {
        AppAlert.alert('Error', 'No faults data received.');
      }
    } catch (error) {
      console.error('Failed to fetch faults:', error);
      AppAlert.alert('Error', 'Failed to fetch faults.');
    } finally {
      setFaultsLoading(false);
    }
  };

  const handleSaveFaults = async (form: any, FormState: any) => {
    console.log('faults form', form);
    const params = {
      UId: form.selectedMachine?.UId || form.UId || '',
      SrNo: '0',
      BeamNo: form.BeamNo || form.selectedMachine?.BeamNo || '',
      ShfCode: form.ShfCode || FormState.values.ShfCode || '',
      ChkDate: form.ChkDate || '',
      PrpCode: form.PrpCode || form.selectedMachine?.PrpCode || '',
      yearno: form.YearNo || '',
      txntype: 'beam_checking',
    };
    await fetchFaultsData(params);
  };

  return {
    faultsData,
    setFaultsData,
    faultsLoading,
    showFaultsModal,
    setShowFaultsModal,
    handleSaveFaults,
    fetchFaultsData,
  };
};