// FILE: src/components/YarnManufacturingNEW/index.tsx
// NEW ERP — Yarn Manufacturing (replaces legacy informational screen).
// Legacy source : components/YarnManufacturing/index.tsx (identical copy: src/components/YarnManufacturing/index.tsx)
// Legacy route  : app/(tabs)/yarn-manufacturing.tsx (no props)
// Endpoints     : NONE (static content) — so there is no api.ts.
// AsyncStorage  : none.
// Kept exactly as legacy: every text, both image URLs, the product data, the Hybrid / Texturised tab switch
//   (default 'Hybrid') with its description line, table layout (Effects | Denier Range, alternate row shading),
//   key strengths, infrastructure texts + tech list, the address card and the contact block (incl. the inert
//   'CONTACT US' button, social icons and 'Main Menu' text list — none of them did anything in legacy either).
//   As in legacy, the yarn group name (`type`) of each product table is data only and is NOT rendered.
// Deliberate deviations (look only):
//   - hero header (image + gradient + back button + inert 'Get in Touch' button) -> plain in-content title block;
//     the header image is kept as a plain banner picture. Back button / router.replace('/(tabs)') dropped
//     (global header handles navigation). StatusBar dropped.
//   - legacy colours / gradient replaced by theme tokens.
//   - responsive: company cards 2-up on tablet/desktop, product tables in a 1 / 2 / 3 column grid,
//     image+text rows stack on phone, contact columns 2-up on phone and 4-up on tablet/desktop.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Segment } from '../erpUi';

type Props = { token?: string; API?: string; username?: string };
type TabKey = 'Hybrid' | 'Texturised';
type ProductGroup = { type: string; products: { name: string; range: string }[] };

// Replace these URLs later with your actual image URLs (legacy note)
const HEADER_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200';
const FACTORY_IMAGE = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800';

const productData: Record<TabKey, ProductGroup[]> = {
  Hybrid: [
    { type: 'Polyester Yarn / Raw White / Grepe / Dyed', products: [
      { name: 'PLAIN', range: '60 to 2000' },
      { name: 'SLUB', range: '110 to 2500' },
      { name: 'T&T', range: '60 to 1500' },
      { name: 'DARK SLUB', range: '110 to 1500' },
      { name: 'PATERNI + DARK SLUB', range: '110 to 1500' },
      { name: 'NEPS', range: '110 to 1500' },
      { name: 'LONG SLUB', range: '110 to 2200' },
    ]},
    { type: 'Nylon Yarn / Raw White', products: [
      { name: 'PLAIN', range: '70 TO 390' },
      { name: 'SLUB', range: '70 TO 390' },
      { name: 'NEPS', range: '140 TO 390' },
      { name: 'LONG SLUB', range: '140 TO 390' },
    ]},
    { type: 'Polyester / Cationic', products: [
      { name: 'PLAIN', range: '70 TO 2000' },
      { name: 'SLUB', range: '70 TO 2000' },
    ]},
    { type: 'Cationic / Nylon', products: [
      { name: 'PLAIN', range: '140 TO 400' },
    ]},
  ],
  Texturised: [
    { type: 'Cationic Yarn / Raw White / Grepe / Dyed', products: [
      { name: 'PLAIN', range: '60 TO 1500' },
      { name: 'SLUB', range: '110 TO 1500' },
      { name: 'NEPS', range: '110 TO 1500' },
      { name: 'LONG SLUB', range: '110 TO 1500' },
    ]},
    { type: 'Viscose Yarn / Raw White', products: [
      { name: 'PLAIN', range: '70 TO 350' },
      { name: 'SLUB', range: '150 TO 350' },
    ]},
    { type: 'Polyester / Nylon', products: [
      { name: 'PLAIN', range: '140 TO 1200' },
      { name: 'SLUB', range: '140 TO 1200' },
    ]},
  ],
};

const STRENGTHS = [
  'Leading polyester yarn manufacturer in India',
  'Reliable polyester yarn supplier globally with extensive export markets',
  'Advanced texturizing technology',
  'Trusted yarn supplier in Gujarat',
];

const TECH = [
  'Cutting-edge technology',
  'Air texture | Draw Textured | Draw Twisted Yarn',
  'Functionality: mTec (100% Recycle polyester), mCool (Moisture-wicking functional yarn), mFirxe (Flame retardant functional yarn)',
];

const MAIN_MENU = ['Home', 'About Us', 'Contact Us', 'Blogs', 'CSR', 'Certifications', 'Brochures', 'Careers', 'Terms and Services', 'Privacy Policy'];

const TAB_OPTS: { value: TabKey; label: string }[] = [
  { value: 'Hybrid', label: 'Hybrid Yarn' },
  { value: 'Texturised', label: 'Texturised Yarn' },
];

export default function YarnManufacturingNEW(_props: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;
  const [activeTab, setActiveTab] = useState<TabKey>('Hybrid');

  const factoryImage = (style: any) => (
    <Image source={{ uri: FACTORY_IMAGE }} style={style} resizeMode="cover" />
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.content, { paddingHorizontal: phone ? 12 : 20 }]}
      >
        {/* ============== TITLE BLOCK (legacy hero header) ============== */}
        <View style={[st.card, st.titleCard, !phone && st.rowWide]}>
          <Image
            source={{ uri: HEADER_IMAGE }}
            style={[st.heroImage, phone ? { width: '100%', height: 150 } : { width: 300, height: 150 }]}
            resizeMode="cover"
          />
          <View style={st.titleText}>
            <Text style={[st.brandTitle, !phone && { fontSize: 26 }]}>Madhusudan Threads</Text>
            <Text style={[st.brandTitle, !phone && { fontSize: 26 }]}>Madhusudan Rayons</Text>
            <View style={st.titleDivider} />
            <Text style={st.brandSubtitle}>Leading Yarn Manufacturers in India</Text>
          </View>
        </View>

        {/* ============== COMPANY INTRO + ADDITIONAL INFO ============== */}
        <View style={[st.pair, !phone && st.pairWide]}>
          {/* Madhusudan Threads */}
          <View style={[st.card, st.pairItem, !phone && { flex: 1 }]}>
            <View style={st.introRow}>
              {factoryImage(st.thumb)}
              <View style={st.introContent}>
                <Text style={st.introTitle}>MADHUSUDAN THREADS</Text>
                <Text style={st.bodyText}>
                  <Text style={st.boldText}>Madhusudan Threads</Text>
                  {' '}is a leading name among{' '}
                  <Text style={st.boldText}>yarn manufacturers India</Text>
                  , offering premium{' '}
                  <Text style={st.boldText}>polyester yarn</Text>
                  {' '}and{' '}
                  <Text style={st.boldText}>blended yarn</Text>
                  {' '}manufacturers Surat solutions with consistent quality and scalability. Located just 100 km from Surat and Hazira port, our Navapur plant enables fast export of polyester spun yarns to Asia, Europe, and beyond — making us trusted textile yarn exporters from India for global B2B buyers. As a reliable industrial yarn supplier in Gujarat.
                </Text>
              </View>
            </View>

            {/* Factory Address Card */}
            <View style={st.addressCard}>
              <Text style={st.addressTitle}>Madhusudan Threads</Text>
              <Text style={st.addressLabel}>Factory Address:</Text>
              <Text style={st.addressText}>
                283, Laxmnarayan Industrial Estate, {'\n'}
                N.H. No. 8, Village – Baleeshwar, Tal – Palsana, Dist – Surat, Gujarat
              </Text>

              <View style={st.addressDivider} />

              <View style={st.contactRow}>
                <Icon name="phone" size={16} color="#fff" />
                <Text style={st.contactText}>+ 91 2622 - 265536, 264101</Text>
              </View>
              <View style={st.contactRow}>
                <Icon name="phone-android" size={16} color="#fff" />
                <Text style={st.contactText}>264102 • 91 - 9824210790</Text>
              </View>

              <View style={st.dots}>
                <View style={[st.dot, st.dotActive]} />
                <View style={st.dot} />
                <View style={st.dot} />
              </View>
            </View>
          </View>

          <View style={[st.pairItem, !phone && { flex: 1 }, { gap: 14 }]}>
            {/* Madhusudan Rayons */}
            <View style={st.card}>
              <View style={st.introRow}>
                {factoryImage(st.thumb)}
                <View style={st.introContent}>
                  <Text style={st.sectionHeader}>Madhusudan Rayons (P) Ltd.</Text>
                  <Text style={st.bodyText}>
                    We are a flagship unit of the renowned Madhusudan Group, recognized as and certified by GRS, and ISO, and we are one of the largest and most reputable{' '}
                    <Text style={st.linkText}>yarn dyeing facilities</Text>
                    {' '}in the country. Our commitment to quality, efficiency, and innovation has propelled us to the forefront of the textile industry, earning us a reputation as a dominant force in the market.
                  </Text>
                </View>
              </View>
            </View>

            {/* Key Strengths */}
            <View style={[st.card, !phone && { flexGrow: 1 }]}>
              <Text style={st.strengthsTitle}>Key Strengths</Text>
              {STRENGTHS.map((item, index) => (
                <View key={index} style={st.strengthItem}>
                  <View style={st.bullet} />
                  <Text style={st.strengthText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ============== PRODUCT SECTION ============== */}
        <View style={[st.card, st.productsCard]}>
          <View style={[st.productHead, !phone && st.productHeadWide]}>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={st.smallItalic}>Madhusudan Group</Text>
              <Text style={st.productMainTitle}>Products we{'\n'}Manufacture</Text>
            </View>
            <View style={!phone ? { width: 360 } : null}>
              <Segment<TabKey> value={activeTab} options={TAB_OPTS} onChange={setActiveTab} />
            </View>
          </View>

          <Text style={st.tabDescription}>
            {activeTab === 'Hybrid'
              ? 'Hybrid Yarn Texturised Yarn Manufacturers India'
              : 'Texturised Yarn Manufacturers India'}
          </Text>

          {/* Product Tables */}
          <View style={st.grid}>
            {productData[activeTab].map((group, groupIndex) => (
              <View key={`${activeTab}-${groupIndex}`} style={[st.cell, { width: `${100 / cols}%` as any }]}>
                <View style={st.table}>
                  <View style={st.tableHeader}>
                    <Text style={st.tableHeaderLeft} numberOfLines={1}>Effects</Text>
                    <Text style={st.tableHeaderRight} numberOfLines={1}>Denier Range</Text>
                  </View>

                  {group.products.map((product, pIndex) => (
                    <View key={pIndex} style={[st.tableRow, pIndex % 2 === 0 && st.tableRowAlt]}>
                      <Text style={st.tableRowLeft}>{product.name}</Text>
                      <Text style={st.tableRowRight}>{product.range}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ============== INFRASTRUCTURE SECTION ============== */}
        <View style={st.card}>
          <Text style={st.smallItalic}>Madhusudan Group</Text>
          <Text style={st.infraTitle}>INFRASTRUCTURE</Text>

          <View style={[st.infraRow, !phone && st.rowWide]}>
            <View style={st.infraContent}>
              <Text style={st.bodyText}>
                Madhusudan Threads operates from three locations, Palsana, Silvassa, and Navapur, which are strategically located for easy access to India's textile-rich states of Gujarat and Maharashtra. The Palsana plant is situated at Laxminarayan Industrial Estate, approximately 26 km from Surat, Gujarat. The Silvassa plant is located in the union territory of Dadra & Nagar Haveli while the Navapur plant is merely 100km from Surat & Hazira port.
              </Text>
            </View>
            {factoryImage([st.infraImage, !phone && st.infraImageWide])}
          </View>

          <View style={st.techList}>
            {TECH.map((item, index) => (
              <View key={index} style={st.techItem}>
                <Icon name="check-circle" size={18} color={T.copper} />
                <Text style={st.techText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={[st.infraRow, !phone && st.rowWide, { marginBottom: 0 }]}>
            {factoryImage([st.infraImage, !phone && st.infraImageWide])}
            <View style={st.infraContent}>
              <Text style={st.bodyText}>
                At Madhusudan Rayons, we pride ourselves on our world-class facility that sets the standard for quality, sustainability, and efficiency. With state-of-the-art infrastructure and automated machines, we ensure consistent and flawless output for our valued clients. Our capabilities include dyeing a wide range of natural and blended fibers and yarns, such as cotton, linen, polyester, and more. We prioritize both quality and quantity, delivering the best possible products to our customers.
              </Text>
              <Text style={[st.bodyText, { marginTop: 10 }]}>
                Sustainability is at the core of our operations.{' '}
                <Text style={st.linkText}>We embrace eco-friendly practices</Text>
                , utilizing recyclable materials, minimizing waste, and generating power through steam turbines. Our commitment to sustainability sets us apart and reflects our blend of traditional values and futuristic thinking.
              </Text>
            </View>
          </View>
        </View>

        {/* ============== CONTACT SECTION ============== */}
        <View style={st.contactSection}>
          <View style={st.contactHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.contactTitle}>
                We are here to assist and{'\n'}address your inquiries
              </Text>
            </View>
            {/* inert in legacy as well (no onPress) */}
            <TouchableOpacity style={st.contactUsBtn}>
              <Text style={st.contactUsText}>CONTACT US</Text>
              <Icon name="arrow-downward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={st.contactDivider} />

          <View style={st.footerInfo}>
            <View style={[st.footerCol, !phone && st.footerColWide]}>
              <Text style={st.footerLogo}>madhusudan</Text>
              <Text style={st.footerSince}>SINCE 1975</Text>
              <Text style={st.copyrightText}>© 2025 Madhusudan Group. All rights reserved.</Text>
              <Text style={st.copyrightText}>Developed by SSolutions Mobile App</Text>
            </View>

            <View style={[st.footerCol, !phone && st.footerColWide]}>
              <Text style={st.footerHeading}>Address</Text>
              <Text style={st.footerText}>
                HO-5, Upper Ground, Raghunandan{'\n'}
                Textile Market,{'\n'}
                Ring Road, Surat - 395002
              </Text>
              <Text style={[st.footerHeading, { marginTop: 12 }]}>Follow us</Text>
              <View style={st.socialRow}>
                <Icon name="facebook" size={20} color="#fff" />
                <Icon name="camera-alt" size={20} color="#fff" />
                <Icon name="share" size={20} color="#fff" />
                <Icon name="play-circle-fill" size={20} color="#fff" />
              </View>
            </View>

            <View style={[st.footerCol, !phone && st.footerColWide]}>
              <Text style={st.footerHeading}>Phone</Text>
              <Text style={st.footerText}>+91 8165500100</Text>
              <Text style={[st.footerHeading, { marginTop: 12 }]}>Email</Text>
              <Text style={st.footerText}>
                Interested in working with us?{'\n'}
                inquiry@madhudangroup.com
              </Text>
            </View>

            <View style={[st.footerCol, !phone && st.footerColWide]}>
              <Text style={st.footerHeading}>Main Menu</Text>
              {MAIN_MENU.map((item, idx) => (
                <Text key={idx} style={st.footerLink}>{item}</Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 14, paddingBottom: 30, gap: 14 },
  card: {
    backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, ...S.card,
  },
  rowWide: { flexDirection: 'row', alignItems: 'center', gap: 20 },

  /* title block */
  titleCard: { gap: 14 },
  heroImage: { borderRadius: 10, backgroundColor: T.alt },
  titleText: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  brandTitle: { color: T.ink, fontSize: 22, fontWeight: '800' },
  titleDivider: { width: 60, height: 3, borderRadius: 2, backgroundColor: T.copper, marginVertical: 10 },
  brandSubtitle: { color: T.muted, fontSize: 15, fontWeight: '500' },

  /* intro / info */
  pair: { gap: 14 },
  pairWide: { flexDirection: 'row', alignItems: 'stretch' },
  pairItem: { minWidth: 0 },
  introRow: { flexDirection: 'row', gap: 14 },
  thumb: { width: 110, height: 110, borderRadius: 8, backgroundColor: T.alt },
  introContent: { flex: 1, minWidth: 0 },
  introTitle: { fontSize: 17, fontWeight: '700', color: T.copper, letterSpacing: 1, marginBottom: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: T.copper, marginBottom: 8 },
  bodyText: { fontSize: 13, lineHeight: 20, color: T.ink },
  boldText: { fontWeight: '700', color: T.ink },
  linkText: { color: T.copper, fontWeight: '600', textDecorationLine: 'underline' },

  /* address card */
  addressCard: { backgroundColor: T.nav, borderRadius: 10, padding: 16, marginTop: 16 },
  addressTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  addressLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  addressText: { color: T.border, fontSize: 12, lineHeight: 18 },
  addressDivider: { height: 1, backgroundColor: '#ffffff26', marginVertical: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  contactText: { flex: 1, color: '#fff', fontSize: 12, marginLeft: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff4d', marginHorizontal: 4 },
  dotActive: { backgroundColor: T.copper },

  /* strengths */
  strengthsTitle: { fontSize: 17, fontWeight: '700', color: T.ink, marginBottom: 12 },
  strengthItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.copper, marginTop: 7, marginRight: 10 },
  strengthText: { flex: 1, fontSize: 13, color: T.ink, lineHeight: 20 },

  /* products */
  productsCard: { backgroundColor: T.sub },
  productHead: { gap: 12, marginBottom: 14 },
  productHeadWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  smallItalic: { fontSize: 12, color: T.muted, fontStyle: 'italic' },
  productMainTitle: { fontSize: 26, fontWeight: '800', color: T.ink, lineHeight: 32 },
  tabDescription: { fontSize: 14, fontWeight: '600', color: T.ink, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginHorizontal: -6 },
  cell: { paddingHorizontal: 6, paddingBottom: 12 },
  table: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: T.nav, paddingVertical: 10, paddingHorizontal: 12 },
  tableHeaderLeft: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
  tableHeaderRight: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: T.hair,
  },
  tableRowAlt: { backgroundColor: T.sub },
  tableRowLeft: { flex: 1, fontSize: 12, color: T.ink, fontWeight: '500' },
  tableRowRight: { flex: 1, fontSize: 12, color: T.ink, textAlign: 'right' },

  /* infrastructure */
  infraTitle: { fontSize: 24, fontWeight: '800', color: T.ink, letterSpacing: 2, marginBottom: 16 },
  infraRow: { gap: 14, marginBottom: 16 },
  infraContent: { flex: 1, minWidth: 0 },
  infraImage: { width: '100%', height: 180, borderRadius: 8, backgroundColor: T.alt },
  infraImageWide: { width: '40%', height: 200 },
  techList: { backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.hair, padding: 14, marginBottom: 16 },
  techItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  techText: { flex: 1, fontSize: 13, color: T.ink, marginLeft: 8, lineHeight: 19 },

  /* contact */
  contactSection: { backgroundColor: T.nav, borderRadius: 14, padding: 18 },
  contactHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  contactTitle: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 26 },
  contactUsBtn: {
    flexDirection: 'row', alignItems: 'center', minHeight: 40, borderWidth: 1, borderColor: '#fff',
    borderRadius: 20, paddingHorizontal: 14,
  },
  contactUsText: { color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 6 },
  contactDivider: { height: 1, backgroundColor: '#ffffff33', marginVertical: 18 },
  footerInfo: { flexDirection: 'row', flexWrap: 'wrap' },
  footerCol: { width: '50%', marginBottom: 20, paddingRight: 10 },
  footerColWide: { width: '25%', marginBottom: 0 },
  footerLogo: { color: '#fff', fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  footerSince: { color: T.copper, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginVertical: 4 },
  copyrightText: { color: T.muted, fontSize: 10, marginTop: 4 },
  footerHeading: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  footerText: { color: T.border, fontSize: 11, lineHeight: 17 },
  socialRow: { flexDirection: 'row', marginTop: 8, gap: 12 },
  footerLink: { color: T.border, fontSize: 11, lineHeight: 20 },
});
