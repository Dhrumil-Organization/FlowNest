// ============================================================
// PATCHES FOR src/screens/InquiryFormScreen.tsx
// ============================================================
// Goal: Replace single quantity field per design with ShadesSection
//       (allows multiple shades per design with qty + rate + stock).
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add these imports at the top:
// ──────────────────────────────────────────────────────────
import ShadesSection from '../components/ShadesSection';
import TourOverlay, {INQUIRY_FORM_TOUR} from '../components/TourOverlay';
import {shadesApi} from '../services/shadesApi';
import {InquiryShade} from '../types';

// ──────────────────────────────────────────────────────────
// 2) Update your Design row state to include shades:
// ──────────────────────────────────────────────────────────
// In your design row interface (typically at top), add:
//   shades: InquiryShade[];
//
// When adding a new design row (your "addDesign" function),
// initialize shades as an empty array:
//
// const addDesign = () => {
//   setDesigns([
//     ...designs,
//     {
//       design_prp_code: null,
//       design_dsn_code: null,
//       is_new_design: false,
//       design_name_snapshot: '',
//       construction_remarks: '',
//       quantity: 0,
//       unit: 'mtr',
//       expected_delivery_date: '',
//       gst_percent: 5,
//       shades: [],  // NEW: empty shades array
//     },
//   ]);
// };

// ──────────────────────────────────────────────────────────
// 3) Add state for tour:
// ──────────────────────────────────────────────────────────
const [showTour, setShowTour] = useState(false);

// ──────────────────────────────────────────────────────────
// 4) In your designs map/render section, REPLACE the single
//    "quantity" input field with the ShadesSection component:
//
//    BEFORE (somewhere you have):
//    <TextInput
//      value={String(design.quantity)}
//      onChangeText={(t) => updateDesign(index, {quantity: parseFloat(t) || 0})}
//      ...
//    />
//
//    AFTER:
// ──────────────────────────────────────────────────────────
<ShadesSection
  shades={design.shades || []}
  onChange={(newShades) =>
    updateDesign(index, {
      shades: newShades,
      // Auto-update design's quantity from shades total
      quantity: newShades.reduce((s, sh) => s + (sh.quantity || 0), 0),
    })
  }
  showStock={true}
/>

// ──────────────────────────────────────────────────────────
// 5) Make delivery date REQUIRED and visible:
//    In your existing delivery date field, just add asterisk
//    and a validation in handleSave:
// ──────────────────────────────────────────────────────────
// Validation:
//   if (!design.expected_delivery_date) {
//     Alert.alert('Missing', `Delivery date required for design #${index + 1}`);
//     return;
//   }

// ──────────────────────────────────────────────────────────
// 6) After saving an inquiry, also save shades for each design:
//    In your handleSave function, AFTER the inquiry is created,
//    save shades for each design:
// ──────────────────────────────────────────────────────────
// Example:
//   const result = await inquiryApi.create(payload);
//   // After save, persist shades
//   if (result.designs) {
//     for (let i = 0; i < result.designs.length; i++) {
//       const savedDesign = result.designs[i];
//       const localDesign = designs[i];
//       if (localDesign?.shades && localDesign.shades.length > 0) {
//         await shadesApi.save(
//           savedDesign.id,
//           localDesign.shades.map(s => ({
//             shade_name: s.shade_name,
//             shade_code: s.shade_code || undefined,
//             quantity: s.quantity,
//             rate: s.rate || undefined,
//           })),
//         );
//       }
//     }
//   }

// ──────────────────────────────────────────────────────────
// 7) Add Help button at top of form:
// ──────────────────────────────────────────────────────────
<View style={styles.helpRow}>
  <TouchableOpacity
    onPress={() => setShowTour(true)}
    style={styles.helpBtn}>
    <Text style={styles.helpBtnText}>? Help</Text>
  </TouchableOpacity>
</View>

// ──────────────────────────────────────────────────────────
// 8) Add TourOverlay at end of return:
// ──────────────────────────────────────────────────────────
<TourOverlay
  tourKey="inquiry_form"
  steps={INQUIRY_FORM_TOUR}
  visible={showTour}
  onClose={() => setShowTour(false)}
/>

// ──────────────────────────────────────────────────────────
// 9) Styles to add:
// ──────────────────────────────────────────────────────────
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  helpBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
  },
  helpBtnText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
