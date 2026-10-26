# Make / Model hierarchy update

Updated `MakeMasterSheet.tsx` to display the make master as an expandable hierarchy:

- Rows are grouped by `makeCode` (the API's `MakCode`).
- Each make row displays its code, name, model count, expand/collapse control, and edit action.
- Expanding a make displays its model rows indented below it, including a delete action per model.
- Searching a make (for example, `SKF`) shows that make and its model rows; searching a model filters the matching model rows under the correct make.
- The form separates `MAKE DETAILS` from optional `MODEL DETAILS` so adding a make and adding a model are visually distinct.
- Existing API functions and payload shapes are retained.

Note: this is a frontend hierarchy change and assumes the existing browse API returns the make/model rows and serial numbers correctly. Verify the API's `MakCode`, `MakName`, `Model`, and `SrNo`/`MakSrNo` fields in your environment.
