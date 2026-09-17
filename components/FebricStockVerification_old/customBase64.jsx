// Custom Base64 encoding/decoding functions
const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const customEncode = str => {
  let encoded = '';
  for (let i = 0; i < str.length; i += 3) {
    const chunk =
      (str.charCodeAt(i) << 16) |
      (str.charCodeAt(i + 1) << 8) |
      str.charCodeAt(i + 2);
    encoded +=
      chars[chunk >> 18] +
      chars[(chunk >> 12) & 63] +
      chars[(chunk >> 6) & 63] +
      chars[chunk & 63];
  }
  // Handle padding
  const padding = str.length % 3;
  if (padding > 0) {
    encoded = encoded.slice(0, padding - 3) + (padding === 1 ? '==' : '=');
  }
  return encoded;
};

export const customDecode = str => {
  let decoded = '';
  for (let i = 0; i < str.length; i += 4) {
    const chunk =
      (chars.indexOf(str[i]) << 18) |
      (chars.indexOf(str[i + 1]) << 12) |
      (chars.indexOf(str[i + 2]) << 6) |
      chars.indexOf(str[i + 3]);
    decoded += String.fromCharCode(
      (chunk >> 16) & 255,
      (chunk >> 8) & 255,
      chunk & 255,
    );
  }
  // Remove padding characters
  return decoded.replace(/\0+$/, '');
};
