// // common/API/Functions.ts

// import AsyncStorage from '@/common/utils/compatibleStorage';
// import axios from 'axios';
// // import RNFS from 'react-native-fs';
// import * as FileSystem from 'expo-file-system';
// import { initDatabase, saveLargeData, readPrptypeCache, getAccountByCode, getBankByName, getPrptypeIndex, clearOldChunks } from '@/common/API/DatabaseManager';
// import { API } from './dynamicAPI';

// let cancelToken: any;

// export const fetchPropertyGroupDataDCR = async (token: string) => {
//     try {


//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();

//         console.log('🔵 Property group calling (API)...');
//         let params = null;
//         const response = await axios.get(
//             // `https://apig.tms-webapp.com/api/get_criterion?fetch=prptype&txntype=mob_daily_collection_report`,
//             `${API}/api/get_criterion?fetch=prptype&txntype=mob_daily_collection_report`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/javascript',
//                     Accept: 'application/json'
//                 },
//                 params
//             }
//         );

//         console.log('🔵 api property group response', response);

//         if (response.data.success && response.data.response.data.length > 0) {
//             const propertyGroupData = response.data.response.data;

//             // 3. Response ko cache me store karo


//             return propertyGroupData;
//         }

//         return [];
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('fetchpropertyGroupData error', error);
//         }
//         return [];
//     }
// };
// export const fetchPropertyDataDCR = async (token: string, prptype: string) => {
//     try {


//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();

//         console.log('🔵 Property group calling (API)...');
//         let params = null;
//         const response = await axios.get(
//             // `https://apig.tms-webapp.com/api/get_criterion?prptype=${prptype}&txntype=mob_daily_collection_report&fetch=prp`,
//             `${API}/api/get_criterion?prptype=${prptype}&txntype=mob_daily_collection_report&fetch=prp`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/javascript',
//                     Accept: 'application/json'
//                 },
//                 params
//             }
//         );

//         console.log('🔵 api property response', prptype, response);

//         if (response.data.success && response.data.response.data.length > 0) {
//             const propertyGroupData = response.data.response.data;

//             // 3. Response ko cache me store karo


//             return propertyGroupData;
//         }

//         return [];
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('fetchpropertyGroupData error', error);
//         }
//         return [];
//     }
// };

// // 

// export const fetchPropertyData = async (token: string) => {
//     try {
//         // 1. Pehle cache check karo
//         const cached = await AsyncStorage.getItem('get_property');
//         // if (cached) {
//         //     console.log('✅ Property from cache');
//         //     const parsed = JSON.parse(cached);
//         //     return Array.isArray(parsed) ? parsed : [];
//         // }

//         // 2. Cache nahi mila toh API call
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();

//         console.log('🔵 Property calling (API)...');
//         let params = null;
//         const response = await axios.get(
//             // 'https://apig.tms-webapp.com/api/getproperty',
//             `${API}/api/getproperty`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/javascript',
//                     Accept: 'application/json'
//                 },
//                 params
//             }
//         );

//         console.log('🔵 api property response', response);

//         if (response.data.success && response.data.response.data.length > 0) {
//             const propertyData = response.data.response.data;

//             // 3. Response ko cache me store karo
//             await AsyncStorage.setItem('get_property', JSON.stringify(propertyData));

//             return propertyData;
//         }

//         return [];
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('fetchPropertyData error', error);
//         }
//         return [];
//     }
// };

// export const fetchCurrentYearData = async (token: string) => {
//     try {
//         // 1. Pehle cache check karo
//         const cached = await AsyncStorage.getItem('current_year');
//         // if (cached) {
//         //     console.log('✅ Year from cache');
//         //     const parsed = JSON.parse(cached);
//         //     console.log('parsed year', parsed.data);
//         //     return parsed ? parsed : null;
//         // }

//         // 2. Cache nahi mila toh API call
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();

//         console.log('🔵 Year calling (API)...');
//         let params = null;
//         const response = await axios.get(
//             // 'https://apig.tms-webapp.com/api/getcurrentyear',
//             `${API}/api/getcurrentyear`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/javascript',
//                     Accept: 'application/json'
//                 },
//                 params
//             }
//         );

//         console.log('🔵 api year response', response);

//         if (response) {
//             const yearData = response

//             // 3. Response ko cache me store karo
//             await AsyncStorage.setItem('current_year', JSON.stringify(yearData));

//             return yearData;
//         }

//         return null;
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('fetchYearData error', error);
//         }
//         return null;
//     }
// };

// // 

// // Add this utility function for batch processing
// // export const processInBatches = async (
// //     array: any[],
// //     batchSize: number,
// //     processBatch: (batch: any[]) => Promise<void>,
// //     onProgress?: (processed: number, total: number) => void
// // ) => {
// //     for (let i = 0; i < array.length; i += batchSize) {
// //         const batch = array.slice(i, i + batchSize);
// //         await processBatch(batch);

// //         if (onProgress) {
// //             onProgress(Math.min(i + batchSize, array.length), array.length);
// //         }

// //         // Yield to UI thread
// //         await new Promise(resolve => setTimeout(resolve, 0));
// //     }
// // };

// // Add this at the top of your Functions.ts
// const MAX_CHUNK_SIZE = 500; // Reduced from 1000 to be more conservative
// const FILE_NAME_LENGTH_LIMIT = 200; // Android file name length limit

// // Optimized saveLargeData with memory-safe chunking
// // Replace your existing saveLargeData with this:
// export { saveLargeData } from './DatabaseManager';

// // Define paths (no await here)
// // const PRPTYPE_FOLDER = `${RNFS.DocumentDirectoryPath}/prptypes/`;
// // const INDEX_FILE = `${PRPTYPE_FOLDER}index.json`;
// const PRPTYPE_FOLDER = `${FileSystem.documentDirectory}prptypes/`;
// const INDEX_FILE = `${PRPTYPE_FOLDER}index.json`;


// // Initialize directory (call this function early in your app)



// // Save data to file
// // export const saveToFile = async (prptype: string, data: CachedPrptype) => {
// //     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
// //     await RNFS.writeFile(filePath, JSON.stringify(data), 'utf8');
// //     await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
// //     console.log(`✅ Saved to file: ${filePath}`);
// // };
// export const saveToFile = async (prptype: string, data: CachedPrptype) => {
//     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
//     await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
//     console.log(`✅ Saved to file: ${filePath}`);
// };

// // Read data from file
// // export const readFromFile = async (prptype: string): Promise<CachedPrptype | null> => {
// //     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
// //     if (await RNFS.exists(filePath)) {
// //         const fileContent = await RNFS.readFile(filePath, 'utf8');
// //         return JSON.parse(fileContent) as CachedPrptype;
// //     }
// //     return null;
// // };
// export const readFromFile = async (prptype: string): Promise<CachedPrptype | null> => {
//     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;

//     const file = await FileSystem.getInfoAsync(filePath);
//     if (file.exists) {
//         const fileContent = await FileSystem.readAsStringAsync(filePath);
//         return JSON.parse(fileContent);
//     }

//     return null;
// };

// // Save index to file
// export const saveIndexToFile = async (prptypes: string[]) => {
//     // await RNFS.writeFile(INDEX_FILE, JSON.stringify(prptypes), 'utf8');
//     await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(prptypes));
// };

// // Read index from file
// // export const readIndexFromFile = async (): Promise<string[]> => {
// //     if (await RNFS.exists(INDEX_FILE)) {
// //         const fileContent = await RNFS.readFile(INDEX_FILE, 'utf8');
// //         return JSON.parse(fileContent) as string[];
// //     }
// //     return [];
// // };
// export const readIndexFromFile = async (): Promise<string[]> => {
//     const file = await FileSystem.getInfoAsync(INDEX_FILE);

//     if (file.exists) {
//         const fileContent = await FileSystem.readAsStringAsync(INDEX_FILE);
//         return JSON.parse(fileContent);
//     }

//     return [];
// };



// // export const fetchMasterSyncPartyDataPerPrptypeCache = async (
// //     token: string,
// //     getMasterSyncData: any[]
// // ) => {
// //     console.log("🔵 Mastersync getMasterSyncData", getMasterSyncData);

// //     if (cancelToken?.cancel)
// //         cancelToken.cancel("New master sync requested - cancelling previous");
// //     cancelToken = axios.CancelToken.source();

// //     const headers = {
// //         Authorization: `Bearer ${token}`,
// //         "Content-Type": "application/json",
// //         "X-Requested-With": "XMLHttpRequest",
// //         'x-platform': 'mob',
// //     };

// //     if (!Array.isArray(getMasterSyncData) || getMasterSyncData.length === 0) {
// //         console.log("⚪ No master sync items found.");
// //         return;
// //     }

// //     for (let i = 0; i < getMasterSyncData.length; i++) {
// //         const item = getMasterSyncData[i];
// //         // const prpcode = item?.prpcode ?? item?.PrpCode ?? "";
// //         // const yearno = item?.yearno ?? item?.YearNo ?? "";
// //         // const prptype = (item?.prptype ?? item?.PrpType ?? "").toString();
// //         // const apiBase = item?.api ?? "";



// //         // inside fetchMasterSyncPartyDataPerPrptypeCache, inside for loop (replace your current try/catch logs)
// //         const prptypeRaw = (item?.prptype ?? item?.PrpType ?? "").toString();
// //         const prptype = normalizePrptype(prptypeRaw);
// //         const prpcode = item?.prpcode ?? item?.PrpCode ?? "";
// //         const yearno = item?.yearno ?? item?.YearNo ?? "";
// //         const apiBase = item?.api ?? "";

// //         if (!prptype) {
// //             console.warn('🔶 Skipping invalid master-sync item (empty prptype):', item);
// //             continue;
// //         }

// //         const base = (apiBase || '').replace(/\/+$/, '');
// //         const accountUrl = `${base}/mobaccountbasic`;
// //         const bankUrl = `${base}/getmobbanklist`;
// //         const branchUrl = `${base}/getmobbranchlist`;

// //         const oldCache = (await readPrptypeCache(prptype)) ?? {
// //             prptype,
// //             prpcode,
// //             yearno,
// //             account: null,
// //             banks: null,
// //             branches: null,
// //             lastUpdated: null,
// //         };

// //         const accPayload = {
// //             prpcode,
// //             yearno,
// //             prptype,
// //             strcode: "0",
// //             txntype: "sales_order",
// //             partytype: "p",
// //             type: "s",
// //             page: 1,
// //             limit: 20,
// //             search: "",
// //             isceo: 0,
// //             partype: 0,
// //             grntype: "",
// //             fetch: "",
// //             acccode: "",
// //             billdate: "",
// //             strtype: "",
// //             isfaint: "",
// //             user_id: 1
// //         };
// //         const bankPayload = { prptype, prpcode, yearno, txntype: "receipt", user_id: 1 };
// //         let updated = false;

// //         console.log(`\n\n=== SYNC prptype="${prptype}" prpcode="${prpcode}" base="${base}" ===`);

// //         // defensive: record per-prptype result summary
// //         const perResult = { prptype, account: null as any, banks: null as any, branches: null as any, errors: [] as string[] };

// //         try {
// //             const res = await axios.get(accountUrl, { headers, params: accPayload, cancelToken: cancelToken.token });
// //             console.log(`→ accountbasic ${prptype} status=${res.status} success=${!!res.data?.success}`);
// //             console.log('  → accountbasic items:', Array.isArray(res.data?.response?.data) ? res.data.response.data.length : 'N/A');
// //             perResult.account = res.data?.response?.data ?? null;
// //             if (res.data?.success) {
// //                 oldCache.account = perResult.account;
// //                 updated = true;
// //             } else {
// //                 perResult.errors.push('accountbasic returned success=false');
// //             }
// //         } catch (err: any) {
// //             const m = err?.message || String(err);
// //             console.error(`→ accountbasic ERROR for ${prptype}:`, m);
// //             if (err.response) console.error('   response:', err.response.status, err.response.data);
// //             perResult.errors.push(`accountbasic error: ${m}`);
// //         }

// //         try {
// //             const resB = await axios.get(bankUrl, { headers, params: bankPayload, cancelToken: cancelToken.token });
// //             console.log(`→ getbanklist ${prptype} status=${resB.status} success=${!!resB.data?.success}`);
// //             console.log('  → banks:', Array.isArray(resB.data?.response?.data) ? resB.data.response.data.length : 'N/A');
// //             perResult.banks = resB.data?.response?.data ?? null;
// //             if (resB.data?.success) { oldCache.banks = perResult.banks; updated = true; } else { perResult.errors.push('getbanklist returned success=false'); }
// //         } catch (err: any) {
// //             const m = err?.message || String(err);
// //             console.error(`→ getbanklist ERROR for ${prptype}:`, m);
// //             if (err.response) console.error('   response:', err.response.status, err.response.data);
// //             perResult.errors.push(`getbanklist error: ${m}`);
// //         }

// //         try {
// //             const resBr = await axios.get(branchUrl, { headers, params: bankPayload, cancelToken: cancelToken.token });
// //             console.log(`→ getbranchlist ${prptype} status=${resBr.status} success=${!!resBr.data?.success}`);
// //             console.log('  → branches:', Array.isArray(resBr.data?.response?.data) ? resBr.data.response.data.length : 'N/A');
// //             perResult.branches = resBr.data?.response?.data ?? null;
// //             if (resBr.data?.success) { oldCache.branches = perResult.branches; updated = true; } else { perResult.errors.push('getbranchlist returned success=false'); }
// //         } catch (err: any) {
// //             const m = err?.message || String(err);
// //             console.error(`→ getbranchlist ERROR for ${prptype}:`, m);
// //             if (err.response) console.error('   response:', err.response.status, err.response.data);
// //             perResult.errors.push(`getbranchlist error: ${m}`);
// //         }

// //         // If nothing updated, optionally still write a "placeholder" so index includes this prptype
// //         // if (updated) {
// //         //     oldCache.lastUpdated = new Date().toISOString();
// //         //     await writePrptypeCache(prptype, oldCache);
// //         //     await addPrptypeToIndex(prptype);
// //         //     console.log(`✅ Saved cache for ${prptype} (account=${Array.isArray(oldCache.account) ? oldCache.account.length : 0}, banks=${Array.isArray(oldCache.banks) ? oldCache.banks.length : 0}, branches=${Array.isArray(oldCache.branches) ? oldCache.branches.length : 0})`);
// //         // } 
// //         if (updated) {
// //             oldCache.lastUpdated = new Date().toISOString();
// //             await saveLargeData(prptype, oldCache);  // Use saveLargeData instead of writePrptypeCache
// //             await addPrptypeToIndex(prptype);
// //             console.log(`✅ Saved chunked data for ${prptype}`);
// //         }
// //         else {
// //             console.warn(`⚠️ No data saved for ${prptype}. errors:`, perResult.errors);
// //             // optionally write an empty placeholder so prptype is present in index:
// //             const placeholder = { prptype, prpcode, yearno, account: Array.isArray(perResult.account) ? perResult.account : null, banks: Array.isArray(perResult.banks) ? perResult.banks : null, branches: Array.isArray(perResult.branches) ? perResult.branches : null, lastUpdated: null };
// //             // await writePrptypeCache(prptype, placeholder); // <-- uncomment if you want to create placeholder entries even for empty results
// //             // await addPrptypeToIndex(prptype);
// //         }
// //         // Load existing storage


// //         // --------------------------------------------
// //         // 1) ACCOUNT BASIC
// //         // --------------------------------------------


// //         console.log(
// //             `\n===== [1] ACCOUNTBASIC CALL — prptype: ${prptype} =====`
// //         );
// //         console.log("🌐 URL:", accountUrl);
// //         console.log("📤 Payload:", accPayload);
// //         console.log("⏳ Waiting for response...");

// //         try {
// //             const res = await axios.get(accountUrl, {
// //                 headers,
// //                 params: accPayload,
// //                 cancelToken: cancelToken.token,
// //             });

// //             console.log(`\n✅ RESPONSE (status: ${res.status})`);

// //             console.log("📥 success:", res.data?.success);
// //             console.log(
// //                 "📦 items:",
// //                 res.data?.response?.data?.length ?? "N/A"
// //             );
// //             console.log("🧾 Raw Response:", JSON.stringify(res.data, null, 2));

// //             if (res.data?.success) {
// //                 oldCache.account = res.data.response.data;
// //                 updated = true;
// //             }
// //         } catch (err: any) {
// //             console.log("❌ ACCOUNTBASIC ERROR:", err.message);
// //             if (err.response) console.log("🔻 Error Response:", err.response.data);
// //         }

// //         // --------------------------------------------
// //         // 2) BANK LIST
// //         // --------------------------------------------


// //         console.log(`\n===== [2] BANK LIST CALL — prptype: ${prptype} =====`);
// //         console.log("🌐 URL:", bankUrl);
// //         console.log("📤 Payload:", bankPayload);
// //         console.log("⏳ Waiting for response...");

// //         try {
// //             const resBank = await axios.get(bankUrl, {
// //                 headers,
// //                 params: bankPayload,
// //                 cancelToken: cancelToken.token,
// //             });

// //             console.log(`\n✅ RESPONSE (status: ${resBank.status})`);

// //             console.log("📥 success:", resBank.data?.success);
// //             console.log(
// //                 "🏦 bank items:",
// //                 resBank.data?.response?.data?.length ?? "N/A"
// //             );
// //             console.log("🧾 Raw Response:", JSON.stringify(resBank.data, null, 2));

// //             if (resBank.data?.success) {
// //                 oldCache.banks = resBank.data.response.data;
// //                 updated = true;
// //             }
// //         } catch (err: any) {
// //             console.log("❌ BANK LIST ERROR:", err.message);
// //             if (err.response) console.log("🔻 Error Response:", err.response.data);
// //         }

// //         // --------------------------------------------
// //         // 3) BRANCH LIST
// //         // --------------------------------------------
// //         console.log(`\n===== [3] BRANCH LIST CALL — prptype: ${prptype} =====`);
// //         console.log("🌐 URL:", branchUrl);
// //         console.log("📤 Payload:", bankPayload);
// //         console.log("⏳ Waiting for response...");

// //         try {
// //             const resBranch = await axios.get(branchUrl, {
// //                 headers,
// //                 params: bankPayload,
// //                 cancelToken: cancelToken.token,
// //             });

// //             console.log(`\n✅ RESPONSE (status: ${resBranch.status})`);

// //             console.log("📥 success:", resBranch.data?.success);
// //             console.log(
// //                 "🏬 branch items:",
// //                 resBranch.data?.response?.data?.length ?? "N/A"
// //             );
// //             console.log(
// //                 "🧾 Raw Response:",
// //                 JSON.stringify(resBranch.data, null, 2)
// //             );

// //             if (resBranch.data?.success) {
// //                 oldCache.branches = resBranch.data.response.data;
// //                 updated = true;
// //             }
// //         } catch (err: any) {
// //             console.log("❌ BRANCH LIST ERROR:", err.message);
// //             if (err.response) console.log("🔻 Error:", err.response.data);
// //         }

// //         // Save only if any updated
// //         // if (updated) {
// //         //     oldCache.lastUpdated = new Date().toISOString();
// //         //     await writePrptypeCache(prptype, oldCache);
// //         //     await addPrptypeToIndex(prptype);
// //         // }
// //         if (updated) {
// //             oldCache.lastUpdated = new Date().toISOString();
// //             await saveLargeData(prptype, oldCache);  // Use saveLargeData instead of writePrptypeCache
// //             await addPrptypeToIndex(prptype);
// //             console.log(`✅ Saved chunked data for ${prptype}`);
// //         }



// //         console.log(
// //             `\n✅ Completed prptype ${prptype}\n---------------------------------------`
// //         );
// //     }

// //     console.log("\n\n🎉 FULL MASTER SYNC FINISHED");
// // };

// // Updated fetchMasterSyncPartyDataPerPrptypeCache in Functions.ts
// export const fetchMasterSyncPartyDataPerPrptypeCache = async (
//     token: string,
//     getMasterSyncData: any[]
// ) => {
//     console.log("🔵 Starting master sync for", getMasterSyncData.length, "items");
//     if (cancelToken?.cancel) {
//         cancelToken.cancel("New master sync requested - cancelling previous");
//     }
//     cancelToken = axios.CancelToken.source();

//     const headers = {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//         "X-Requested-With": "XMLHttpRequest",
//         'x-platform': 'mob',
//     };

//     if (!Array.isArray(getMasterSyncData) || getMasterSyncData.length === 0) {
//         console.log("⚪ No master sync items found.");
//         return;
//     }

//     // Process each prptype with optimized batching
//     for (let i = 0; i < getMasterSyncData.length; i++) {
//         const item = getMasterSyncData[i];
//         const prptypeRaw = (item?.prptype ?? item?.PrpType ?? "").toString();
//         const prptype = normalizePrptype(prptypeRaw);
//         const prpcode = item?.prpcode ?? item?.PrpCode ?? "";
//         const yearno = item?.yearno ?? item?.YearNo ?? "";
//         const apiBase = item?.api ?? "";

//         if (!prptype) {
//             console.warn('🔶 Skipping invalid item (empty prptype):', item);
//             continue;
//         }

//         const base = (apiBase || '').replace(/\/+$/, '');
//         const accountUrl = `${base}/mobaccountbasic`;
//         const bankUrl = `${base}/getmobbanklist`;
//         const branchUrl = `${base}/getmobbranchlist`;

//         console.log(`\n=== SYNC prptype="${prptype}" (${i + 1}/${getMasterSyncData.length}) ===`);

//         try {
//             // Clear old data first
//             await clearOldChunks(prptype);

//             // Prepare payloads
//             const accPayload = {
//                 prpcode,
//                 yearno,
//                 prptype,
//                 strcode: "0",
//                 txntype: "sales_order",
//                 partytype: "p",
//                 type: "s",
//                 page: 1,
//                 limit: 20,
//                 search: "",
//                 isceo: 0,
//                 partype: 0,
//                 grntype: "",
//                 fetch: "",
//                 acccode: "",
//                 billdate: "",
//                 strtype: "",
//                 isfaint: "",
//                 user_id: 1
//             };

//             const bankPayload = { prptype, prpcode, yearno, txntype: "receipt", user_id: 1 };

//             // Fetch data with parallel requests
//             const [accountRes, bankRes, branchRes] = await Promise.all([
//                 axios.get(accountUrl, {
//                     headers,
//                     params: accPayload,
//                     cancelToken: cancelToken.token
//                 }),
//                 axios.get(bankUrl, {
//                     headers,
//                     params: bankPayload,
//                     cancelToken: cancelToken.token
//                 }),
//                 axios.get(branchUrl, {
//                     headers,
//                     params: bankPayload,
//                     cancelToken: cancelToken.token
//                 })
//             ]);

//             // Process results
//             const results: CachedPrptype = {
//                 prptype,
//                 prpcode,
//                 yearno,
//                 account: accountRes.data?.success ? accountRes.data.response?.data : [],
//                 banks: bankRes.data?.success ? bankRes.data.response?.data : [],
//                 branches: branchRes.data?.success ? branchRes.data.response?.data : [],
//                 lastUpdated: new Date().toISOString()
//             };

//             console.log(`→ Accounts: ${results.account?.length || 0}`);
//             console.log(`→ Banks: ${results.banks?.length || 0}`);
//             console.log(`→ Branches: ${results.branches?.length || 0}`);

//             // Save to database
//             if (results.account || results.banks || results.branches) {
//                 await saveLargeData(prptype, results);
//                 console.log(`✅ Completed sync for ${prptype}`);
//             } else {
//                 console.warn(`⚠️ No data saved for ${prptype}`);
//             }
//         } catch (err) {
//             console.error(`❌ Failed to process ${prptype}:`, err);
//         } finally {
//             // Yield to event loop between items
//             await new Promise(resolve => setTimeout(resolve, 100));
//         }
//     }

//     console.log("\n🎉 FULL MASTER SYNC COMPLETED");
// };



// /* ---------- config ---------- */
// const ALL_PRPTYPES_KEY = 'master_sync_all_prptypes';
// const PRPTYPE_KEY_PREFIX = 'master_sync_';
// const PRPTYPE_PART_SUFFIX = ':part:'; // final keys: `${PRPTYPE_KEY_PREFIX}${key}${PRPTYPE_PART_SUFFIX}${i}`

// /**
//  * CHUNK SIZE: size of each part in characters (approx bytes).
//  * CursorWindow issues kick in when a single value becomes very large (>~2MB).
//  * We'll use 500k char chunks which is safe on most devices.
//  */
// const CHUNK_SIZE = 500_000;

// export type CachedPrptype = {
//     prptype: string;
//     prpcode?: string;
//     yearno?: string;
//     account?: any | null;
//     banks?: any[] | null;
//     branches?: any[] | null;
//     lastUpdated?: string | null;
//     accountChunks?: number;  // Number of account chunks
//     banksChunks?: number;    // Number of bank chunks
//     branchesChunks?: number; // Number of branch chunks
// };

// /* normalize key */
// export const normalizePrptype = (val?: any) => {
//     if (val === undefined || val === null) return '';
//     return String(val).trim();
// };

// /* helper: build base key */
// // const baseKeyFor = (prptype: string) => `${PRPTYPE_KEY_PREFIX}${normalizePrptype(prptype)}`;

// /* ---------- write (with chunking) ---------- */
// // export const writePrptypeCache = async (prptype: string, value: CachedPrptype) => {
// //     const keyBase = baseKeyFor(prptype);
// //     if (!keyBase) return;
// //     try {
// //         const json = JSON.stringify(value);

// //         // if small enough, write single key and remove any leftover parts
// //         if (json.length <= CHUNK_SIZE) {
// //             await AsyncStorage.setItem(keyBase, json);
// //             // remove any leftover part keys (cleanup)
// //             let i = 0;
// //             while (true) {
// //                 const partKey = `${keyBase}${PRPTYPE_PART_SUFFIX}${i}`;
// //                 // stop when missing
// //                 const exists = await AsyncStorage.getItem(partKey);
// //                 if (!exists) break;
// //                 await AsyncStorage.removeItem(partKey);
// //                 i++;
// //             }
// //             console.log(`✅ Saved cache for "${normalizePrptype(prptype)}" (single key, size=${json.length})`);
// //             return;
// //         }

// //         // chunk into parts
// //         const parts: string[] = [];
// //         for (let pos = 0; pos < json.length; pos += CHUNK_SIZE) {
// //             parts.push(json.slice(pos, pos + CHUNK_SIZE));
// //         }

// //         // Write parts
// //         const operations: Array<[string, string]> = [];
// //         for (let i = 0; i < parts.length; i++) {
// //             operations.push([`${keyBase}${PRPTYPE_PART_SUFFIX}${i}`, parts[i]]);
// //         }

// //         // Save part count (meta) at base key (so read knows it'll be chunked)
// //         const meta = JSON.stringify({ __chunked: true, parts: parts.length, savedAt: new Date().toISOString() });
// //         // Use multiSet to batch
// //         const toMulti = [[keyBase, meta], ...operations];
// //         await AsyncStorage.multiSet(toMulti);
// //         console.log(`✅ Saved chunked cache for "${normalizePrptype(prptype)}" (parts=${parts.length}, totalSize=${json.length})`);
// //     } catch (err) {
// //         console.warn(`Failed to save cache for ${prptype}:`, err);
// //     }
// // };

// export const writePrptypeCache = async (prptype: string, value: CachedPrptype) => {
//     try {
//         await saveToFile(prptype, value);
//         console.log(`✅ Saved cache for "${prptype}" to file system`);
//     } catch (err) {
//         console.warn(`❌ Failed to save cache for ${prptype}:`, err);
//     }
// };



// /* ---------- read (with reassembly) ---------- */
// // export const readPrptypeCache = async (prptype: string): Promise<CachedPrptype | null> => {
// //     const keyBase = baseKeyFor(prptype);
// //     if (!keyBase) return null;
// //     try {
// //         const raw = await AsyncStorage.getItem(keyBase);
// //         if (!raw) return null;

// //         // quick attempt: maybe it's the actual JSON (not chunk meta)
// //         try {
// //             const parsed = JSON.parse(raw);
// //             // If parsed is an object and it has prptype etc, treat it as the cache
// //             if (parsed && typeof parsed === 'object' && ('prptype' in parsed || 'account' in parsed || 'banks' in parsed || 'branches' in parsed)) {
// //                 return parsed as CachedPrptype;
// //             }
// //         } catch {
// //             // not raw JSON for cache: could be meta or chunk metadata - fallthrough
// //         }

// //         // detect chunk meta: we expect { __chunked: true, parts: N }
// //         let meta;
// //         try { meta = JSON.parse(raw); } catch { meta = null; }

// //         if (meta && meta.__chunked === true && typeof meta.parts === 'number') {
// //             const partKeys = [];
// //             for (let i = 0; i < meta.parts; i++) partKeys.push(`${keyBase}${PRPTYPE_PART_SUFFIX}${i}`);
// //             const values = await AsyncStorage.multiGet(partKeys);
// //             // values is [ [key, val], ... ]
// //             const chunks: string[] = [];
// //             for (const [, v] of values) {
// //                 if (!v) {
// //                     // missing part -> abort
// //                     console.warn(`readPrptypeCache: missing part for ${prptype}`);
// //                     return null;
// //                 }
// //                 chunks.push(v);
// //             }
// //             const assembled = chunks.join('');
// //             const parsed = JSON.parse(assembled);
// //             return parsed as CachedPrptype;
// //         }

// //         // If we reach here, raw exists but didn't parse as expected
// //         // Try parse raw directly as fallback
// //         try {
// //             return JSON.parse(raw) as CachedPrptype;
// //         } catch (err) {
// //             console.warn(`Failed to parse prptype cache ${keyBase}:`, err);
// //             return null;
// //         }
// //     } catch (err) {
// //         console.warn(`Failed to read cache for ${keyBase}:`, err);
// //         return null;
// //     }
// // };

// // Reassemble chunked data when reading
// // Optimized read with progress tracking
// // Memory-safe read function
// // Replace your existing readPrptypeCache with this:
// export { readPrptypeCache } from '@/common/API/DatabaseManager';


// // Add these new functions:
// export { getAccountByCode, getBankByName, getPrptypeIndex, clearOldChunks };

// // Update your initFileSystem to also initialize the database:
// // export const initFileSystem = async () => {
// //     try {
// //         const fsInit = await RNFS.exists(PRPTYPE_FOLDER);
// //         if (!fsInit) {
// //             await RNFS.mkdir(PRPTYPE_FOLDER);
// //             console.log(`✅ Created directory: ${PRPTYPE_FOLDER}`);
// //         }

// //         const dbInit = await initDatabase();
// //         if (!dbInit) {
// //             console.warn('⚠️ Database initialization failed');
// //             return false;
// //         }

// //         return true;
// //     } catch (err) {
// //         console.warn(`❌ Failed to initialize file system and database:`, err);
// //         return false;
// //     }
// // };
// export const initFileSystem = async () => {
//     try {
//         const dir = await FileSystem.getInfoAsync(PRPTYPE_FOLDER);

//         if (!dir.exists) {
//             await FileSystem.makeDirectoryAsync(PRPTYPE_FOLDER, { intermediates: true });
//             console.log(`✅ Created directory: ${PRPTYPE_FOLDER}`);
//         }

//         const dbInit = await initDatabase();
//         if (!dbInit) {
//             console.warn('⚠️ Database initialization failed');
//             return false;
//         }

//         return true;
//     } catch (err) {
//         console.warn(`❌ Failed to initialize file system:`, err);
//         return false;
//     }
// };

// /* ---------- index add/get (keep normalized) ---------- */
// // export const addPrptypeToIndex = async (prptype: string) => {
// //     const key = normalizePrptype(prptype);
// //     if (!key) return;
// //     try {
// //         const raw = await AsyncStorage.getItem(ALL_PRPTYPES_KEY);
// //         const arr: string[] = raw ? JSON.parse(raw) : [];
// //         const normalized = arr.map(normalizePrptype).filter(k => k !== '');
// //         if (!normalized.includes(key)) {
// //             normalized.push(key);
// //             await AsyncStorage.setItem(ALL_PRPTYPES_KEY, JSON.stringify(normalized));
// //             console.log(`📥 Added prptype "${key}" to index (index count=${normalized.length})`);
// //         } else {
// //             // quiet
// //         }
// //     } catch (err) {
// //         console.warn('Failed to update prptype index:', err);
// //     }
// // };

// // Clear old chunks when data is updated
// // Clear old chunks safely
// // export const clearOldChunks = async (prptype: string) => {
// //     try {
// //         const files = await RNFS.readDir(PRPTYPE_FOLDER);
// //         const prptypeFiles = files.filter(f =>
// //             f.name.startsWith(prptype) &&
// //             (f.name.includes('_acc_') ||
// //                 f.name.includes('_bank_') ||
// //                 f.name.includes('_br_'))
// //         );

// //         // Clear in batches to avoid blocking
// //         for (let i = 0; i < prptypeFiles.length; i += 5) {
// //             const batch = prptypeFiles.slice(i, i + 5);
// //             await Promise.all(batch.map(f => RNFS.unlink(f.path)));
// //             await new Promise(resolve => setTimeout(resolve, 0));
// //         }
// //     } catch (err) {
// //         console.warn(`Failed to clear old chunks for ${prptype}:`, err);
// //     }
// // };

// // Process data in memory-safe batches
// export const processInBatches = async<T>(
//     array: T[],
//     batchSize: number,
//     processBatch: (batch: T[]) => Promise<void>,
//     options: {
//         onProgress?: (processed: number, total: number) => void;
//         delayMs?: number;
//     } = {}
// ) => {
//     const { onProgress, delayMs = 0 } = options;

//     for (let i = 0; i < array.length; i += batchSize) {
//         const batch = array.slice(i, i + batchSize);
//         await processBatch(batch);

//         if (onProgress) {
//             onProgress(Math.min(i + batchSize, array.length), array.length);
//         }

//         // Yield to event loop
//         if (delayMs > 0) {
//             await new Promise(resolve => setTimeout(resolve, delayMs));
//         } else {
//             await new Promise(resolve => setTimeout(resolve, 0));
//         }
//     }
// };



// export const addPrptypeToIndex = async (prptype: string) => {
//     const key = normalizePrptype(prptype);
//     if (!key) return;

//     try {
//         const index = await readIndexFromFile();
//         if (!index.includes(key)) {
//             index.push(key);
//             await saveIndexToFile(index);
//         }
//         console.log(`📥 Added "${key}" to index (count: ${index.length})`);
//     } catch (err) {
//         console.warn('❌ Failed to update index:', err);
//     }
// };



// // export const getPrptypeIndex = async (): Promise<{ prptypes: string[]; count: number }> => {
// //     try {
// //         const raw = await AsyncStorage.getItem(ALL_PRPTYPES_KEY);
// //         const arr: string[] = raw ? JSON.parse(raw) : [];
// //         const normalized = arr.map(normalizePrptype).filter(k => k !== '');
// //         if (JSON.stringify(normalized) !== JSON.stringify(arr)) {
// //             await AsyncStorage.setItem(ALL_PRPTYPES_KEY, JSON.stringify(normalized));
// //             console.log('🔧 Cleaned prptype index saved');
// //         }
// //         return { prptypes: normalized, count: normalized.length };
// //     } catch (err) {
// //         console.warn('getPrptypeIndex failed:', err);
// //         return { prptypes: [], count: 0 };
// //     }
// // };

// // export const getPrptypeIndex = async (): Promise<{ prptypes: string[]; count: number }> => {
// //     try {
// //         const prptypes = await readIndexFromFile();
// //         return { prptypes, count: prptypes.length };
// //     } catch (err) {
// //         console.warn('❌ getPrptypeIndex failed:', err);
// //         return { prptypes: [], count: 0 };
// //     }
// // };



// /* ---------- load all caches (uses the read that supports chunking) ---------- */
// // export const loadAllPrptypeCaches = async (): Promise<Record<string, CachedPrptype | null>> => {
// //     try {
// //         const raw = await AsyncStorage.getItem(ALL_PRPTYPES_KEY);
// //         const prptypes: string[] = raw ? JSON.parse(raw) : [];
// //         const out: Record<string, CachedPrptype | null> = {};
// //         for (const p of prptypes) {
// //             const key = normalizePrptype(p);
// //             out[key] = await readPrptypeCache(key);
// //         }
// //         return out;
// //     } catch (err) {
// //         console.warn('Failed to load all prptype caches:', err);
// //         return {};
// //     }
// // };
// export const loadAllPrptypeCaches = async (): Promise<Record<string, CachedPrptype | null>> => {
//     try {
//         const { prptypes } = await getPrptypeIndex();
//         const out: Record<string, CachedPrptype | null> = {};

//         for (const p of prptypes) {
//             const key = normalizePrptype(p);
//             out[key] = await readPrptypeCache(key);
//         }

//         return out;
//     } catch (err) {
//         console.warn('❌ Failed to load all caches:', err);
//         return {};
//     }
// };


// /* ---------- summary + debug helpers ---------- */
// export const getPrptypeSummary = async (prptype: string): Promise<{
//     prptype: string;
//     accountCount: number | null;
//     banksCount: number | null;
//     branchesCount: number | null;
//     lastUpdated: string | null;
// }> => {
//     try {
//         const cache = await readPrptypeCache(prptype);
//         if (!cache) {
//             return { prptype, accountCount: null, banksCount: null, branchesCount: null, lastUpdated: null };
//         }
//         const accountCount = Array.isArray(cache.account) ? cache.account.length : cache.account ? null : 0;
//         const banksCount = Array.isArray(cache.banks) ? cache.banks.length : cache.banks ? null : 0;
//         const branchesCount = Array.isArray(cache.branches) ? cache.branches.length : cache.branches ? null : 0;
//         return { prptype, accountCount, banksCount, branchesCount, lastUpdated: cache.lastUpdated ?? null };
//     } catch (err) {
//         console.warn('getPrptypeSummary failed for', prptype, err);
//         return { prptype, accountCount: null, banksCount: null, branchesCount: null, lastUpdated: null };
//     }
// };

// export const debugRawAsyncStorage = async () => {
//     try {
//         const keys = await AsyncStorage.getAllKeys();
//         console.log('📦 AsyncStorage total keys:', keys.length);
//         const masterKeys = keys.filter(k => k && (k === ALL_PRPTYPES_KEY || k.startsWith(PRPTYPE_KEY_PREFIX)));
//         console.log('🔑 Candidate master/prptype keys:', masterKeys);
//         for (const k of masterKeys) {
//             const v = await AsyncStorage.getItem(k);
//             console.log(`🗂 key=${k} valuePreview=${v ? v.slice(0, 250) : 'null'} (len=${v?.length ?? 0})`);
//         }
//     } catch (err) {
//         console.warn('debugRawAsyncStorage failed', err);
//     }
// };

// /* convenience: print cached prptypes with data (uses chunk-aware read) */
// // export const printCachedPrptypesWithData = async () => {
// //     try {
// //         const raw = await AsyncStorage.getItem(ALL_PRPTYPES_KEY);
// //         const prptypes: string[] = raw ? JSON.parse(raw) : [];
// //         console.log('🔎 index length:', prptypes.length, 'prptypes:', prptypes);
// //         const present: string[] = [];
// //         for (const p of prptypes) {
// //             const key = normalizePrptype(p);
// //             const cache = await readPrptypeCache(key);
// //             if (!cache) {
// //                 console.log(`⚪ ${key} -> null cache`);
// //                 continue;
// //             }
// //             const a = Array.isArray(cache.account) ? cache.account.length : 0;
// //             const b = Array.isArray(cache.banks) ? cache.banks.length : 0;
// //             const c = Array.isArray(cache.branches) ? cache.branches.length : 0;
// //             if (a > 0 || b > 0 || c > 0) {
// //                 present.push(key);
// //                 console.log(`🔎 cache [${key}] — account:${a}, banks:${b}, branches:${c}, lastUpdated:${cache.lastUpdated}`);
// //             } else {
// //                 console.log(`⚪ cache [${key}] empty — account:${a}, banks:${b}, branches:${c}`);
// //             }
// //         }
// //         console.log('✅ prptypes with data:', present);
// //         return { index: prptypes, present };
// //     } catch (err) {
// //         console.warn('printCachedPrptypesWithData failed:', err);
// //         return { index: [], present: [] };
// //     }
// // };

// export const printCachedPrptypesWithData = async () => {
//     try {
//         const { prptypes } = await getPrptypeIndex();
//         console.log('🔎 Total prptypes in index:', prptypes.length);

//         const present: string[] = [];
//         for (const p of prptypes) {
//             const key = normalizePrptype(p);
//             const cache = await readPrptypeCache(key);
//             if (!cache) {
//                 console.log(`⚪ ${key} -> null cache`);
//                 continue;
//             }

//             const a = Array.isArray(cache.account) ? cache.account.length : 0;
//             const b = Array.isArray(cache.banks) ? cache.banks.length : 0;
//             const c = Array.isArray(cache.branches) ? cache.branches.length : 0;

//             if (a > 0 || b > 0 || c > 0) {
//                 present.push(key);
//                 console.log(`🔥 ${key} — account:${a}, banks:${b}, branches:${c}`);
//             }
//         }

//         console.log('✅ Prptypes with data:', present);
//         return { index: prptypes, present };
//     } catch (err) {
//         console.warn('❌ printCachedPrptypesWithData failed:', err);
//         return { index: [], present: [] };
//     }
// };


// // export const debugFileSystem = async () => {
// //     try {
// //         const files = await RNFS.readDir(PRPTYPE_FOLDER);
// //         console.log('📁 Files in prptypes folder:');
// //         for (const file of files) {
// //             const stats = await RNFS.stat(file.path);
// //             console.log(`- ${file.name} (${Math.round(stats.size / 1024)} KB)`);
// //         }
// //     } catch (err) {
// //         console.warn('❌ debugFileSystem failed:', err);
// //     }
// // };


// // export const debugChunkedFiles = async (prptype: string) => {
// //     try {
// //         const files = await RNFS.readDir(PRPTYPE_FOLDER);
// //         const prptypeFiles = files.filter(f => f.name.startsWith(prptype));

// //         console.log(`📁 Files for ${prptype}:`);
// //         for (const file of prptypeFiles) {
// //             const stats = await RNFS.stat(file.path);
// //             console.log(`- ${file.name} (${Math.round(stats.size / 1024)} KB)`);
// //         }
// //     } catch (err) {
// //         console.warn(`❌ Failed to debug files for ${prptype}:`, err);
// //     }
// // };


// // export const fetchAllPropertyData = async (token: string) => {
// //     try {
// //         const userPtype = await AsyncStorage.getItem('user_prptype');

// //         // if (cancelToken?.cancel) cancelToken.cancel();
// //         // cancelToken = axios.CancelToken.source();

// //         let params = null;
// //         const response = await axios.get(
// //             `${API}/api/get_criterion?prptype=${'S'}&txntype=''&fetch=prp`,
// //             {
// //                 headers: {
// //                     Authorization: `Bearer ${token}`,
// //                     'Content-Type': 'application/javascript',
// //                     Accept: 'application/json'
// //                 },
// //                 params
// //             }
// //         );
// //         console.log("Api response", response)

// //         if (response.data.success && response.data.response.data.length > 0) {
// //             const propertyGroupData = response.data.response.data;
// //             return response.data.response.data;
// //         } else {
// //             return [];
// //         }
// //     } catch (error) {
// //         if (!axios.isCancel(error)) {
// //             console.log('fetchpropertyGroupData error', error);
// //         }
// //         return [];
// //     }
// // };
// export const fetchAllPropertyData = async (token: string) => {
//     try {
//         const userPtype = await AsyncStorage.getItem('user_prptype');

//         let params = null;
//         const response = await axios.get(
//             // ✅ FIX: Empty txntype ke saath (no quotes!)
//             `${API}/api/get_criterion?prptype=S&txntype=&fetch=prp`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                     Accept: 'application/json'
//                 },
//                 params
//             }
//         );

//         // 🔍 Debug: pura response dekho
//         console.log("🔍 Full Property API Response:", JSON.stringify(response.data, null, 2));

//         // ✅ Safe data extraction (multiple fallbacks)
//         let propertyData = [];

//         if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
//             propertyData = response.data.response.data;
//         } else if (response.data?.data && Array.isArray(response.data.data)) {
//             propertyData = response.data.data;
//         } else if (Array.isArray(response.data)) {
//             propertyData = response.data;
//         }

//         console.log(`✅ Property items found: ${propertyData.length}`);
//         if (propertyData.length > 0) {
//             console.log("✅ First property item:", JSON.stringify(propertyData[0]));
//         }

//         return propertyData;
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('❌ fetchAllPropertyData error:', error?.message);
//         }
//         return [];
//     }
// };


// // export const fetchAllYeardata = async (token: string, prpcd = '') => {
// //     try {
// //         // if (cancelToken?.cancel) cancelToken.cancel();
// //         // cancelToken = axios.CancelToken.source();

// //         let params = { prpcode: prpcd };
// //         console.log("`${API}/api/getyear` :", `${API}/api/getyear`);
// //         const response = await axios.get(
// //             `${API}/api/getyear`,
// //             {
// //                 headers: {
// //                     Authorization: `Bearer ${token}`,
// //                     'Content-Type': 'application/javascript',
// //                     Accept: 'application/json'
// //                 },
// //                 params
// //             }
// //         );
// //         console.log("response :", response);

// //         if (response.data.response.data && response.data.response.data.length > 0) {
// //             const appYdata = response.data.response.data;
// //             return response.data.response.data;;
// //         } else {
// //             return [];
// //         }
// //     } catch (error) {
// //         if (!axios.isCancel(error)) {
// //             console.log('fetchAllYeardata error', error);
// //         }
// //         return [];
// //     }
// // }
// export const fetchAllYeardata = async (token: string, prpcd = '') => {
//     try {
//         const response = await axios.get(`${API}/api/getyear`, {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//                 Accept: 'application/json'
//             },
//             params: { prpcode: prpcd }
//         });

//         console.log("🔍 Full Year API Response:", JSON.stringify(response.data, null, 2));

//         // ✅ Safe data extraction
//         let yearData = [];
//         if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
//             yearData = response.data.response.data;
//         } else if (response.data?.data && Array.isArray(response.data.data)) {
//             yearData = response.data.data;
//         } else if (Array.isArray(response.data)) {
//             yearData = response.data;
//         }

//         console.log(`✅ Year items found: ${yearData.length}`);
//         return yearData;
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('❌ fetchAllYeardata error:', error?.message);
//         }
//         return [];
//     }
// };


// // export const fetchAllStoredata = async (token: string, prp = '', yrno = '', txn = '') => {
// //     const userPtype = await AsyncStorage.getItem('user_prptype');
// //     const platform = txn !== '' ? 'mob' : '';
// //     try {
// //         // if (cancelToken?.cancel) cancelToken.cancel();
// //         // cancelToken = axios.CancelToken.source();

// //         let params = {
// //             prpcode: prp, yearno: yrno, txntype: txn,
// //             prptype: userPtype
// //             // prptype: 'R'
// //         };
// //         const response = await axios.get(
// //             `${API}/api/getstore`,
// //             {
// //                 headers: {
// //                     Authorization: `Bearer ${token}`,
// //                     'Content-Type': 'application/javascript',
// //                     Accept: 'application/json',
// //                     'x-platform': 'mob'
// //                     //...(platform && { 'x-platform': platform }),
// //                 },
// //                 params
// //             }
// //         );
// //         if (response.data.response.data && response.data.response.data.length > 0) {
// //             const appStoredata = response.data.response.data;
// //             return response.data.response.data;;
// //         } else {
// //             return [];
// //         }
// //     } catch (error) {
// //         if (!axios.isCancel(error)) {
// //             console.log('fetchAllStoredata error', error);
// //         }
// //         return [];
// //     }
// // }
// export const fetchAllStoredata = async (token: string, prp = '', yrno = '', txn = '') => {
//     try {
//         const userPtype = await AsyncStorage.getItem('user_prptype');

//         const response = await axios.get(`${API}/api/getstore`, {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//                 Accept: 'application/json',
//                 'x-platform': 'mob'
//             },
//             params: {
//                 prpcode: prp,
//                 yearno: yrno,
//                 txntype: txn,
//                 prptype: userPtype || 'S'
//             }
//         });

//         console.log("🔍 Full Store API Response:", JSON.stringify(response.data, null, 2));

//         // ✅ Safe data extraction
//         let storeData = [];
//         if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
//             storeData = response.data.response.data;
//         } else if (response.data?.data && Array.isArray(response.data.data)) {
//             storeData = response.data.data;
//         } else if (Array.isArray(response.data)) {
//             storeData = response.data;
//         }

//         console.log(`✅ Store items found: ${storeData.length}`);
//         return storeData;
//     } catch (error) {
//         if (!axios.isCancel(error)) {
//             console.log('❌ fetchAllStoredata error:', error?.message);
//         }
//         return [];
//     }
// };


// export const getCurrentFinancialYearMain = () => {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

//     // Financial year starts in April
//     const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
//     const financialYearEnd = financialYearStart + 1;

//     return `${financialYearStart}-${financialYearEnd}`;
// };

// // Fot future year
// // const generateFinancialYearOptions = (currentYear: number, range: number = 4) => {
// //     const years = [];
// //     const currentFinancialYearStart = currentYear - (new Date().getMonth() + 1 >= 4 ? 0 : 1);

// //     for (let i = -range; i <= range; i++) {
// //         const startYear = currentFinancialYearStart + i;
// //         const endYear = startYear + 1;
// //         years.push(`${startYear}-${endYear}`);
// //     }

// //     return years;
// // };

// // without Not future
// export const generateFinancialYearOptions = (currentYear: number, range: number = 4) => {
//     const years = [];
//     const currentDate = new Date();
//     const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
//     const currentFinancialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;

//     // Generate the last 'range' financial years including the current financial year
//     for (let i = 0; i <= range; i++) {
//         const startYear = currentFinancialYearStart - i;
//         const endYear = startYear + 1;
//         years.push(`${startYear}-${endYear}`);
//     }

//     return years;
// };

// common/API/Functions.ts

import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
// import RNFS from 'react-native-fs';
// import * as FileSystem from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';  // ✅ RNFS ki jagah
import {
    initDatabase,
    saveLargeData,
    readPrptypeCache,
    getAccountByCode,
    getBankByName,
    getPrptypeIndex,
    clearOldChunks,
} from './DatabaseManager';
import { API } from './dynamicAPI';

let cancelToken: any;

export const fetchPropertyGroupDataDCR = async (token: string) => {
    try {
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = null;
        const response = await axios.get(
            `${API}/api/get_criterion?fetch=prptype&txntype=mob_daily_collection_report`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/javascript',
                    Accept: 'application/json',
                },
                params,
            },
        );


        if (response.data.success && response.data.response.data.length > 0) {
            const propertyGroupData = response.data.response.data;

            // 3. Response ko cache me store karo

            return propertyGroupData;
        }

        return [];
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchpropertyGroupData error', error);
        }
        return [];
    }
};
export const fetchPropertyDataDCR = async (token: string, prptype: string) => {
    try {
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = null;
        const response = await axios.get(
            `${API}/api/get_criterion?prptype=${prptype}&txntype=mob_daily_collection_report&fetch=prp`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/javascript',
                    Accept: 'application/json',
                },
                params,
            },
        );


        if (response.data.success && response.data.response.data.length > 0) {
            const propertyGroupData = response.data.response.data;

            // 3. Response ko cache me store karo

            return propertyGroupData;
        }

        return [];
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchpropertyGroupData error', error);
        }
        return [];
    }
};

//

export const fetchPropertyData = async (token: string) => {
    try {
        // 1. Pehle cache check karo
        const cached = await AsyncStorage.getItem('get_property');

        // 2. Cache nahi mila toh API call
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = null;
        const response = await axios.get(
            `${API}/api/getproperty`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/javascript',
                    Accept: 'application/json',
                },
                params,
            },
        );

        console.log("response", response, params)

        if (response.data.success && response.data.response.data.length > 0) {
            const propertyData = response.data.response.data;

            // 3. Response ko cache me store karo
            await AsyncStorage.setItem('get_property', JSON.stringify(propertyData));

            return propertyData;
        }

        return [];
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchPropertyData error', error);
        }
        return [];
    }
};

export const fetchCurrentYearData = async (token: string) => {
    try {
        // 1. Pehle cache check karo
        const cached = await AsyncStorage.getItem('current_year');

        // 2. Cache nahi mila toh API call
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = null;
        const response = await axios.get(
            `${API}/api/getcurrentyear`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/javascript',
                    Accept: 'application/json',
                },
                params,
            },
        );

        if (response) {
            const yearData = response;

            // 3. Response ko cache me store karo
            await AsyncStorage.setItem('current_year', JSON.stringify(yearData));

            return yearData;
        }

        return null;
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchYearData error', error);
        }
        return null;
    }
};

// Add this at the top of your Functions.ts
const MAX_CHUNK_SIZE = 500; // Reduced from 1000 to be more conservative
const FILE_NAME_LENGTH_LIMIT = 200; // Android file name length limit

// Optimized saveLargeData with memory-safe chunking
// Replace your existing saveLargeData with this:
export { saveLargeData } from './DatabaseManager';

// Define paths (no await here)
const PRPTYPE_FOLDER = `${FileSystem.documentDirectory}prptypes/`;
const INDEX_FILE = `${PRPTYPE_FOLDER}index.json`;

// Initialize directory (call this function early in your app)

// // Save data to file
// export const saveToFile = async (prptype: string, data: CachedPrptype) => {
//     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
//     await RNFS.writeFile(filePath, JSON.stringify(data), 'utf8');
// };

// // Read data from file
// export const readFromFile = async (
//     prptype: string,
// ): Promise<CachedPrptype | null> => {
//     const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
//     if (await RNFS.exists(filePath)) {
//         const fileContent = await RNFS.readFile(filePath, 'utf8');
//         return JSON.parse(fileContent) as CachedPrptype;
//     }
//     return null;
// };

// // Save index to file
// export const saveIndexToFile = async (prptypes: string[]) => {
//     await RNFS.writeFile(INDEX_FILE, JSON.stringify(prptypes), 'utf8');
// };

// // Read index from file
// export const readIndexFromFile = async (): Promise<string[]> => {
//     if (await RNFS.exists(INDEX_FILE)) {
//         const fileContent = await RNFS.readFile(INDEX_FILE, 'utf8');
//         return JSON.parse(fileContent) as string[];
//     }
//     return [];
// };
// ============================================
// FILE SYSTEM FUNCTIONS (Expo)
// ============================================
export const saveToFile = async (prptype: string, data: CachedPrptype) => {
    try {
        const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
        console.log(`✅ Saved ${prptype}.json`);
    } catch (err) {
        console.warn(`❌ saveToFile error for ${prptype}:`, err);
    }
};

export const readFromFile = async (prptype: string): Promise<CachedPrptype | null> => {
    try {
        const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
        const file = await FileSystem.getInfoAsync(filePath);
        if (file.exists) {
            const content = await FileSystem.readAsStringAsync(filePath);
            return JSON.parse(content);
        }
        return null;
    } catch (err) {
        console.warn(`❌ readFromFile error for ${prptype}:`, err);
        return null;
    }
};

export const saveIndexToFile = async (prptypes: string[]) => {
    try {
        await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(prptypes));
    } catch (err) {
        console.warn('❌ saveIndexToFile error:', err);
    }
};

export const readIndexFromFile = async (): Promise<string[]> => {
    try {
        const file = await FileSystem.getInfoAsync(INDEX_FILE);
        if (file.exists) {
            const content = await FileSystem.readAsStringAsync(INDEX_FILE);
            return JSON.parse(content);
        }
        return [];
    } catch (err) {
        console.warn('❌ readIndexFromFile error:', err);
        return [];
    }
};

export const debugFileSystem = async () => {
    try {
        const dir = await FileSystem.getInfoAsync(PRPTYPE_FOLDER);
        console.log('📁 Prptype folder exists:', dir.exists);
    } catch (err) {
        console.warn('❌ debugFileSystem error:', err);
    }
};

// export const debugChunkedFiles = async (prptype: string) => {
//     console.log(`📁 Debug for ${prptype}`);
// };

// Updated fetchMasterSyncPartyDataPerPrptypeCache in Functions.ts
export const fetchMasterSyncPartyDataPerPrptypeCache = async (
    token: string,
    getMasterSyncData: any[],
) => {
    // if (cancelToken?.cancel) {
    // cancelToken.cancel('New master sync requested - cancelling previous');
    // }
    const cancelToken = axios.CancelToken.source();

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-platform': 'mob',
    };

    if (!Array.isArray(getMasterSyncData) || getMasterSyncData.length === 0) {
        console.log('⚪ No master sync items found.');
        return;
    }

    // Process each prptype with optimized batching
    for (let i = 0; i < getMasterSyncData.length; i++) {
        const item = getMasterSyncData[i];
        const prptypeRaw = (item?.prptype ?? item?.PrpType ?? '').toString();
        const prptype = normalizePrptype(prptypeRaw);
        const prpcode = item?.prpcode ?? item?.PrpCode ?? '';
        const yearno = item?.yearno ?? item?.YearNo ?? '';
        const apiBase = item?.api ?? '';

        if (!prptype) {
            console.warn('🔶 Skipping invalid item (empty prptype):', item);
            continue;
        }

        const base = (apiBase || '').replace(/\/+$/, '');
        const accountUrl = `${base}/mobaccountbasic`;
        const bankUrl = `${base}/getmobbanklist`;
        const branchUrl = `${base}/getmobbranchlist`;

        try {
            // Clear old data first
            await clearOldChunks(prptype);

            // Prepare payloads
            const accPayload = {
                prpcode,
                yearno,
                prptype,
                strcode: '0',
                txntype: 'sales_order',
                partytype: 'p',
                type: 's',
                page: 1,
                limit: 20,
                search: '',
                isceo: 0,
                partype: 0,
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: '',
                user_id: 1,
            };

            const bankPayload = {
                prptype,
                prpcode,
                yearno,
                txntype: 'receipt',
                user_id: 1,
            };

            // Fetch data with parallel requests
            const [accountRes, bankRes, branchRes] = await Promise.all([
                axios.get(accountUrl, {
                    headers,
                    params: accPayload,
                    cancelToken: cancelToken.token,
                }),
                axios.get(bankUrl, {
                    headers,
                    params: bankPayload,
                    cancelToken: cancelToken.token,
                }),
                axios.get(branchUrl, {
                    headers,
                    params: bankPayload,
                    cancelToken: cancelToken.token,
                }),
            ]);

            // Process results
            const results: CachedPrptype = {
                prptype,
                prpcode,
                yearno,
                account: accountRes.data?.success ? accountRes.data.response?.data : [],
                banks: bankRes.data?.success ? bankRes.data.response?.data : [],
                branches: branchRes.data?.success ? branchRes.data.response?.data : [],
                lastUpdated: new Date().toISOString(),
            };

            // Save to database
            if (results.account || results.banks || results.branches) {
                await saveLargeData(prptype, results);
                console.log(`✅ Completed sync for ${prptype}`);
            } else {
                console.warn(`⚠️ No data saved for ${prptype}`);
            }
        } catch (err) {
            console.error(`❌ Failed to process ${prptype}:`, err);
        } finally {
            // Yield to event loop between items
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log('\n🎉 FULL MASTER SYNC COMPLETED');
};

/* ---------- config ---------- */
const ALL_PRPTYPES_KEY = 'master_sync_all_prptypes';
const PRPTYPE_KEY_PREFIX = 'master_sync_';
const PRPTYPE_PART_SUFFIX = ':part:'; // final keys: `${PRPTYPE_KEY_PREFIX}${key}${PRPTYPE_PART_SUFFIX}${i}`

/**
 * CHUNK SIZE: size of each part in characters (approx bytes).
 * CursorWindow issues kick in when a single value becomes very large (>~2MB).
 * We'll use 500k char chunks which is safe on most devices.
 */
const CHUNK_SIZE = 500_000;

export type CachedPrptype = {
    prptype: string;
    prpcode?: string;
    yearno?: string;
    account?: any | null;
    banks?: any[] | null;
    branches?: any[] | null;
    lastUpdated?: string | null;
    accountChunks?: number; // Number of account chunks
    banksChunks?: number; // Number of bank chunks
    branchesChunks?: number; // Number of branch chunks
};

/* normalize key */
export const normalizePrptype = (val?: any) => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
};

// export const writePrptypeCache = async (
//     prptype: string,
//     value: CachedPrptype,
// ) => {
//     try {
//         await saveToFile(prptype, value);
//         console.log(`✅ Saved cache for "${prptype}" to file system`);
//     } catch (err) {
//         console.warn(`❌ Failed to save cache for ${prptype}:`, err);
//     }
// };
export const writePrptypeCache = async (prptype: string, value: CachedPrptype) => {
    try {
        await saveToFile(prptype, value);
        console.log(`✅ Saved cache for "${prptype}"`);
    } catch (err) {
        console.warn(`❌ Failed to save cache for ${prptype}:`, err);
    }
};

// Reassemble chunked data when reading
// Optimized read with progress tracking
// Memory-safe read function
// Replace your existing readPrptypeCache with this:
export { readPrptypeCache } from './DatabaseManager';

// Add these new functions:
export { getAccountByCode, getBankByName, getPrptypeIndex, clearOldChunks };

// Update your initFileSystem to also initialize the database:
// export const initFileSystem = async () => {
//     try {
//         const fsInit = await RNFS.exists(PRPTYPE_FOLDER);
//         if (!fsInit) {
//             await RNFS.mkdir(PRPTYPE_FOLDER);
//             console.log(`✅ Created directory: ${PRPTYPE_FOLDER}`);
//         }

//         const dbInit = await initDatabase();
//         if (!dbInit) {
//             console.warn('⚠️ Database initialization failed');
//             return false;
//         }

//         return true;
//     } catch (err) {
//         console.warn(`❌ Failed to initialize file system and database:`, err);
//         return false;
//     }
// };
export const initFileSystem = async () => {
    try {
        const dir = await FileSystem.getInfoAsync(PRPTYPE_FOLDER);
        if (!dir.exists) {
            await FileSystem.makeDirectoryAsync(PRPTYPE_FOLDER, { intermediates: true });
            console.log(`✅ Created directory: ${PRPTYPE_FOLDER}`);
        }

        const dbInit = await initDatabase();
        if (!dbInit) {
            console.warn('⚠️ Database initialization failed');
            return false;
        }
        return true;
    } catch (err) {
        console.warn('❌ Failed to initialize file system:', err);
        return false;
    }
};

// Process data in memory-safe batches
export const processInBatches = async <T,>(
    array: T[],
    batchSize: number,
    processBatch: (batch: T[]) => Promise<void>,
    options: {
        onProgress?: (processed: number, total: number) => void;
        delayMs?: number;
    } = {},
) => {
    const { onProgress, delayMs = 0 } = options;

    for (let i = 0; i < array.length; i += batchSize) {
        const batch = array.slice(i, i + batchSize);
        await processBatch(batch);

        if (onProgress) {
            onProgress(Math.min(i + batchSize, array.length), array.length);
        }

        // Yield to event loop
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
};

export const addPrptypeToIndex = async (prptype: string) => {
    const key = normalizePrptype(prptype);
    if (!key) return;

    try {
        const index = await readIndexFromFile();
        if (!index.includes(key)) {
            index.push(key);
            await saveIndexToFile(index);
        }

    } catch (err) {
        console.warn('❌ Failed to update index:', err);
    }
};

export const loadAllPrptypeCaches = async (): Promise<
    Record<string, CachedPrptype | null>
> => {
    try {
        const { prptypes } = await getPrptypeIndex();
        const out: Record<string, CachedPrptype | null> = {};

        for (const p of prptypes) {
            const key = normalizePrptype(p);
            out[key] = await readPrptypeCache(key);
        }

        return out;
    } catch (err) {
        console.warn('❌ Failed to load all caches:', err);
        return {};
    }
};

/* ---------- summary + debug helpers ---------- */
export const getPrptypeSummary = async (
    prptype: string,
): Promise<{
    prptype: string;
    accountCount: number | null;
    banksCount: number | null;
    branchesCount: number | null;
    lastUpdated: string | null;
}> => {
    try {
        const cache = await readPrptypeCache(prptype);
        if (!cache) {
            return {
                prptype,
                accountCount: null,
                banksCount: null,
                branchesCount: null,
                lastUpdated: null,
            };
        }
        const accountCount = Array.isArray(cache.account)
            ? cache.account.length
            : cache.account
                ? null
                : 0;
        const banksCount = Array.isArray(cache.banks)
            ? cache.banks.length
            : cache.banks
                ? null
                : 0;
        const branchesCount = Array.isArray(cache.branches)
            ? cache.branches.length
            : cache.branches
                ? null
                : 0;
        return {
            prptype,
            accountCount,
            banksCount,
            branchesCount,
            lastUpdated: cache.lastUpdated ?? null,
        };
    } catch (err) {
        console.warn('getPrptypeSummary failed for', prptype, err);
        return {
            prptype,
            accountCount: null,
            banksCount: null,
            branchesCount: null,
            lastUpdated: null,
        };
    }
};

export const debugRawAsyncStorage = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();

        const masterKeys = keys.filter(
            k => k && (k === ALL_PRPTYPES_KEY || k.startsWith(PRPTYPE_KEY_PREFIX)),
        );
        for (const k of masterKeys) {
            const v = await AsyncStorage.getItem(k);
        }
    } catch (err) {
        console.warn('debugRawAsyncStorage failed', err);
    }
};

export const printCachedPrptypesWithData = async () => {
    try {
        const { prptypes } = await getPrptypeIndex();

        const present: string[] = [];
        for (const p of prptypes) {
            const key = normalizePrptype(p);
            const cache = await readPrptypeCache(key);
            if (!cache) {
                continue;
            }

            const a = Array.isArray(cache.account) ? cache.account.length : 0;
            const b = Array.isArray(cache.banks) ? cache.banks.length : 0;
            const c = Array.isArray(cache.branches) ? cache.branches.length : 0;

            if (a > 0 || b > 0 || c > 0) {
                present.push(key);
            }
        }

        return { index: prptypes, present };
    } catch (err) {
        console.warn('❌ printCachedPrptypesWithData failed:', err);
        return { index: [], present: [] };
    }
};

// export const debugFileSystem = async () => {
//     try {
//         const files = await RNFS.readDir(PRPTYPE_FOLDER);
//         for (const file of files) {
//             const stats = await RNFS.stat(file.path);
//         }
//     } catch (err) {
//         console.warn('❌ debugFileSystem failed:', err);
//     }
// };

// export const debugChunkedFiles = async (prptype: string) => {
//     try {
//         const files = await RNFS.readDir(PRPTYPE_FOLDER);
//         const prptypeFiles = files.filter(f => f.name.startsWith(prptype));

//         for (const file of prptypeFiles) {
//             const stats = await RNFS.stat(file.path);
//         }
//     } catch (err) {
//         console.warn(`❌ Failed to debug files for ${prptype}:`, err);
//     }
// };
export const debugChunkedFiles = async (prptype: string) => {
    console.log(`📁 Debug for ${prptype}`);
};

export const fetchAllPropertyData = async (token: string) => {
    try {
        // const userPtype = 'R'; //await AsyncStorage.getItem('user_prptype');
        const userPtype = await AsyncStorage.getItem('user_prptype');

        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = null;

        console.log("fetchAllPropertydata api url :", `${API}/api/get_criterion?prptype=${userPtype}&txntype=&fetch=prp`)
        const response = await axios.get(
            `${API}/api/get_criterion?prptype=${userPtype}&txntype=''&fetch=prp`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/javascript',
                    Accept: 'application/json',
                },
                params,
            },
        );

        console.log("response :", response);

        // if (response.data.success && response.data.response.data.length > 0) {
        //     const propertyGroupData = response.data.response.data;
        //     return propertyGroupData;
        // } else {
        //     return [];
        // }
        let data: any[] = [];
        if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
            data = response.data.response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            data = response.data.data;
        } else if (Array.isArray(response.data)) {
            data = response.data;
        }

        console.log(`✅ Property items: ${data.length}`);
        return data;
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchpropertyGroupData error', error);
        }
        return [];
    }
};

export const fetchAllYeardata = async (token: string, prpcd = '') => {
    try {
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = { prpcode: prpcd };

        const response = await axios.get(`${API}/api/getyear`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json',
            },
            params,
        });

        // if (response.data.response.data && response.data.response.data.length > 0) {
        //     const appYdata = response.data.response.data;
        //     return appYdata;
        // } else {
        //     return [];
        // }
        let data: any[] = [];
        if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
            data = response.data.response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            data = response.data.data;
        } else if (Array.isArray(response.data)) {
            data = response.data;
        }

        console.log(`✅ Year items: ${data.length}`);
        return data;
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchAllYeardata error', error);
        }
        return [];
    }
};

export const fetchAllStoredata = async (
    token: string,
    prp = '',
    yrno = '',
    txn = '',
) => {
    const userPtype = await AsyncStorage.getItem('user_prptype');
    const platform = txn !== '' ? 'mob' : '';
    try {
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();

        let params = {
            prpcode: prp,
            yearno: yrno,
            txntype: txn,
            prptype: userPtype,
            // prptype: 'R'
        };
        const response = await axios.get(`${API}/api/getstore`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json',
                'x-platform': 'mob',
            },
            params,
        });
        // if (response.data.response.data && response.data.response.data.length > 0) {
        //     const appStoredata = response.data.response.data;
        //     return appStoredata;
        // } else {
        //     return [];
        // }
        // ✅ Safe data extraction
           // ✅ Safe data extraction
        let data: any[] = [];
        if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
            data = response.data.response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            data = response.data.data;
        } else if (Array.isArray(response.data)) {
            data = response.data;
        }

        console.log(`✅ Store items: ${data.length}`);
        console.log(`✅ Store items: ${JSON.stringify(data)}`);
          // 🔥🔥🔥 YEH LINE MISSING THI! 🔥🔥🔥
        return data;  // ✅ YEH ADD KARO!
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.log('fetchAllStoredata error', error);
        }
        return [];
    }
};

export const getCurrentFinancialYearMain = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // Financial year starts in April
    const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;

    return `${financialYearStart}-${financialYearEnd}`;
};

// without Not future
export const generateFinancialYearOptions = (
    currentYear: number,
    range: number = 4,
) => {
    const years = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const currentFinancialYearStart =
        currentMonth >= 4 ? currentYear : currentYear - 1;

    // Generate the last 'range' financial years including the current financial year
    for (let i = 0; i <= range; i++) {
        const startYear = currentFinancialYearStart - i;
        const endYear = startYear + 1;
        years.push(`${startYear}-${endYear}`);
    }

    return years;
};
