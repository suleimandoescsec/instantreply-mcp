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

## Pause or change an automation

Identify the same account and rule, read current state, show the intended change, and apply the authorized account-specific toggle or rule update. Do not replace unrelated rules, disable every brand, or erase knowledge as a side effect.
