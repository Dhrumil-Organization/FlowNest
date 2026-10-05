// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/api.ts
//
// The ONE network call of the Yarn Vendors chat — through the ERP backend,
// with the same Bearer token as every other screen:
//
//   POST {API}/api/yarn-vendors-chat
//   headers  Authorization: Bearer <token>, Content-Type: application/json,
//            Accept: application/json
//   body     { messages: [{ role: 'user' | 'assistant', content: string }] }
//
//   success  { success: true,  response: { reply, stop_reason } }
//   failure  { success: false, message, error_type }           (HTTP 200)
//   HTTP 401 = login expired · HTTP 429 = too many messages (backend throttle)
//
// The backend (YarnVendorsChatController) adds the Claude API key, model and
// the strict rules and calls Claude. Nothing is stored on either side.
// ─────────────────────────────────────────────────────────────
import { CHAT_ENDPOINT, CHAT_TIMEOUT_MS, MAX_CONTEXT_MESSAGES } from './config';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ChatErrorKind = 'not-configured' | 'cancelled' | 'network' | 'timeout' | 'auth' | 'rate-limit' | 'overloaded' | 'server';

export class ChatError extends Error {
  kind: ChatErrorKind;
  constructor(kind: ChatErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** backend error_type -> app error kind */
const KIND_OF: Record<string, ChatErrorKind> = {
  not_configured: 'not-configured',
  timeout: 'timeout',
  network: 'network',
  rate_limit: 'rate-limit',
  overloaded: 'overloaded',
  invalid_request: 'server',
  server: 'server',
};

/**
 * Keep the newest MAX_CONTEXT_MESSAGES turns and drop a leading assistant
 * turn left by the cut (the conversation must start with a user turn).
 */
export function trimContext(turns: ChatTurn[]): ChatTurn[] {
  let list = turns.filter((t) => t.content.trim() !== '').slice(-MAX_CONTEXT_MESSAGES);
  while (list.length > 0 && list[0].role !== 'user') list = list.slice(1);
  return list;
}

/** Send the conversation and return the assistant's reply text. */
export async function sendToClaude(API: string, token: string, turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  if (!API || !token) {
    throw new ChatError('auth', 'Your login session was not found. Please sign in again.');
  }

  const messages = trimContext(turns);

  // Own controller so the timeout and the caller's cancel both stop the request.
  const controller = new AbortController();
  let timedOut = false;
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onOuterAbort);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHAT_TIMEOUT_MS);

  let res: any;
  let text = '';
  try {
    res = await fetch(`${API}${CHAT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (e: any) {
    if (timedOut) throw new ChatError('timeout', 'The AI took too long to answer. Please try again.');
    if (signal?.aborted) throw new ChatError('cancelled', 'Stopped.');
    throw new ChatError('network', 'Could not reach the server. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
  }

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const status = Number(res.status) || 0;
  if (status === 401) {
    throw new ChatError('auth', 'Your login session has expired. Please sign in again.');
  }
  if (status === 429) {
    throw new ChatError('rate-limit', 'You are sending messages too quickly. Please wait a minute and try again.');
  }
  if (status === 404) {
    throw new ChatError('not-configured', 'The AI chat is not available on the server yet. Please contact the administrator.');
  }
  if (!res.ok || !data) {
    throw new ChatError('server', `The server could not answer right now (${status}). Please try again.`);
  }

  if (data.success !== true) {
    throw new ChatError(
      KIND_OF[String(data.error_type || '')] || 'server',
      String(data.message || 'The AI could not answer right now. Please try again.'),
    );
  }

  const reply = String(data?.response?.reply ?? '').trim();
  if (!reply) throw new ChatError('server', 'The AI returned an empty answer. Please try again.');

  // Tell the user when the answer was cut by the length limit instead of
  // letting it look complete.
  return data?.response?.stop_reason === 'max_tokens' ? `${reply}\n\n_(answer cut short — ask me to continue)_` : reply;
}
