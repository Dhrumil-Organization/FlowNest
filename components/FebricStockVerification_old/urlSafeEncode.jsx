import { customEncode, customDecode } from './customBase64';

export const urlSafeEncode = (prpcode, yearno, costuid, txntype, token) => {
  const combinedData = `${prpcode}/${yearno}/${costuid}/${txntype}/${token}`;
  const base64Encoded = customEncode(combinedData);
  // Replace characters that are not URL-safe
  return base64Encoded
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const urlSafeDecode = encodedStr => {
  // Reverse URL-safe replacements
  let base64Decodable = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64Decodable.length % 4) {
    base64Decodable += '=';
  }
  const decodedData = customDecode(base64Decodable);
  return decodedData.split('/');
};
