import { Redirect } from 'expo-router';
import React from 'react';

// Old link kept working. Receivables is ONE menu entry (`receivables-screen`,
// right `production.receivables`); that screen opens Receivables Sudamo for the
// Sudamo / Knits login and Receivables for the Rayons login.
export default function ReceivablesSudamoRoute() {
  return <Redirect href={'/new/(tabs)/receivables-screen' as any} />;
}
