// FILE: src/screens/reports/beamShortage/beamShortageApi.ts
// Single service used by the Beam Shortage report.
//
// USE_MOCK = true  -> hard-coded test data (beamShortageMockData.ts), same
//                     response shape as the PHP API. No network call is made.
// USE_MOCK = false -> live backend:
//                     POST /api/reports/beam_shortage  (BeamShortageReportController)
// Nothing in the screen changes between the two.

// TO GO LIVE (3 small edits in this file):
//   1. un-comment the BeamShortageAPI import below
//   2. set USE_MOCK = false
//   3. un-comment the "LIVE API" line inside report()

import { BeamShortageAPI } from '../../../api/legacyClient';
import { mockBeamShortage } from './beamShortageMockData';

export const USE_MOCK = false;

export type BeamShortageRequest = {
  prptype: string;
  prpcode: string;
  yearno: string | number;
  fromdate: string; // YYYY-MM-DD
  todate: string; // YYYY-MM-DD
  /** Source filter sent to the existing Beam Shortage API. */
  beamtype: 'all' | 'creel' | 'indent';
};

export const BeamShortageService = {
  report: (body: BeamShortageRequest): Promise<any> => {
    // LIVE API:
    if (!USE_MOCK) return BeamShortageAPI.report(body);
    return mockBeamShortage(body);
  },
};
