// FILE: src/components/VisitorsNEW/i18n.ts
// English + Hindi text for the Visits (watchman) screen. The Visitors Report
// is English only and does not use this file.
//   t(lang, 'key')              → text
//   t(lang, 'key', { n: 3 })    → "{n}" in the text is replaced
// To change wording, edit ONLY this file. Each entry is [English, Hindi].
import { Lang } from './model';

const STR = {
  // top bar
  guide: ['Guide', 'मदद'],
  refresh: ['Refresh', 'रीफ़्रेश'],
  newEntry: ['New Visitor Entry', 'नया विज़िटर दर्ज करें'],
  newEntrySub: ['Tap here when someone comes to the gate', 'गेट पर कोई आए तो यहाँ दबाएँ'],

  // counters
  insideNow: ['Inside now', 'अभी अंदर'],
  todayTotal: ['Came today', 'आज आए'],
  wentOut: ['Went out', 'बाहर गए'],
  overstay: ['Inside too long', 'बहुत देर से अंदर'],

  // tabs
  tabInside: ['Inside now', 'अभी अंदर'],
  tabToday: ['Today', 'आज'],
  tabDate: ['Other day', 'दूसरा दिन'],
  pickDate: ['Date', 'तारीख'],
  searchPh: ['Search name, mobile, company, pass no…', 'नाम, मोबाइल, कंपनी, पास नंबर खोजें…'],

  // list
  loading: ['Loading visitors…', 'विज़िटर लोड हो रहे हैं…'],
  emptyInside: ['Nobody is inside right now.', 'अभी कोई अंदर नहीं है।'],
  emptyDay: ['No visitor entry for this day.', 'इस दिन की कोई एंट्री नहीं है।'],
  emptySearch: ['Nothing matches “{q}”.', '“{q}” से कुछ नहीं मिला।'],
  retry: ['Tap to try again', 'दोबारा कोशिश करें'],
  loadFailed: ['Could not load visitors.', 'विज़िटर लोड नहीं हो पाए।'],

  // card
  toMeet: ['To meet', 'किससे मिलना है'],
  inTime: ['IN', 'अंदर'],
  outTime: ['OUT', 'बाहर'],
  inside: ['INSIDE', 'अंदर हैं'],
  gone: ['WENT OUT', 'बाहर गए'],
  tooLong: ['INSIDE TOO LONG', 'बहुत देर से अंदर'],
  markOut: ['Mark OUT', 'बाहर गए'],
  call: ['Call', 'फ़ोन'],
  details: ['Details', 'पूरी जानकारी'],
  together: ['{n} came together', '{n} साथ आए'],
  plusOthers: ['+{n} more with them', '+{n} और साथ में'],
  photosN: ['{n} photo(s)', '{n} फोटो'],
  stayed: ['Stayed {d}', '{d} रुके'],
  since: ['{d} inside', '{d} से अंदर'],

  // form — general
  formNew: ['New Visitor Entry', 'नया विज़िटर'],
  formEdit: ['Edit Entry', 'एंट्री बदलें'],
  allOptional: ['Fill whatever you know — nothing is compulsory. A name, mobile or photo is enough to save.', 'जो पता हो वही भरें — कुछ भी ज़रूरी नहीं है। सेव करने के लिए नाम, मोबाइल या फोटो काफ़ी है।'],
  optional: ['optional', 'ज़रूरी नहीं'],
  save: ['Save Entry', 'एंट्री सेव करें'],
  saveN: ['Save {n} Entries', '{n} एंट्री सेव करें'],
  saveNext: ['Save + Next', 'सेव + अगला'],
  saveChanges: ['Save Changes', 'बदलाव सेव करें'],
  cancel: ['Cancel', 'रद्द करें'],
  close: ['Close', 'बंद करें'],
  yes: ['Yes', 'हाँ'],
  no: ['No', 'नहीं'],
  more: ['More details', 'और जानकारी'],
  less: ['Hide details', 'कम दिखाएँ'],

  // form — section 1
  s1: ['Who has come?', 'कौन आया है?'],
  person: ['Person {n}', 'व्यक्ति {n}'],
  mobile: ['Mobile number', 'मोबाइल नंबर'],
  mobilePh: ['10 digit mobile', '10 अंकों का मोबाइल'],
  name: ['Name', 'नाम'],
  namePh: ['Full name', 'पूरा नाम'],
  designation: ['Designation / Post', 'पद'],
  altMobile: ['Second mobile', 'दूसरा मोबाइल'],
  gender: ['Gender', 'लिंग'],
  addPerson: ['Add one more person', 'एक और व्यक्ति जोड़ें'],
  addPersonSub: ['Came together? Enter everyone in one entry. The company is copied.', 'साथ आए हैं? सबको एक ही एंट्री में भरें। कंपनी अपने आप आ जाएगी।'],
  removePerson: ['Remove', 'हटाएँ'],
  extraPersons: ['Others with them (no details needed)', 'साथ में और लोग (जानकारी नहीं चाहिए)'],
  cameBefore: ['Came before? Tap the name to fill everything', 'पहले आ चुके हैं? नाम दबाएँ, सब भर जाएगा'],
  usedBefore: ['Used before — tap to fill', 'पहले लिखा गया — भरने के लिए दबाएँ'],
  knownFilled: ['Came before ({n} visits) — details filled from last visit.', 'पहले आ चुके हैं ({n} बार) — पिछली जानकारी भर दी गई।'],
  visitsN: ['{n} visits', '{n} बार आए'],
  lastCame: ['Last: {d}', 'पिछली बार: {d}'],

  // photos
  photos: ['Photos', 'फोटो'],
  photoHint: ['Take as many photos as you want.', 'जितनी चाहें उतनी फोटो लें।'],
  addFace: ['Face photo', 'चेहरे की फोटो'],
  addCard: ['Visiting card', 'विज़िटिंग कार्ड'],
  addOther: ['Other photo', 'अन्य फोटो'],
  photosTaken: ['{n} photo(s) taken — tap a photo to see it big', '{n} फोटो ली गई — बड़ी देखने के लिए फोटो दबाएँ'],
  fromGallery: ['Gallery', 'गैलरी'],
  photoOf: ['Photo {a} of {b}', 'फोटो {a} / {b}'],
  removePhoto: ['Remove photo', 'फोटो हटाएँ'],
  noCamera: ['Camera permission is off. Allow camera for this app in phone Settings, then try again.', 'कैमरा की अनुमति बंद है। फ़ोन की Settings में इस ऐप को कैमरा की अनुमति दें और फिर कोशिश करें।'],
  photoFailed: ['Could not take the photo. Please try again.', 'फोटो नहीं ली जा सकी। दोबारा कोशिश करें।'],

  // form — section 2
  company: ['Company / Firm', 'कंपनी / फर्म'],
  companyPh: ['Company or shop name', 'कंपनी या दुकान का नाम'],

  // form — section 3
  s3: ['Why have they come? Whom to meet?', 'क्यों आए हैं? किससे मिलना है?'],
  purpose: ['Purpose', 'आने का कारण'],
  purposeNote: ['Work details', 'काम की जानकारी'],
  purposeNotePh: ['e.g. sample approval, cheque collection', 'जैसे: सैंपल दिखाना, चेक लेना'],
  host: ['Whom to meet', 'किससे मिलना है'],
  hostPh: ['Name of our person', 'हमारे व्यक्ति का नाम'],
  moreHint: ['(post, second mobile, gender)', '(पद, दूसरा मोबाइल, लिंग)'],
  deleteEntry: ['Delete this entry', 'यह एंट्री हटाएँ'],
  appointment: ['Called by us / has appointment?', 'हमने बुलाया है / अपॉइंटमेंट है?'],
  appointmentShort: ['Appointment', 'अपॉइंटमेंट'],

  // form — section 4

  // form — section 5
  s5: ['Time and note', 'समय और नोट'],
  inDate: ['In date', 'आने की तारीख'],
  inClock: ['In time', 'आने का समय'],
  nowBtn: ['Now', 'अभी'],
  remarks: ['Note', 'नोट'],
  remarksPh: ['Anything else to remember', 'कुछ और याद रखने लायक'],

  // validation
  needOne: ['Enter at least a name, a mobile number or a photo.', 'कम से कम नाम, मोबाइल नंबर या एक फोटो डालें।'],
  badMobile: ['Mobile number of person {n} is not correct. It must be 10 digits.', 'व्यक्ति {n} का मोबाइल नंबर सही नहीं है। 10 अंक होने चाहिए।'],
  futureTime: ['In time cannot be later than now.', 'आने का समय अभी से आगे नहीं हो सकता।'],
  alreadyInsideTitle: ['Already inside', 'पहले से अंदर हैं'],
  alreadyInside: ['{name} is already marked inside. Save a new entry anyway?', '{name} पहले से अंदर दर्ज हैं। फिर भी नई एंट्री सेव करें?'],
  saveAnyway: ['Save anyway', 'फिर भी सेव करें'],
  discardTitle: ['Leave without saving?', 'बिना सेव किए बंद करें?'],
  discardMsg: ['What you typed will be lost.', 'जो भरा है वह हट जाएगा।'],
  discard: ['Leave', 'बंद करें'],
  keepEditing: ['Keep filling', 'भरना जारी रखें'],

  // results
  saved1: ['Entry saved · Pass no. {no}', 'एंट्री सेव हो गई · पास नं. {no}'],
  savedN: ['{n} entries saved', '{n} एंट्री सेव हो गईं'],
  updated: ['Changes saved', 'बदलाव सेव हो गए'],
  outDone: ['{name} marked OUT', '{name} बाहर गए — दर्ज हो गया'],
  outDoneN: ['{n} people marked OUT', '{n} लोग बाहर गए — दर्ज हो गया'],
  undoDone: ['{name} is shown inside again', '{name} फिर से अंदर दिखाए गए'],
  deleted: ['Entry deleted', 'एंट्री हटा दी गई'],
  errorTitle: ['Could not save', 'सेव नहीं हुआ'],

  // check-out sheet
  outTitle: ['Mark OUT', 'बाहर गए — दर्ज करें'],
  outEyebrow: ['VISITOR IS LEAVING', 'विज़िटर जा रहे हैं'],
  outDate: ['Out date', 'जाने की तारीख'],
  outClock: ['Out time', 'जाने का समय'],
  outRemark: ['Note while leaving', 'जाते समय का नोट'],
  outRemarkPh: ['e.g. took 2 sample pieces', 'जैसे: 2 सैंपल पीस ले गए'],
  outGroup: ['Also mark OUT everyone who came together (+{n})', 'साथ आए बाकी लोगों को भी बाहर दर्ज करें (+{n})'],
  outBeforeIn: ['Out time cannot be before the in time.', 'जाने का समय आने के समय से पहले नहीं हो सकता।'],
  confirmOut: ['Confirm OUT', 'बाहर गए — पक्का करें'],

  // detail sheet
  detailEyebrow: ['VISITOR ENTRY', 'विज़िटर एंट्री'],
  edit: ['Edit', 'बदलें'],
  delete: ['Delete', 'हटाएँ'],
  undoOut: ['Undo OUT', 'OUT हटाएँ'],
  deleteTitle: ['Delete this entry?', 'यह एंट्री हटाएँ?'],
  deleteMsg: ['The entry of {name} will be removed. This cannot be undone.', '{name} की एंट्री हट जाएगी। यह वापस नहीं आएगी।'],
  undoTitle: ['Remove the OUT time?', 'OUT का समय हटाएँ?'],
  undoMsg: ['{name} will be shown as inside again.', '{name} फिर से अंदर दिखाए जाएँगे।'],
  passNoShort: ['Pass no.', 'पास नं.'],
  entryBy: ['Entry by', 'एंट्री करने वाले'],
  outBy: ['OUT marked by', 'OUT दर्ज करने वाले'],
  stayTime: ['Time inside', 'अंदर रहे'],
  noPhotos: ['No photo taken.', 'कोई फोटो नहीं ली गई।'],
  persons: ['Persons', 'लोग'],
  noRight: ['You do not have the right for this. Ask the office.', 'आपके पास इसकी अनुमति नहीं है। ऑफिस से पूछें।'],
} as const;

export type StrKey = keyof typeof STR;

export function t(lang: Lang, key: StrKey, vars?: Record<string, string | number>): string {
  const pair = STR[key];
  let text: string = lang === 'hi' ? pair[1] : pair[0];
  if (vars) Object.keys(vars).forEach((k) => { text = text.split(`{${k}}`).join(String(vars[k])); });
  return text;
}

/* -------------------------------------------------------------------------- */
/* Guide (shown from the "Guide / मदद" button and once on first open).         */
/* `art` is the small picture of that part of the screen — see GuideArt.tsx.   */
/* -------------------------------------------------------------------------- */

export type GuideStep = { art: string; title: [string, string]; body: [string, string] };

export const GUIDE_STEPS: GuideStep[] = [
  {
    art: 'newEntry',
    title: ['1. Someone comes to the gate', '1. गेट पर कोई आए'],
    body: [
      'Tap the big orange button “New Visitor Entry”.',
      'बड़ा नारंगी बटन “नया विज़िटर दर्ज करें” दबाएँ।',
    ],
  },
  {
    art: 'mobile',
    title: ['2. Mobile number, name and company', '2. मोबाइल नंबर, नाम और कंपनी'],
    body: [
      'Type the mobile number first. If the person came before, the name and company fill by themselves. You can also type the name or the company — people who came before appear below, tap one to fill.',
      'सबसे पहले मोबाइल नंबर डालें। अगर व्यक्ति पहले आ चुका है तो नाम और कंपनी अपने आप भर जाते हैं। नाम या कंपनी लिखने पर भी पहले आए लोग नीचे दिखते हैं — दबाते ही सब भर जाएगा।',
    ],
  },
  {
    art: 'photos',
    title: ['3. Take photos — as many as you want', '3. फोटो लें — जितनी चाहें'],
    body: [
      '“Face photo” for the person, “Visiting card” if they have a card, “Other photo” for anything else. Each tap opens the camera and adds one more photo. Small photos appear below: tap one to see it full screen, tap ✕ to remove it.',
      'व्यक्ति के लिए “चेहरे की फोटो”, कार्ड हो तो “विज़िटिंग कार्ड”, बाकी के लिए “अन्य फोटो”। हर बार दबाने पर कैमरा खुलता है और एक फोटो जुड़ती है। छोटी फोटो नीचे दिखती हैं: बड़ी देखने के लिए उस पर दबाएँ, हटाने के लिए ✕ दबाएँ।',
    ],
  },
  {
    art: 'group',
    title: ['4. More than one person?', '4. एक से ज़्यादा लोग हैं?'],
    body: [
      'Tap “Add one more person” and fill each one. The company comes from the first person (change it if different); the purpose is typed only once for everybody. For helpers whose details are not needed, just increase “Others with them”.',
      '“एक और व्यक्ति जोड़ें” दबाकर हर एक की जानकारी भरें। कंपनी पहले व्यक्ति वाली अपने आप आ जाती है (अलग हो तो बदल दें); कारण सबके लिए एक ही बार भरना है। जिन साथियों की जानकारी नहीं चाहिए, उनके लिए सिर्फ़ “साथ में और लोग” की गिनती बढ़ाएँ।',
    ],
  },
  {
    art: 'purpose',
    title: ['5. Why they came, whom to meet', '5. क्यों आए, किससे मिलना है'],
    body: [
      'Tap the matching box for the purpose. Type the name of our person they want to meet — names typed earlier appear below, tap to fill. Nothing is compulsory.',
      'आने के कारण का सही डिब्बा दबाएँ। हमारे जिस व्यक्ति से मिलना है उसका नाम लिखें — पहले लिखे गए नाम नीचे दिखते हैं, दबाकर भरें। कुछ भी ज़रूरी नहीं है।',
    ],
  },
  {
    art: 'save',
    title: ['6. Save', '6. सेव करें'],
    body: [
      '“Save Entry” saves and closes. “Save + Next” saves and opens a blank form for the next visitor — use it when many people are waiting.',
      '“एंट्री सेव करें” से सेव होकर बंद होगा। “सेव + अगला” से सेव होकर अगले विज़िटर के लिए खाली फ़ॉर्म खुलेगा — जब बहुत लोग खड़े हों तब यह दबाएँ।',
    ],
  },
  {
    art: 'markOut',
    title: ['7. When the visitor leaves', '7. जब विज़िटर वापस जाए'],
    body: [
      'Find the person in “Inside now” and tap the green “Mark OUT” button. If they came in a group, everybody can be marked OUT together. A red card means the person is inside for too long.',
      '“अभी अंदर” सूची में व्यक्ति को ढूँढें और हरा बटन “बाहर गए” दबाएँ। साथ आए हों तो सबको एक साथ बाहर दर्ज कर सकते हैं। लाल कार्ड का मतलब व्यक्ति बहुत देर से अंदर है।',
    ],
  },
  {
    art: 'findEdit',
    title: ['8. Find, correct or delete an entry', '8. एंट्री ढूँढें, ठीक करें या हटाएँ'],
    body: [
      'Type in the search box (name, mobile, company, pass no.). Tap a card to see everything and all photos. “Edit” opens the form to correct it; “Delete” removes a wrong entry. “Other day” shows old entries.',
      'खोज डिब्बे में नाम, मोबाइल, कंपनी या पास नंबर लिखें। पूरी जानकारी और सारी फोटो के लिए कार्ड पर दबाएँ। “बदलें” से फ़ॉर्म खुलकर ठीक कर सकते हैं; “हटाएँ” से गलत एंट्री हट जाएगी। “दूसरा दिन” से पुरानी एंट्री दिखती हैं।',
    ],
  },
];

export const GUIDE_TITLE: [string, string] = ['How to use this screen', 'यह स्क्रीन कैसे चलाएँ'];
export const GUIDE_DONE: [string, string] = ['OK, understood', 'ठीक है, समझ गया'];

/** Visitors Report guide (the report is English only). */
export const REPORT_GUIDE_STEPS: GuideStep[] = [
  {
    art: 'rPeriod',
    title: ['1. Choose the period', ''],
    body: ['Tap Today, Yesterday, Last 7 days, This month, Last month, This year or Last year. The ‹ › arrows move to the previous / next day, month or year. “Custom” shows From and To dates for any other range. Everything on the screen follows this period.', ''],
  },
  {
    art: 'rKpi',
    title: ['2. Read the numbers', ''],
    body: ['Visits, unique visitors, still inside, inside too long, average stay and visits with photos. Tap “Still inside” or “Inside too long” to see exactly who.', ''],
  },
  {
    art: 'rSearch',
    title: ['3. Search and filter', ''],
    body: ['Search by name, mobile, company or pass no. “Filters” narrows by status, purpose and whom to meet. Active filters show as chips — tap a chip to remove it.', ''],
  },
  {
    art: 'rSummary',
    title: ['4. Summary tab', ''],
    body: ['Visits per day and per hour, purpose, whom they came to meet and top companies. Tap any bar to open the register filtered to it.', ''],
  },
  {
    art: 'rPeriods',
    title: ['5. Day-wise, month-wise, year-wise', ''],
    body: ['The “Day / Month / Year” tab totals the visits: Day-wise for every day of the selected period, Month-wise for the 12 months of the year, Year-wise for every year. Each row shows visits, persons, unique visitors, went out, still inside and average stay. Tap a row to open that day, month or year.', ''],
  },
  {
    art: 'rRegister',
    title: ['6. Register tab', ''],
    body: ['Every visit with in / out time, stay and status. Sort by newest, oldest, longest stay or name. Tap a row for full details.', ''],
  },
  {
    art: 'rPhotos',
    title: ['7. Photos', ''],
    body: ['Small photos show on each row. Tap a small photo to open it full screen; use the arrows or the strip at the bottom to move between photos.', ''],
  },
  {
    art: 'rEditDelete',
    title: ['8. Correct or delete an entry', ''],
    body: ['Open a visit and tap “Edit” to correct it in the same form the gate uses, or “Delete” to remove a wrong entry. These buttons appear only for users with the edit / delete right.', ''],
  },
  {
    art: 'rVisitors',
    title: ['9. Visitors tab', ''],
    body: ['One row per person: number of visits, first and last visit, average and total time. Tap a person to see all their visits.', ''],
  },
  {
    art: 'rExport',
    title: ['10. Excel, PDF and Print — preview, then download', ''],
    body: ['Excel and PDF first open a preview of exactly what the file contains — check it, then tap Download. Excel has coloured sheets: Register, Visitors, Day-wise, Month-wise, Year-wise and Summary. The PDF has key numbers, the register with photos, the day / month / year tables and a summary page. Print opens the print dialog. All use the period, search and filters on screen.', ''],
  },
];
