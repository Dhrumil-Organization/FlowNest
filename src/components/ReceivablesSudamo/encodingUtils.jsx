// encodingUtils.js
import { Buffer } from 'buffer';

// Encode to Base64 (URL-safe)
// encodingUtils.js
export const encodeData = (prpcode, yearno, costuid, txntype, token) => {
  const combinedData = `${prpcode}/${yearno}/${costuid}/${txntype}/${token}`;
  return Buffer.from(combinedData, 'utf8').toString('base64');
};
