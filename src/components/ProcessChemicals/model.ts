
export type ChemicalRow = {
  id: string;
  itemCode: string;
  itemName: string;
  make: string;
  model: string;
  uom: string;
  qty: number;
  cost: number;
};
export type RecipeGroup = {
  groupCode: string;
  groupName: string;
  calculation: string;
  rows: ChemicalRow[];
};
export type Recipe = {
  recipeNo: string;
  date: string;
  description: string;
  processCode: string;
  processName: string;
  itemCode: string;
  itemName: string;
  location: string;
  pageNo: string;
  groupMode: 'all' | 'selected';
  groups: RecipeGroup[];
  preparedBy: string;
  status: 'Active' | 'Inactive';
  recipeStatus: string;
  approvalDate: string;
  approvedBy: string;
};
export const emptyRecipe = (): Recipe => ({
  recipeNo: '', date: new Date().toLocaleDateString(), description: '',
  processCode: '', processName: '', itemCode: '0', itemName: '',
  location: '', pageNo: '0', groupMode: 'all', groups: [],
  preparedBy: '', status: 'Active', recipeStatus: 'Pending',
  approvalDate: '', approvedBy: '',
});
