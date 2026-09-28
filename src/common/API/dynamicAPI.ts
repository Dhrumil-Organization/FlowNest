// ─────────────────────────────────────────────────────────────
// Re-export of the ONE shared dynamic API module (root common/API/dynamicAPI.ts).
//
// Do NOT put state in this file. Previously this was a full copy with its own
// `API` variable, so switching property updated the root copy while every
// screen inside `src/` that imports `../../common/API/dynamicAPI` kept the old
// host (apig for Rayons users) until a full refresh. Re-exporting keeps a
// single live `API` binding for Legacy, NEW ERP and embedded screens.
// ─────────────────────────────────────────────────────────────
export * from '../../../common/API/dynamicAPI';
