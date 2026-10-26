# Responsive Make / Model Master update

- Shared Sheet primitive now uses separate phone, tablet and desktop layout rules.
- Tablet sheets are centered with safe margins rather than behaving like a full-width phone bottom sheet.
- Phone sheets retain a bottom-sheet pattern and use up to 94% of viewport height.
- Make master form padding, field sizing, action buttons, and grid header widths adapt to narrow screens.
- Model list height adapts to viewport height, keeps a bounded scroll area, and preserves FlatList virtualization and persistent scroll indicator.
- Existing API calls and add/modify/delete flow were not intentionally changed.

Run the project's TypeScript/build checks and test add/edit/delete flows against the actual backend before production deployment.

## Model dropdown overlay fix
- The Model Name dropdown is now absolutely positioned below the field and rendered above the browse grid.
- Opening/closing the model list no longer participates in normal layout flow, so it does not reduce the grid's allocated height on mobile, tablet, or web.
- The dropdown toggle remains on the same row as the Model Name field and exposes expanded/collapsed accessibility state.
- The model list retains bounded height, vertical scrolling, and batched FlatList rendering.
- Please verify on target devices and run the project's normal typecheck/build before production deployment.

## Follow-up fix: dropdown was still painted behind the grid
- Fixed the stacking order at the **form section parent**, not just the dropdown itself. React Native Web paints sibling stacking contexts independently, so the grid/search siblings could overlap the model list despite its large z-index.
- While the model dropdown is open, the complete form section now receives a higher `zIndex` and `elevation`; the search row, grid header, and grid list are explicitly kept at the lower stacking level.
- The model list remains absolutely positioned, so it overlays the grid without changing the grid's allocated height. The model toggle remains on the same line as the field.

## Portal overlay fix (follow-up)
- The model dropdown is now rendered in its own transparent `Modal` portal, rather than as an absolutely positioned child inside the form section.
- Its position is measured from the model field, then clamped to the viewport so the list stays visible on phone, tablet, and desktop.
- The dropdown has an opaque background and its own bounded, independently scrollable `FlatList`; the make grid cannot paint through or overlap the dropdown.
- `removeClippedSubviews` is disabled for this small overlay list to avoid web/native clipping inconsistencies. The make browse grid keeps its existing virtualization.
- API and CRUD request flows are unchanged. Run the project's TypeScript/build checks and test on web, Android/iOS, tablet sizes, and the real backend before production rollout.
