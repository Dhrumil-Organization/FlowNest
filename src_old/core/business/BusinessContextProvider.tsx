import React, { createContext, useContext, useMemo } from 'react';
import { useAppSessionStore } from '../../stores/AppSessionStore';

export type BusinessContextValue = {
  yearNo: string;
  yearName: string;
  prpCode: string;
  prpGroup: string;
  strCode: string;
  isReady: boolean;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessContextProvider({ children }: { children: React.ReactNode }) {
  const context = useAppSessionStore((state) => state.appSession?.business_context);

  const value = useMemo<BusinessContextValue>(() => ({
    yearNo: context?.year_no || '',
    yearName: context?.year_name || '',
    prpCode: context?.prp_code || '',
    prpGroup: context?.prp_group || '',
    strCode: context?.str_code || '',
    isReady: Boolean(context?.year_no && context?.prp_code && context?.str_code),
  }), [context]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext(): BusinessContextValue {
  const value = useContext(BusinessContext);
  if (!value) throw new Error('useBusinessContext must be used inside BusinessContextProvider');
  return value;
}
