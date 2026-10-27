import React from 'react';
import {Text,View} from 'react-native';
import ProductionPoolsTab from './ProductionPoolsTab';

/** Mounted ONLY from the real src/components/ProductionOrderNEW/index.tsx Pools tab. */
export default function ProductionOrdersPoolsSlot({apiBase='/api',prptype,yearno,property,requestFn,canViewAll=false}) {
  if (!prptype || !property || !yearno) {
    return <View style={{padding:20}}><Text>Select a Property and Financial Year above to view Pools.</Text></View>;
  }
  return <ProductionPoolsTab
    apiBase={apiBase} prptype={prptype} yearno={yearno}
    property={property} requestFn={requestFn} view={canViewAll?'owner':'my'} />;
}
