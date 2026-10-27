# Mobile dropdown + Add make responsive fix

## ui.tsx
- SelectField list: height ab window height se calculate hoti hai (`listMax`), isliye sheet last option ko cut nahi karti - list scroll karke sab options milte hain.
- Phone par search box auto-focus nahi hota (keyboard half list chhupa deta tha); sirf desktop web par autofocus.
- Sheet body: auto-height sheet me body `flexGrow:0, flexShrink:1` (collapse nahi hoti), `fill` sheet me `flex:1`.
- Phone sheet max height 92%, footer ke neeche extra padding (home-bar / browser bar se buttons na chhupe).

## MakeSheet.tsx (Add make)
- Layout ab sheet ki asli width se decide hota hai: >=520px inner = 3 columns (web/tablet), warna 2 columns (phone).
- Phone: Make name (+ button) full row -> Model full row -> Make code | Status -> Opening qty / Rates 2-2.
- Web/tablet: Make name(2)+Make code(1) -> Model(2)+Status(1) -> rates 3-3.
- Section titles (MAKE & MODEL, QUANTITY & RATES), gutter phone par 10px.
- Logic / API / save payload unchanged.

## Makes & models card (phone)
- Card header phone par stack: title upar, neeche full-width row me 'Show dead' + 'Add make' (button flex). Pehle title 3 lines me tut raha tha aur buttons dab rahe the. (ui.tsx Card `stack` prop, StoreItemMasterScreen.tsx)

## Browse - lazy loading
- api.ts: new `fetchBrowsePage(page, perPage, search)` -> { rows, hasMore, total }. hasMore server meta (last_page / total) se, warna "page full aaya?" se. Server per_page ignore kare (sab rows bhej de) to bhi chalta hai (hasMore=false).
- Phone: sirf 20 rows + "Show more" button (auto-load band, light render). Tablet/desktop: auto-load.
- BrowseSheet.tsx: pehle 50 rows turant, baaki scroll karte waqt (onEndReached) 50-50 karke; footer me "Loading more..." / "Load more" button; count "Showing 50 of 50+ lines".
- Search 400ms debounce ke baad server ko jaata hai (`search` param), poori list download nahi hoti.
- Column / group filter se rows kam dikhein to agle pages apne aap load hote hain.
- Duplicate rows (code + MItmCode) skip; koi page me naya row na mile to loading band.
- Screen: `fetchRows` prop ki jagah `fetchPage`.
- Note: sort / column filter / CSV-PDF export sirf load ho chuki rows par chalte hain.
