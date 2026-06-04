// ============================================================
// PATCHES FOR src/screens/DashboardScreen.tsx
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add these imports at the top:
// ──────────────────────────────────────────────────────────
import TourOverlay, {DASHBOARD_TOUR} from '../components/TourOverlay';
import {settingsApi} from '../services/settingsApi';
import {costSheetApi} from '../services/costSheetApi';

// ──────────────────────────────────────────────────────────
// 2) Add state inside the component:
// ──────────────────────────────────────────────────────────
const [isAuthorizer, setIsAuthorizer] = useState(false);
const [pendingAuth, setPendingAuth] = useState(0);
const [showTour, setShowTour] = useState(false);

// ──────────────────────────────────────────────────────────
// 3) Add useEffect to check permissions on mount:
// ──────────────────────────────────────────────────────────
useEffect(() => {
  (async () => {
    try {
      const perms = await settingsApi.myPermissions();
      setIsAuthorizer(perms.is_authorizer);
      if (perms.is_authorizer) {
        const queue = await costSheetApi.pendingQueue();
        setPendingAuth(queue.counts.pending);
      }
    } catch {
      // ignore
    }
  })();
}, []);

// ──────────────────────────────────────────────────────────
// 4) Update the topBar JSX to add Help + Auth Queue buttons:
// Replace your existing topBar block with:
// ──────────────────────────────────────────────────────────
<View style={styles.topBar}>
  <Text style={styles.headerTitle}>Inquiries</Text>
  <View style={{flexDirection: 'row', gap: spacing.sm}}>
    <TouchableOpacity
      onPress={() => setShowTour(true)}
      style={styles.iconBtn}>
      <Text style={styles.iconBtnText}>?</Text>
    </TouchableOpacity>

    {isAuthorizer ? (
      <TouchableOpacity
        onPress={() => navigation.navigate('AuthQueue')}
        style={[styles.iconBtn, pendingAuth > 0 && styles.iconBtnAlert]}>
        <Text style={styles.iconBtnText}>🔔</Text>
        {pendingAuth > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingAuth}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    ) : null}

    <TouchableOpacity
      onPress={() => navigation.navigate('TatAnalytics')}
      style={styles.iconBtn}>
      <Text style={styles.iconBtnText}>📊</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      style={styles.iconBtn}>
      <Text style={styles.iconBtnText}>⚙</Text>
    </TouchableOpacity>
  </View>
</View>

// ──────────────────────────────────────────────────────────
// 5) Add TourOverlay at the end of your return (just before closing tag):
// ──────────────────────────────────────────────────────────
<TourOverlay
  tourKey="dashboard"
  steps={DASHBOARD_TOUR}
  autoStart
  visible={showTour}
  onClose={() => setShowTour(false)}
/>

// ──────────────────────────────────────────────────────────
// 6) Add these styles to your styles.create({...}):
// ──────────────────────────────────────────────────────────
  iconBtnAlert: {
    backgroundColor: colors.warningBg,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '500',
  },

// ──────────────────────────────────────────────────────────
// 7) Update statusColors in utils/theme.ts to include new states:
// ──────────────────────────────────────────────────────────
export const statusColors: Record<string, {bg: string; fg: string; label: string}> = {
  pending_costing: {bg: colors.warningBg, fg: colors.warning, label: 'Pending Cost'},
  awaiting_auth:   {bg: colors.infoBg, fg: colors.info, label: 'Awaiting Auth'},
  auth_rejected:   {bg: colors.dangerBg, fg: colors.danger, label: 'Auth Rejected'},
  costed:          {bg: colors.successBg, fg: colors.success, label: 'Costed'},
  sent:            {bg: colors.purpleBg, fg: colors.purple, label: 'Sent'},
  confirmed:       {bg: colors.infoBg, fg: colors.info, label: 'Confirmed'},
  rejected:        {bg: colors.dangerBg, fg: colors.danger, label: 'Rejected'},
};

// ──────────────────────────────────────────────────────────
// 8) Update the action button rendering to navigate to CostSheet:
// In renderItem, change the "Add Costing" button to:
// ──────────────────────────────────────────────────────────
// When status is pending_costing or auth_rejected, show:
//   navigation.navigate('CostSheet', {
//     inquiryId: item.id,
//     designId: item.designs[0].id, // or pick the design from a picker
//   })
