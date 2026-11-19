// FILE: src/api/beamReportAPI.ts
// Beam Outward / Inward reports: POST /knit_beam_inward_outward_crud {action: report_outward | report_inward}
import client from './legacyClient';
import { bodyOf, failed, messageOf, unwrapRows } from './repackingIssueAPI';
import { createBeamService } from './beamInOutAPI';
import { inRowFrom, outRowFrom, type InRow, type OutRow } from '../features/beamReport/logic';
import type { BeamContext, Opt } from '../features/beamInOut/types';
import type { LookupFilter, LookupKind, LookupOption } from '../features/repackingIssue/types';

export interface ReportFilter {
  from: string;
  to: string;
  parCode: string;
  beamNo: string;
  pendingOnly?: boolean;
}

export interface BeamReportService {
  lookup(kind: LookupKind, ctx: BeamContext, filter?: LookupFilter): Promise<LookupOption[]>;
  parties(ctx: BeamContext, search: string): Promise<Opt[]>;
  outward(ctx: BeamContext, f: ReportFilter): Promise<OutRow[]>;
  inward(ctx: BeamContext, f: ReportFilter): Promise<InRow[]>;
}

export function createBeamReportService(): BeamReportService {
  const beams = createBeamService('beam_outward');
  const run = async (action: string, ctx: BeamContext, f: ReportFilter) => {
    const res = await client.post('/knit_beam_inward_outward_crud', {
      prpcode: ctx.prpCode, yearno: ctx.yearNo, txntype: 'beam_outward', action,
      fromdate: f.from, todate: f.to, parcode: f.parCode, beamno: f.beamNo.trim(), pendingonly: f.pendingOnly ? 1 : 0,
    }, { timeout: 120000 });
    const data = res?.data;
    if (failed(data)) throw new Error(messageOf(data, 'Report could not be loaded.'));
    return unwrapRows(bodyOf(data));
  };
  return {
    lookup: (kind, ctx, filter) => beams.lookup(kind, ctx, filter),
    parties: (ctx, search) => beams.parties(ctx, 'beam_outward', search),
    outward: async (ctx, f) => (await run('report_outward', ctx, f)).map(outRowFrom),
    inward: async (ctx, f) => (await run('report_inward', ctx, f)).map(inRowFrom),
  };
}
