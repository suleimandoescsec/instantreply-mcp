---
name: instantreply-add-integration
description: Add the user's own system or another social account to InstantReply - a signed custom reply webhook on one channel or group, more connected accounts, and where webhooks for events live. Use when the user wants the AI to look up their orders, stock, CRM or bookings, or to connect more channels.
---

# Add your own integration

Be precise about what exists. Today the MCP tools support exactly these paths; do not promise others.

## A. Your backend answers customers (custom reply webhook)

`set_channel_ai_provider` with `provider` set to `custom_reply_webhook`, on exactly one `integration_id` (a channel) or one `group_id` (a channel group). A channel setting overrides its group setting.

- `config`: an HTTPS `url` (no credentials, query string or fragment), `timeout_ms` 1000-10000, and the booleans `send_knowledge_context`, `send_conversation_history`, `send_verified_tool_context`.
- `secret`: 8 or more characters, used to sign requests. Let the user generate and store it; do not ask them to paste it into chat if they can set it themselves. It is encrypted and never returned.
- Requests carry `X-InstantReply-Timestamp` and `X-InstantReply-Signature: sha256=` plus HMAC-SHA256 of timestamp, a dot, and the raw JSON body. The endpoint must verify the signature, reject old timestamps, and return JSON `{"reply": "..."}` quickly.
- Replies still pass grounding and fake-action checks, so the endpoint cannot make the AI claim things it cannot back up.

Steps: `list_channels` and `list_channel_groups` to choose the target; `list_channel_ai_providers` to see what is set; confirm with the user; call `set_channel_ai_provider`; test with a message from a number the user owns; remove with `delete_channel_ai_provider` if it misbehaves.

## B. More social accounts

`connect_channel` with `platform` instagram, messenger or whatsapp returns a secure link. A workspace owner opens it and approves Meta OAuth. Never request or accept raw Meta access tokens. Afterwards `list_channels` to confirm, and optionally `assign_channel_group`.

## C. Events pushed to your server

Signed outbound webhooks are created through the REST API (`/v1/webhooks`) or the dashboard. There is no MCP tool for this yet; say so and point the user to https://instantreply.co/developers.

## D. Keyword automations

For simple no-code rules on one channel use `list_keyword_automations` and `create_keyword_automation` with `integration_id`, `trigger_type` and `trigger_value`.

## Compliance

Automated or webhook-driven messages follow the same rules as any send: only people who opted in, honour STOP immediately, respect the 24-hour window. Never build an integration that messages people without permission.
