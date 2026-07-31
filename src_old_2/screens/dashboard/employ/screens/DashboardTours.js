// screens/EmployeeDashboardTours.ts
// import { TourStep } from '../components/TourOverlay';

// ─── Owner Dashboard Tour ─────────────────────────────────────────────────────
export const OWNER_DASHBOARD_TOUR = [
  {
    emoji: '📅',
    title: { en: 'Select Date', hi: 'तारीख चुनें' },
    description: {
      en: 'Tap the date button to view data for any past date. Dashboard auto-refreshes when date changes.',
      hi: 'किसी भी पुरानी तारीख का डेटा देखने के लिए डेट बटन टैप करें। तारीख बदलते ही डैशबोर्ड अपने आप अपडेट हो जाएगा।',
    },
  },
  {
    emoji: '📊',
    title: { en: 'Sales Overview', hi: 'सेल्स ओवरव्यू' },
    description: {
      en: 'See today\'s sales and month-to-date total. The sparkline shows daily trend for the month. Categories are ranked by MTD sales.',
      hi: 'आज की सेल्स और महीने की कुल बिक्री देखें। स्पार्कलाइन से महीने का रोज़ाना ट्रेंड पता चलता है। कैटेगरी MTD सेल्स के हिसाब से रैंक होती हैं।',
    },
  },
  {
    emoji: '🔢',
    title: { en: 'Long Press for Exact Value', hi: 'लॉन्ग प्रेस से असली वैल्यू देखें' },
    description: {
      en: 'Any amount shown (like ₹1.2Cr) — long press it to see the exact full number without rounding.',
      hi: 'कोई भी अमाउंट (जैसे ₹1.2Cr) पर लॉन्ग प्रेस करें — पूरा सही नंबर बिना शॉर्टकट के दिखेगा।',
    },
  },
  {
    emoji: '⚙️',
    title: { en: 'Production Section', hi: 'प्रोडक्शन सेक्शन' },
    description: {
      en: 'Track today\'s and MTD production in meters, machine-wise. Scroll inside the table if there are many machines.',
      hi: 'आज और MTD का मीटर में प्रोडक्शन देखें, मशीन वार। ज़्यादा मशीनें हों तो टेबल के अंदर स्क्रॉल करें।',
    },
  },
  {
    emoji: '💰',
    title: { en: 'Payment Collection', hi: 'पेमेंट कलेक्शन' },
    description: {
      en: 'See collections by each sales executive. Tap any executive row to drill down into their full dashboard.',
      hi: 'हर सेल्स एग्जीक्यूटिव की कलेक्शन देखें। किसी भी एग्जीक्यूटिव की रो टैप करें — उनका पूरा डैशबोर्ड खुलेगा।',
    },
  },
  {
    emoji: '⚠️',
    title: { en: 'Outstanding Dues', hi: 'बकाया राशि' },
    description: {
      en: 'Total outstanding and executive-wise breakdown. Tap an executive to see which parties have pending dues.',
      hi: 'कुल बकाया और एग्जीक्यूटिव वार ब्रेकडाउन। एग्जीक्यूटिव टैप करें — किस पार्टी का कितना बकाया है, वो देखें।',
    },
  },
];

// ─── Sales Exec Dashboard Tour ────────────────────────────────────────────────
export const SALES_EXEC_DASHBOARD_TOUR  = [
  {
    emoji: '👤',
    title: { en: 'Executive Profile', hi: 'एग्जीक्यूटिव प्रोफाइल' },
    description: {
      en: 'See the executive\'s city, customer count, and target achievement % at a glance in the profile card.',
      hi: 'प्रोफाइल कार्ड में एग्जीक्यूटिव की सिटी, कस्टमर काउंट और टार्गेट अचीवमेंट % एक नज़र में देखें।',
    },
  },
  {
    emoji: '📊',
    title: { en: 'Sales by Customer', hi: 'कस्टमर वार सेल्स' },
    description: {
      en: 'Top customers ranked by sales. Tap any customer row to open their full Party Dashboard with payment history.',
      hi: 'सेल्स के हिसाब से टॉप कस्टमर। किसी भी कस्टमर रो टैप करें — उनका पूरा पार्टी डैशबोर्ड पेमेंट हिस्ट्री के साथ खुलेगा।',
    },
  },
  {
    emoji: '💳',
    title: { en: 'Collection & Outstanding', hi: 'कलेक्शन और बकाया' },
    description: {
      en: 'The progress bar shows collected % vs pending. Below it, see collections and outstanding amounts party-wise.',
      hi: 'प्रोग्रेस बार से कलेक्टेड % और पेंडिंग पता चलता है। नीचे पार्टी वार कलेक्शन और बकाया देखें।',
    },
  },
  {
    emoji: '🔢',
    title: { en: 'Long Press for Exact Amount', hi: 'लॉन्ग प्रेस से असली अमाउंट' },
    description: {
      en: 'Long press any ₹ value to see the full unformatted number. Works on all amounts across all sections.',
      hi: 'कोई भी ₹ वैल्यू लॉन्ग प्रेस करें — पूरा अनफॉर्मेटेड नंबर दिखेगा। सभी सेक्शन में काम करता है।',
    },
  },
];

// ─── Party Dashboard Tour ─────────────────────────────────────────────────────
export const PARTY_DASHBOARD_TOUR = [
  {
    emoji: '🏢',
    title: { en: 'Party Profile', hi: 'पार्टी प्रोफाइल' },
    description: {
      en: 'See the party\'s city, last order date, today\'s sale, total billed MTD, and outstanding at a glance.',
      hi: 'पार्टी की सिटी, आखिरी ऑर्डर की तारीख, आज की सेल, MTD टोटल बिलिंग और बकाया एक नज़र में देखें।',
    },
  },
  {
    emoji: '📈',
    title: { en: 'Sales Trend — Last 11 Days', hi: 'सेल्स ट्रेंड — पिछले 11 दिन' },
    description: {
      en: 'The sparkline shows this party\'s daily sales for the last 11 days. TODAY is today\'s sale, US MTD is the month total.',
      hi: 'स्पार्कलाइन पिछले 11 दिनों की इस पार्टी की रोज़ाना सेल दिखाता है। TODAY आज की सेल है, US MTD महीने का टोटल।',
    },
  },
  {
    emoji: '💳',
    title: { en: 'Payment Status', hi: 'पेमेंट स्टेटस' },
    description: {
      en: 'Collected vs Due amount with a progress bar. Green = collected portion. Red pending % means dues are open.',
      hi: 'कलेक्टेड vs बकाया अमाउंट प्रोग्रेस बार के साथ। हरा = कलेक्टेड हिस्सा। लाल पेंडिंग % का मतलब बकाया खुला है।',
    },
  },
  {
    emoji: '🔄',
    title: { en: 'Pull to Refresh', hi: 'नीचे खींचें और रिफ्रेश करें' },
    description: {
      en: 'Pull down anywhere on the screen to refresh all data for this party with the latest figures.',
      hi: 'स्क्रीन पर कहीं भी नीचे खींचें — इस पार्टी का सारा डेटा लेटेस्ट फिगर के साथ रिफ्रेश हो जाएगा।',
    },
  },
];