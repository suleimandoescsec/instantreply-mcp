# Workflow recipes

Use only returned tools, scopes, and connected accounts. Never ask for passwords, API keys, Meta tokens, or payment details in conversation.

## AI replies to incoming DMs

1. Read `list_channels` and `list_channel_groups`; establish the exact account and approved business brain.
2. Draft two example answers and one human handoff from verified business facts. Confirm tone and ongoing automatic reply behavior.
3. Save the authorized brain, assign its group, enable the group with `update_channel_group`, and enable only the selected account with `set_channel_ai_replies`.
4. Read back group and channel state. Explain how the user can ask to pause that account's AI replies.

## A comment keyword sends a DM

1. Call `get_comment_automation_settings`. Retain all existing rules unless the user specifically authorizes changing them. If the returned rules exceed the tool's accepted maximum or are incomplete, stop before replacement and explain the limitation.
2. Choose one connected Instagram or Facebook account. Obtain the keyword, optional post ID, short public acknowledgement, and private reply content. Use `platforms: ["instagram"]` or `["facebook"]` as appropriate.
3. Preview the keyword matching mode, selected page, post scope, public acknowledgement, and DM. Do not automatically add unrelated contacts or ongoing marketing enrollment.
4. After authorization, append a rule scoped with `integration_id`, `action: "public_reply_plus_dm"`, the approved `phrases`, `publicReply`, and `privateReply`; save the complete preserved array with `set_comment_keyword_rules`. Use an existing matching rule's ID when updating instead of making a duplicate.
5. Read back `get_comment_automation_settings`. Report rule activation separately from provider delivery eligibility. Meta permissions and private-reply limits still apply; do not guarantee every comment can receive a DM.

## AI answers public comments

Teach and verify the selected account's group brain first. Preview examples using tracked comments from `list_comments` and `get_comment`. After explicit authorization, use `set_channel_comment_ai_replies` for that account. Avoid the workspace-wide `set_comment_ai_replies` tool unless the user explicitly selected all pages.

## Incoming DM keyword automation

Read `list_keyword_automations` for the selected `integration_id`. Preview the keyword and exact reply or handoff. Save an inactive rule first using `create_keyword_automation` with `is_active: false` if activation is not yet authorized. Use `update_keyword_automation` after authorization. Reuse a matching rule to avoid duplicate responses and read it back.

## A quiet buyer needs a reminder

Read the actual conversation with `get_conversation` and `list_messages`. Check consent, timing, and the channel's allowed messaging window. Draft the reminder and show who receives it. `propose_follow_up_rule` creates a pending owner approval; it does not activate a rule. If the server requires an owner to approve in Instant Reply, state that handoff honestly. Never work around it by triggering another tool or claim approval was completed in chat.

## Other supported workflows

For journeys/templates, use the appropriate validation tools first and obtain approval before sends or publishing. For analytics use `get_analytics_summary`. For delivery problems use `explain_delivery_failure`. For capabilities outside this file, inspect available tools and their descriptions; do not claim "everything" is supported.

## Hosted lead magnets

Use `list_lead_magnet_sources` and the user's approved source material to ground a guide. `draft_lead_magnet` returns editable content and uses the workspace AI allowance; it does not publish. Call `preview_lead_magnet` with the complete guide, post and keyword to check grounding, conflicts and channel eligibility. Show the page content, public reply and private message before user approval. Only then call `publish_lead_magnet` with the exact reviewed input and `approved: true`. Read `list_lead_magnets` to verify the page and rule are live. Use `pause_lead_magnet` for an authorized pause. These operations require a workspace-wide live connection and do not bypass Meta restrictions.

## Real WhatsApp broadcasts

Read `list_channels` and `list_templates` to select one sending number and template. Use `estimate_broadcast` for a saved audience and provider cost; never claim product subscription prices from provider estimates. Create only a draft with `create_broadcast_draft` after authorization. Use `preflight_broadcast` and show the exact template, number, recipient limit, provider cost, consent requirements and blockers. Do not record opt-in, acknowledge risk or launch on the user's behalf through another tool. After explicit sending authorization, call `launch_broadcast` with the approved recipient limit and `maxEstimatedCostUsd`. The server rechecks limits and refuses missing owner acknowledgments. Use `get_broadcast` to report queued, running and delivered states separately. Never call the legacy generic campaign send endpoint.

## Buyers and journeys

Use `list_pipeline_leads` and `get_pipeline_lead` alongside actual conversation history to explain buying intent. Recorded scores are evidence to review, not guaranteed sales. Read `list_pipeline_stages` before an authorized `move_pipeline_lead` change. For journeys, read `list_journeys` and `get_journey`, preview every template and delay, and obtain authorization before `create_journey`, `replace_journey_steps` or `set_journey_status`. Creating a journey can activate it; do not describe creation as draft-only.

## Interactive workspace

Offer `open_workspace` when the host supports MCP Apps and the user wants a visual view. Its sidebar has only Inbox, Comments and Integrations. Lead magnets live within Comments. Start with one of these sections; guide setup, business-brain teaching, automations, buyers, broadcasts and journeys in conversation one step at a time. Avoid making users navigate a feature dashboard or type technical identifiers when existing records can supply them. Refreshes read the authenticated server's state. Action buttons prepare a reviewed request in the conversation; they do not silently send to customers or publish an asset. Continue with the same tools in conversation if the interface cannot render. Never treat a UI snapshot or a queued result as proof that a customer received a message.

## Pause or change an automation

Identify the same account and rule, read current state, show the intended change, and apply the authorized account-specific toggle or rule update. Do not replace unrelated rules, disable every brand, or erase knowledge as a side effect.


## Clear integration and delivery states

The visual Integrations section uses recognizable Instagram, WhatsApp, Facebook and LinkedIn marks. Only Instagram, WhatsApp Business and Facebook Messenger have connection tools. LinkedIn is labeled unavailable; never promise LinkedIn messaging or invent a connector. Connect buttons call connect_channel for a secure owner browser handoff, then re-read channels after the owner returns. A linked account or an account AI flag does not prove effective brain activation or healthy provider permissions; read channel/group state before enabling ongoing replies.

For public comment replies, the API uses real dashboard comment records and reports provider_confirmed only after the Meta posting path succeeds. A result with state_recorded false means Meta confirmed posting but persistence failed: tell the user to inspect the public thread and do not automatically retry. Failed or ambiguous provider responses never prove publication.
