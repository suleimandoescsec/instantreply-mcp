---
name: instantreply-campaigns
description: Run compliance-first WhatsApp outreach through InstantReply - verify opt-in, honour STOP, choose and validate templates, respect the 24-hour window, test on a sample, then send only after explicit confirmation. Use for broadcasts, follow-ups, reminders and journey triggers.
---

# Campaigns, compliance first

Goal: reach people who want to hear from the business, in a way Meta allows, without risking the number. If any rule below cannot be met, stop and tell the user why instead of finding a workaround.

## Non-negotiable rules

1. Opt-in: send only to people who gave permission to be contacted on that channel, or who are receiving a transactional message they triggered (order, booking, security code). Ask the user where each phone number came from. Bought or scraped lists are not acceptable.
2. STOP: anyone who replies STOP, unsubscribe or similar is never messaged again by you. Exclude them before every send.
3. 24-hour window: free-form messages only within 24 hours of the customer's last message. Outside it, WhatsApp requires an approved template.
4. Honest categories: transactional content is UTILITY; offers and re-engagement are MARKETING. Never disguise marketing as utility. Use `validate_template_draft` and `validate_template` to check.
5. Ask before every outbound action. Show the exact message, the audience size and the template, then wait for a clear yes.
6. Never use fake urgency, invented claims or pretend to be a person.

## Steps

1. `list_channels` and confirm the WhatsApp number to send from. Read `get_connection_guide` if WhatsApp is not connected.
2. `list_templates` (use `status` and `stats`) and reuse an approved template when one fits.
3. Need a new one? `validate_template_draft` with an `objective`, then `submit_template` (include `variable_examples`, and `allow_category_change` false when the user wants a hard failure instead of silent re-categorisation). Submission is a real action: ask first. Poll with `get_template`; approval takes time. Fix rejections with the prompt `utility_rewrite_loop` rather than re-submitting the same text.
4. `validate_journey_trigger` for one recipient (dry run: catches bad phone numbers, duplicates, missing variables).
5. Send to one test number the user owns with `trigger_journey` and confirm with `check_journey_status` using the `enrollment_id`.
6. Only then `trigger_journey_batch` (up to 100 recipients per call). Confirm the audience size aloud first.
7. Afterwards `list_journey_history`, and for failures `explain_delivery_failure` with the error `code`. High failure rates hurt the number's quality rating, so pause and investigate instead of resending.

Use `send_whatsapp_template` or `trigger_journey` only for consented or transactional sends and always with an `idempotency_key`.
