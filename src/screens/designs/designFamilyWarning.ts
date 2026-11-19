/** Map the Laravel read-only yearwise DAPDesign response to UI warning data. */
export type CatalogFamilyDesign = {
    dsn_code?: string | number | null;
    code?: string | null;
    mdsn_code?: string | number | null;
    gst_grp?: string | number | null;
    prpcode?: string | null;
};

export type CatalogFamilyWarning = {
    family: string;
    exact: boolean;
    knownMainDesign: CatalogFamilyDesign | null;
    mainDesigns: CatalogFamilyDesign[];
    matches: CatalogFamilyDesign[];
    similarCount: number;
};

export const normalizedDesignName = (value: unknown): string =>
    String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\u2010-\u2015]/g, '-')
        .replace(/\s+/g, ' ');

export const designFamilyName = (value: unknown): string =>
    normalizedDesignName(value).split('-')[0].trim();

/** Reject malformed/stale backend responses instead of claiming no match. */
export function fromYearwiseDesignFamilyResponse(raw: unknown): CatalogFamilyWarning | null {
    const data: any = raw && typeof raw === 'object' ? raw : null;
    if (!data || typeof data.found !== 'boolean' || typeof data.exact !== 'boolean' ||
        typeof data.family !== 'string' || data.source !== 'YEARWISE_DAPDESIGN' ||
        !Array.isArray(data.main_designs) || !Array.isArray(data.similar_designs)) {
        throw new Error('Unexpected yearwise DAPDesign family-check response');
    }
    if (!data.found) return null;
    const parents: CatalogFamilyDesign[] = data.main_designs;
    const examples: CatalogFamilyDesign[] = data.similar_designs;
    return {
        family: normalizedDesignName(data.family),
        exact: data.exact,
        knownMainDesign: parents.length === 1 ? parents[0] : null,
        mainDesigns: parents,
        matches: examples,
        similarCount: Number(data.similar_count) || 0,
    };
}
