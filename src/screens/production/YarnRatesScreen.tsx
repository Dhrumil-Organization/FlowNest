import React from 'react';
import { YarnRatesView } from '../yarnRates/YarnRatesView';

// Yarn Rates — the ERP Designing "Yarn Rates" master on live ERP data: purchase price of each main yarn by
// supplier and date (latest entry = current rate), price trend per supplier with the actual purchases beside it.
// Backend: YarnRateController (POST /api/yarn_rates/list | item | parties | save | delete); table
// TMSMASTER.dbo.FAMIYarnRate (clone of FAMIRateP). Rights: production.yarn_rates view / add / edit / delete.
export function YarnRatesScreen() {
  return <YarnRatesView />;
}
