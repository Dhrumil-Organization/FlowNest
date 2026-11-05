# Property / API / Token fix (NEW ERP + Legacy + Embedded)

sudamo_knits -> https://apig.tms-webapp.com   |   rayons -> https://apiy.tms-webapp.com

## Root cause
1. Two separate copies of dynamicAPI: `common/API/dynamicAPI.ts` and `src/common/API/dynamicAPI.ts`.
   Header switch / login / legacy `initAPI()` updated the root copy, but every NEW ERP production
   component inside `src/` (`import { API } from '../../common/API/dynamicAPI'`) used the src copy,
   which stayed on apig -> Rayons users hit apig until refresh.
2. Production wrappers read token/property only once on mount, and started with token '' / API 'User',
   so the first request could go out wrong.
3. Some files captured the host once at module load (EventNEW/Event api.js, EmployDashboard api.js,
   quarterSummaryApi) or hardcoded apig (DailyCollection/DailyPayment NEW CollectionCard).
4. Tabs keep screens mounted -> re-opening from sidebar/footer showed the old state.

## Fix
- `common/API/dynamicAPI.ts` = single source of truth + change events (`subscribeErpContext`, `getApiBaseUrl`).
- `src/common/API/dynamicAPI.ts` now only re-exports the root file (one live `API` everywhere).
- `src/api/client.ts` `setNewErpProperty` / `initNewErpAPI` also update the shared host (so NEW login,
  property-select, header switch and /embed all sync legacy + NEW together).
- NEW: `src/core/session/erpSession.tsx` -> `useErpSession()`, `<ErpSessionGate>`, `withErpSession()`.
  Screen renders only after correct token + host are loaded; remounts when token changes; re-checks on focus.
- All `src/screens/production/*Screen.tsx` use `<ErpSessionGate>` (same props as before).
- `app/new/(tabs)/_layout.tsx`: every sidebar / footer / More tap opens the screen fresh
  (`screenLayout` key per visit) + `popToTopOnBlur` for nested stacks. router.back / drill-downs unchanged.
- Old `dynamicAPI.tsx` files (had IS_LOCAL = true) renamed to `dynamicAPI_local_old.tsx` —
  DELETE `common/API/dynamicAPI.tsx` and `src/common/API/dynamicAPI.tsx` in your repo.

## Adding a new production screen
```tsx
import { ErpSessionGate } from '../../core/session/erpSession';
export function MyScreen() {
  return <ErpSessionGate>{(s) => <MyComponent token={s.token} username={s.username} API={s.API} />}</ErpSessionGate>;
}
// or: export const MyScreen = withErpSession(MyComponent);
```
Inside components always use `${API}/api/...` from `common/API/dynamicAPI` (or the API prop) — never hardcode apig/apiy
and never copy API into a module-level const.
