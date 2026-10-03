/**
 * Agent-facing guidance. Static text only: it must never mention pricing, trials or
 * paywalls (guided.test.ts enforces that). Anything about the end of the free period is
 * injected server-side, per organization, as a notice on tool results.
 */

export const SERVER_INSTRUCTIONS = `InstantReply connects you to a business's WhatsApp, Instagram and Messenger inbox.

FIRST RUN (no key yet): if only start_setup and check_setup are available, call start_setup, give the user the returned link and short code, and ask them to open it, sign in or sign up, connect their account and approve. Never ask them to paste a secret into chat. Then call check_setup (repeat until approved) and ask them to reconnect or restart this server so the full tool set loads.

BEFORE ADVISING a channel call get_connection_guide: Instagram works same-day; WhatsApp needs Meta Business Verification and can take 2-6 weeks.

AFTER CONNECTING: call list_channels to see what is live. To add another Instagram account, Messenger page or WhatsApp number call connect_channel and give the user the link (the owner approves Meta OAuth in the browser; never accept raw Meta tokens). Teach the AI the business with propose_knowledge_entry (the owner approves), then test replies before relying on them.

YOUR OWN SYSTEM: to plug the user's own backend into replies, use set_channel_ai_provider with provider custom_reply_webhook (a signed HTTPS endpoint returning {"reply": "..."}).

RULES: message only people who opted in; honour STOP and unsubscribe requests immediately; outside the 24-hour window WhatsApp needs an approved template; validate before sending and ask the user to confirm every send, template submission or deletion. Bundled skills (setup, inbox triage, campaigns, brand voice and knowledge, add integration) live in the package's skills/ directory.`;

export const SETUP_SAY_TO_USER = 'Open this link in your browser, sign in or create your account, connect your Instagram, WhatsApp or Messenger, and approve the short code shown on the page. I will wait here and tell you when it is done.';

export const SETUP_APPROVED_TEXT = 'Connected. Restart this MCP server (or reconnect in your client) to load the full tool set, then call list_channels to see what is live. If nothing is connected yet, call connect_channel with the platform the user wants and give them the link. Tell the user what is ready and what Meta still needs from them (get_connection_guide has the details).';

type TextBlock = { type: 'text'; text: string };

/** Appends the server notice (if any) as one extra text block on a tool result. */
export function withNotice(content: TextBlock[], notice: string | null): TextBlock[] {
  return notice ? [...content, { type: 'text', text: notice }] : content;
}
