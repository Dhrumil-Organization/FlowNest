
/**
 * Process Chemicals API adapter.
 *
 * Keep endpoint names and payload mapping in this file so they can be aligned
 * with the Laravel controller without changing the screen. Expected routes:
 * GET  /api/process-chemicals/browse
 * GET  /api/process-chemicals/show/{recipeNo}
 * POST /api/process-chemicals/save
 * POST /api/process-chemicals/delete
 * GET  /api/process-chemicals/recipe-groups
 */
import axios from 'axios';
import type { Recipe } from './model';

const BASE = '/api/process-chemicals';
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
});
const unwrap = (d: any) => d?.data?.data ?? d?.data?.response?.data ?? d?.data ?? [];
export async function browseRecipes(API: string, token: string) {
  const r = await axios.get(`${API}${BASE}/browse`, { headers: headers(token) });
  return unwrap(r);
}
export async function getRecipe(API: string, token: string, recipeNo: string) {
  const r = await axios.get(`${API}${BASE}/show/${encodeURIComponent(recipeNo)}`, { headers: headers(token) });
  return unwrap(r);
}
export async function saveRecipe(API: string, token: string, recipe: Recipe, mode: 'add'|'modify') {
  const r = await axios.post(`${API}${BASE}/save`, { ...recipe, mode }, { headers: headers(token) });
  return unwrap(r);
}
export async function deleteRecipe(API: string, token: string, recipeNo: string) {
  const r = await axios.post(`${API}${BASE}/delete`, { recipeNo }, { headers: headers(token) });
  return unwrap(r);
}
export async function loadRecipeGroups(API: string, token: string, processCode: string, itemCode: string) {
  const r = await axios.get(`${API}${BASE}/recipe-groups`, { params: { processCode, itemCode }, headers: headers(token) });
  return unwrap(r);
}
