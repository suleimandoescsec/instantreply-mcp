---
name: instantreply-setup
description: Connect a business's Instagram, WhatsApp or Messenger to InstantReply through one browser link and verify what is live. Use when the user says "connect InstantReply", "set up my inbox", or when only start_setup and check_setup tools are available.
---

# InstantReply setup

Goal: get the user from nothing to a verified, connected channel with the fewest clicks. You never create accounts and never handle secrets; the user does the sign-in and Meta approval in their own browser.

## Rules

- Never ask the user to paste a key, token or password into chat.
- Be honest about timing: Instagram connects same-day; WhatsApp needs Meta Business Verification and can take 2-6 weeks.
- Only connect accounts the user owns or manages. The owner approves Meta OAuth themselves.
- Connecting a channel is not permission to message anyone. Later outreach needs each person's consent and must honour STOP (see skill `instantreply-campaigns`).

## Steps

1. Call `get_connection_guide` and recommend the fastest channel for what the user wants. Say it in one or two sentences.
2. If `start_setup` is available (no key yet), call it with `platform` (instagram, whatsapp, messenger or full) and, if you know it, `persona` (creator, business, developer, agency). Tell the user: open this link, sign in or sign up, connect your account and approve the code shown. Give them the short code.
3. Call `check_setup` with the `device_code`. If it says still waiting, ask the user to finish in the browser and call it again. If it expired or was cancelled, call `start_setup` again.
4. When approved, ask the user to restart or reconnect this MCP server once so every tool loads.
5. Call `list_channels`. Report each account (platform, integration_id, whether AI replies are on). If the account they wanted is missing, call `connect_channel` with the platform and give them the new link.
6. Verify, do not assume: call `get_developer_onboarding` to see what is still missing and tell the user plainly, including anything Meta still needs from them.
7. Offer next steps: teach the AI about the business (skill `instantreply-brand-voice-and-kb`), then triage the inbox (skill `instantreply-inbox-triage`).

## Never

- Send a message to a customer during setup. Setup only connects and verifies.
- Promise WhatsApp is ready before `list_channels` shows it connected and `get_connection_guide` requirements are met.
- Turn AI replies on for a channel (`set_channel_ai_replies`) without the user saying yes.
