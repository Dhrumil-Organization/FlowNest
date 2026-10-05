# Yarn Vendors — connecting the chat to Claude

The Yarn Vendors screen (`src/components/YarnVendorsNEW`) talks to Claude through the **Claude API**.

## Two things to know first
1. **A claude.ai chat account (Free or Pro) can not be connected to an app.** The API is a separate product:
   create an account at https://platform.claude.com, add billing/credit, and create an **API key**.
   It is charged per use (per message length), not a monthly plan.
2. **An API key inside the app is not secure.** An APK or the web bundle can be opened and the key copied,
   then anyone can spend your credit. So the key has to sit somewhere outside the app. That does not need to be
   the ERP backend — the small function in this folder is enough.

## Option A — secure (use this for the real app)
`worker.js` is a ready Cloudflare Worker (free plan). It holds the key, forces the model, the answer length and
the strict chat rules, and forwards the chat to Claude. It stores nothing.

1. Cloudflare dashboard -> Workers & Pages -> Create -> Worker -> paste `worker.js` -> Deploy.
2. Worker -> Settings -> Variables and Secrets:
   - `ANTHROPIC_API_KEY` (Secret) = your API key
   - `APP_KEY` (Secret, optional) = any long random text
   - `ALLOWED_ORIGINS` (optional) = your web ERP address, e.g. `https://erp.example.com`
3. In the app's `.env.local` (already git-ignored in this repo; plain `.env` is NOT), then rebuild:
   ```
   EXPO_PUBLIC_YARN_VENDORS_PROXY_URL=https://<your-worker>.workers.dev
   EXPO_PUBLIC_YARN_VENDORS_APP_KEY=<same value as APP_KEY, if you set one>
   ```
   `mode` in `config.ts` is already `'proxy'`.
4. In the Claude Console set a **monthly spend limit** on the workspace.

What this protects: the API key is never in the app, and nobody can change the rules/model/length.
What it does not do: it does not know WHICH ERP user is calling (that would need your ERP backend to verify the
login token). `APP_KEY` sits inside the app too, so treat it as a speed-bump, not a lock. The spend limit and
Cloudflare's rate limiting (Security -> WAF -> Rate limiting rules) are the real protection against misuse.

## Option B — direct (testing on your own device only)
In `config.ts` set `mode: 'direct'` and put the key in `.env.local`:
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```
The key is bundled into the app. Never publish a build made this way.

## Changing the strict rules
Edit `CHAT_RULES` in `src/components/YarnVendorsNEW/config.ts` **and** `SYSTEM_PROMPT` in `worker.js`
(same text). With the proxy, the worker's copy is the one that is enforced.

## Model
Default is `claude-haiku-4-5-20251001` (fast, lowest cost). For better answers change `MODEL` in `worker.js`
(and `model` in `config.ts` for direct mode) to `claude-sonnet-5-5`.
