// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/config.ts
//
// App-side settings of the Yarn Vendors AI chat.
//
// The chat goes through the ERP backend like every other screen:
//   POST {API}/api/yarn-vendors-chat   (Bearer token)   — see ./api.ts
// The Claude API key, the model, the answer length and the STRICT RULES
// (what the assistant may talk about) all live on the backend:
//   backend  config/yarnvendorschat.php  -> system_prompt, model, max_tokens
//   backend  .env                        -> ANTHROPIC_API_KEY
// Nothing secret is in the app, and the app can not change the rules.
// ─────────────────────────────────────────────────────────────

/** Backend endpoint (appended to the ERP API host). */
export const CHAT_ENDPOINT = '/api/yarn-vendors-chat';

/** Give up waiting for a reply after this long (backend waits up to 45s for Claude). */
export const CHAT_TIMEOUT_MS = 60000;

/** First message shown in an empty chat (not sent to Claude). */
export const WELCOME_TEXT =
  'Ask anything about yarn vendors — yarn types, quality, rates, terms or how to compare suppliers.';

/** Tap-to-fill suggestions on the empty chat. */
export const SUGGESTIONS = [
  'What should I check before finalising a new yarn vendor?',
  'Compare payment terms I can ask a yarn supplier for',
  'How do I judge quality of 150 denier polyester filament yarn?',
];

/** Only the latest N messages are sent as context (the backend applies the same limit). */
export const MAX_CONTEXT_MESSAGES = 30;
/** Maximum characters in one user message. */
export const MAX_INPUT_CHARS = 2000;
