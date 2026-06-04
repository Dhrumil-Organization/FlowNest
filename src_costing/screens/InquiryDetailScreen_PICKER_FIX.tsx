// ============================================================
// CRITICAL FIX for src/screens/InquiryDetailScreen.tsx
// ============================================================
// PROBLEM: Current "Add Costing" button hardcodes designs[0].id,
//          so only the FIRST design's cost sheet opens.
//          Multi-design inquiries can't cost all designs.
//
// FIX: Navigate to CostSheetDesignPicker which lists all designs
//      with their cost sheet status. User picks each design one
//      by one to fill its cost sheet.
// ============================================================

// ──────────────────────────────────────────────────────────
// FIND THIS in InquiryDetailScreen.tsx (around line 376-388):
// ──────────────────────────────────────────────────────────
//
//   <>
//     {canCost ? (
//       <Button
//         title="Add Costing"
//         onPress={() => navigation.navigate('CostSheet', {
//           inquiryId: inquiry.id,
//           designId: inquiry.designs[0].id, // ← THIS IS THE BUG
//         })}
//       />
//     ) : null}
//   </>
//
// ──────────────────────────────────────────────────────────
// REPLACE WITH:
// ──────────────────────────────────────────────────────────

<>
  {canCost ? (
    <Button
      title="Add Costing"
      onPress={() =>
        navigation.navigate('CostSheetDesignPicker', { id: inquiry.id })
      }
    />
  ) : null}
</>


// ──────────────────────────────────────────────────────────
// ALSO update the existing per-design "View/Edit Cost Sheet"
// button (around line 296-308) — that one is correct, it already
// passes the specific design's id. Leave it as-is.
// ──────────────────────────────────────────────────────────
//
// Current correct code (DO NOT CHANGE):
//
//   <TouchableOpacity
//     style={styles.csOpenBtn}
//     onPress={() => navigation.navigate('CostSheet', {
//       inquiryId: inquiry.id,
//       designId: d.id,    // ← This is right (specific design from loop)
//     })}
//   >
//     <Text style={styles.csOpenText}>
//       {costSheets[d.id]!.auth_status === 'awaiting_auth' ||
//        costSheets[d.id]!.auth_status === 'approved'
//         ? 'View Cost Sheet'
//         : 'Edit Cost Sheet'} →
//     </Text>
//   </TouchableOpacity>
//
// ──────────────────────────────────────────────────────────


// ============================================================
// FLOW EXPLANATION (so you understand the UX):
// ============================================================
//
// Scenario: Inquiry has 3 designs (Design A, B, C)
//
// 1. User taps "Add Costing" on InquiryDetailScreen
//    → Goes to CostSheetDesignPicker
//
// 2. Picker shows:
//    ┌─────────────────────────────────────┐
//    │  0 of 3 approved          [  0% ]   │
//    │  3 pending                          │
//    └─────────────────────────────────────┘
//    [1] Design A    quantity • 3 shades   [Not Started]
//    [2] Design B    quantity              [Not Started]
//    [3] Design C    quantity              [Not Started]
//
// 3. User taps Design A
//    → Goes to CostSheetScreen for Design A
//    → Fills cost sheet, hits "Submit for Auth"
//    → Goes BACK to picker
//
// 4. Picker now shows:
//    ┌─────────────────────────────────────┐
//    │  0 of 3 approved          [  0% ]   │
//    │  2 pending • 1 awaiting auth        │
//    └─────────────────────────────────────┘
//    [1] Design A    ...    [Awaiting Auth]
//    [2] Design B    ...    [Not Started]
//    [3] Design C    ...    [Not Started]
//
// 5. User taps Design B
//    → Repeats. Etc.
//
// 6. When all designs are approved:
//    ┌─────────────────────────────────────┐
//    │  3 of 3 approved          [100% ]   │
//    │  All complete                       │
//    └─────────────────────────────────────┘
//    [✓ All designs costed]
//    [Back to Inquiry]
//
// User goes back → inquiry now in "costed" status → can send quotation.
// ============================================================
