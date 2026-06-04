// ============================================================
// PATCHES FOR src/screens/CostingScreen.tsx
// ============================================================
// Goal: Add a "Switch to Cost Sheet (New)" button at the top
// so users can easily move from simple costing to the new method.
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add these imports at the top:
// ──────────────────────────────────────────────────────────
import TourOverlay, {COSTING_TOUR} from '../components/TourOverlay';
import {TouchableOpacity} from 'react-native';

// ──────────────────────────────────────────────────────────
// 2) Add state inside the component:
// ──────────────────────────────────────────────────────────
const [showTour, setShowTour] = useState(false);

// ──────────────────────────────────────────────────────────
// 3) Inside your ScrollView, ABOVE the existing rows, add this banner:
// ──────────────────────────────────────────────────────────

<View style={styles.switchBanner}>
  <View style={{flex: 1}}>
    <Text style={styles.switchTitle}>Need detailed cost breakdown?</Text>
    <Text style={styles.switchSubtitle}>
      Use the new Cost Sheet with greige rate, dyeing, overheads & GM%
    </Text>
  </View>
  <TouchableOpacity
    style={styles.switchBtn}
    onPress={() => {
      if (rows.length > 0) {
        navigation.replace('CostSheet', {
          inquiryId: id,
          designId: rows[0].inquiry_design_id,
        });
      }
    }}>
    <Text style={styles.switchBtnText}>Cost Sheet →</Text>
  </TouchableOpacity>
</View>

{/* Help button at top-right */}
<View style={styles.helpRow}>
  <TouchableOpacity
    onPress={() => setShowTour(true)}
    style={styles.helpBtn}>
    <Text style={styles.helpBtnText}>? Help</Text>
  </TouchableOpacity>
</View>

// ──────────────────────────────────────────────────────────
// 4) Add TourOverlay at end of return (before closing tag):
// ──────────────────────────────────────────────────────────
<TourOverlay
  tourKey="costing"
  steps={COSTING_TOUR}
  visible={showTour}
  onClose={() => setShowTour(false)}
/>

// ──────────────────────────────────────────────────────────
// 5) Add these styles to your styles.create({...}):
// ──────────────────────────────────────────────────────────
  switchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  switchTitle: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: fontSize.xs,
    color: colors.info,
    opacity: 0.85,
  },
  switchBtn: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  switchBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
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
