// ============================================================
// PATCH for src/screens/CostSheetScreen.tsx
// ============================================================
// After save/submit/etc., user should return to the design picker
// (if they came from there) so they can pick the NEXT design to cost.
//
// React Navigation's goBack() naturally handles this — IF the user
// came from CostSheetDesignPicker. So no change needed for that case.
//
// However, the existing code uses navigation.replace('CostSheet', ...)
// from CostingScreen, which doesn't preserve the back-stack properly.
// We update that too.
// ============================================================

// ──────────────────────────────────────────────────────────
// In CostSheetScreen.tsx, find these places and update:
// ──────────────────────────────────────────────────────────

// 1) After successful submitForAuth — user should go BACK to picker
//    (not stay on this screen). The existing code already does this:
//
//    Alert.alert('Submitted', 'Cost sheet sent for authorization', [
//      {text: 'OK', onPress: () => navigation.goBack()},  ← This is correct
//    ]);
//
//    GoBack works correctly because the back-stack is:
//    InquiryDetail → CostSheetDesignPicker → CostSheet
//    Going back lands on the picker, where user sees updated status.

// 2) After saveDraft — currently just shows Alert. Could optionally
//    add a "Continue to next design?" prompt. Update saveDraft:

const saveDraft = async () => {
  setSaving(true);
  try {
    const saved = await costSheetApi.saveDraft(inquiryId, designId, sheet);
    setSheet(saved);
    Alert.alert(
      'Draft Saved',
      'Cost sheet saved. You can come back and continue anytime.',
      [
        {text: 'Stay Here', style: 'cancel'},
        {text: 'Back to Designs', onPress: () => navigation.goBack()},
      ]
    );
  } catch (e: any) {
    Alert.alert('Error', e?.response?.data?.message || 'Failed to save');
  } finally {
    setSaving(false);
  }
};

// 3) submitSimple (simple costing tab) — already correctly goes back:
//
//    Alert.alert('Saved', 'Simple costing submitted', [
//      {text: 'OK', onPress: () => navigation.goBack()},
//    ]);


// ============================================================
// IMPORTANT NOTE on CostingScreen.tsx (simple costing)
// ============================================================
// In CostingScreen.tsx, the "Switch to Cost Sheet" button currently
// passes designs[0].id. Update it to navigate to the PICKER instead:
//
// FIND (around line 152-160):
//
//   <TouchableOpacity
//     style={styles.switchBtn}
//     onPress={() => {
//       if (rows.length > 0) {
//         navigation.replace('CostSheet', {
//           inquiryId: id,
//           designId: rows[0].inquiry_design_id,  ← BUG: only first
//         });
//       }
//     }}>
//
// REPLACE WITH:
//
//   <TouchableOpacity
//     style={styles.switchBtn}
//     onPress={() => {
//       navigation.replace('CostSheetDesignPicker', { id });
//     }}>
//
// ============================================================
