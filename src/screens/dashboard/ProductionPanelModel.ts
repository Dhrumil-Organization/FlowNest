/** Pure presentation helpers for the Claude Daily Production lower panels. */
import { Bucket, DailyRow, Key, ShedSpec, bucketsOf } from './ProductionDailyModel';

export const DESIGN_PREVIEW_LIMIT = 6;

/** Sort rows like the Artifact: shed in physical order, machine in number order,
 * and retain each row's separately calculated output-rank badge.
 * Keys are always property-qualified; labels alone must never merge ERP rows. */
export function compareMachineNumber(a: Bucket, b: Bucket): number {
  const parse = (bucket: Bucket) => {
    const text = String(bucket.label || '');
    const code = String(bucket.entries[0]?.machine_code ?? '');
    const parsed = /(?:^|\b)([a-z]+)[-\s]*0*(\d{1,3})\.?$/i.exec(text) ||
                   /^0*(\d{1,3})\.?$/.exec(code);
    return parsed
      ? { prefix: parsed.length === 3 ? parsed[1].toUpperCase() : '', number: Number(parsed[parsed.length - 1]), label: text }
      : { prefix: '~', number: Number.MAX_SAFE_INTEGER, label: text };
  };
  const x=parse(a), y=parse(b);
  return x.prefix.localeCompare(y.prefix) || x.number - y.number ||
    x.label.localeCompare(y.label,undefined,{numeric:true}) || a.key.localeCompare(b.key);
}

/** Physical shed order is configured; numeric output rank is a separate dimension. */
export function orderForClaude(buckets:Bucket[], field:Key, sheds:ShedSpec[]):Bucket[]{
  if(field==='machine') return buckets.slice().sort(compareMachineNumber);
  if(field!=='shed') return buckets.slice();
  const position=new Map(sheds.map((s,i)=>[s.key,i]));
  return buckets.filter(b=>b.key!=='UNMAPPED').slice()
    .sort((a,b)=>(position.get(a.key)??999)-(position.get(b.key)??999));
}

/** The diagnostic is not a fifth physical shed. Keep it separate from four shed rows. */
export function unmappedBucket(buckets:Bucket[],field:Key):Bucket|undefined {
  return field==='shed'?buckets.find(b=>b.key==='UNMAPPED'):undefined;
}

export function designMixRows(rows:DailyRow[]):Bucket[]{return bucketsOf(rows,'design');}
