import { z } from 'zod';
import type { InstantReplyClient } from './client.js';

function providerScopePath(groupId?: string, integrationId?: string): string {
  if (Boolean(groupId) === Boolean(integrationId)) throw new Error('Provide exactly one of group_id or integration_id');
  return groupId ? `/channels/groups/${groupId}/providers` : `/channels/${integrationId}/providers`;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  readOnly: boolean;
  destructive: boolean;
  handler: (client: InstantReplyClient, input: any) => Promise<unknown>;
}

export const tools: Tool[] = [
  {
    name: 'list_conversations',
    description: 'List inbox conversations. Filter by status (active/closed/pending), platform (instagram/whatsapp/messenger), or assignee.',
    inputSchema: z.object({
      status:      z.enum(['active', 'closed', 'pending']).optional(),
      platform:    z.enum(['instagram', 'whatsapp', 'messenger']).optional(),
      assignee_id: z.string().uuid().optional(),
      limit:       z.number().int().min(1).max(100).default(20),
      cursor:      z.string().optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams();
      if (input.status)      params.set('status',      input.status);
      if (input.platform)    params.set('platform',    input.platform);
      if (input.assignee_id) params.set('assignee_id', input.assignee_id);
      if (input.limit)       params.set('limit',       String(input.limit));
      if (input.cursor)      params.set('cursor',      input.cursor);
      return client.get(`/conversations?${params}`);
    },
  },

  {
    name: 'get_conversation',
    description: 'Get a single conversation by ID, including customer details and last message.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Conversation ID'),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/conversations/${input.id}`),
  },

  {
    name: 'list_messages',
    description: 'List messages in a conversation. Returns most recent first.',
    inputSchema: z.object({
      conversation_id: z.string().uuid(),
      limit:           z.number().int().min(1).max(100).default(50),
      cursor:          z.string().optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams({ limit: String(input.limit) });
      if (input.cursor) params.set('cursor', input.cursor);
      return client.get(`/conversations/${input.conversation_id}/messages?${params}`);
    },
  },

  {
    name: 'send_message',
    description: 'Send text or an HTTPS-hosted image, document, audio, or video attachment in a conversation on Instagram, WhatsApp, or Messenger (messages:send). Attachment type is `media.type`; provider format/size limits still apply. Optional buttons create native quick replies; WhatsApp uses interactive reply buttons (1–3) or a list (4–10). Optional HTTPS CTA URL creates a WhatsApp URL button and a plain link fallback elsewhere. WhatsApp free-form sends require the open 24-hour customer-service window; outside it use an approved template. Specify integration_id for the account. Reuse idempotency_key on retry to avoid duplicate sends.',
    inputSchema: z.object({
      conversation_id: z.string().uuid(),
      content:         z.string().min(1).max(4096).describe('Message text content'),
      media: z.object({
        type: z.enum(['image', 'document', 'audio', 'video']),
        url: z.string().url().refine((value) => value.startsWith('https://'), 'Media URL must use HTTPS'),
        caption: z.string().max(1024).optional(),
        filename: z.string().max(255).optional(),
      }).strict().optional(),
      buttons: z.array(z.string().trim().min(1).max(20)).min(1).max(10).optional().describe('Optional tappable reply choices. One to three become buttons; four to ten become a list or platform quick replies. The text must still make sense without tapping.'),
      cta_url: z.object({ url: z.string().url().refine((value) => value.startsWith('https://'), 'CTA URL must use HTTPS'), display_text: z.string().trim().min(1).max(20) }).optional(),
      integration_id:  z.string().uuid().optional().describe('Connected account ID from list_channels'),
      idempotency_key: z.string().min(1).max(200).regex(/^[\x21-\x7e]+$/).optional().describe('Visible ASCII, up to 200 characters; reuse on retry'),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.post(`/conversations/${input.conversation_id}/messages`, {
        content:      input.content,
        ...(input.media ? { media: input.media } : {}),
        ...(input.buttons ? { buttons: input.buttons } : {}),
        ...(input.cta_url ? { cta_url: input.cta_url } : {}),
        ...(input.integration_id ? { integration_id: input.integration_id } : {}),
      }, undefined, { 'Idempotency-Key': input.idempotency_key ?? globalThis.crypto.randomUUID() }),
  },

  {
    name: 'react_to_message',
    description: 'Add, change, or remove a reaction on an inbound WhatsApp message. Pass an empty emoji to remove it. The provider message ID must still be reactable; Meta can reject old messages or unsupported symbols. Instagram and Messenger reactions are not exposed through this API yet.',
    inputSchema: z.object({
      message_id: z.string().uuid().describe('InstantReply inbound message ID from list_messages'),
      emoji: z.string().max(8).describe('Single emoji, for example ❤️, or empty string to clear the reaction'),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post(`/messages/${input.message_id}/reaction`, { emoji: input.emoji }),
  },

  {
    name: 'assign_conversation',
    description: 'Assign or unassign a conversation to a team member. Pass null to unassign.',
    inputSchema: z.object({
      conversation_id: z.string().uuid(),
      assignee_id:     z.string().uuid().nullable(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.patch(`/conversations/${input.conversation_id}`, { assignee_id: input.assignee_id }),
  },

  {
    name: 'close_conversation',
    description: 'Close an active conversation.',
    inputSchema: z.object({
      conversation_id: z.string().uuid(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.patch(`/conversations/${input.conversation_id}`, { status: 'closed' }),
  },

  {
    name: 'list_contacts',
    description: 'List contacts (leads) in the workspace. Filter by platform.',
    inputSchema: z.object({
      platform: z.enum(['instagram', 'whatsapp', 'messenger']).optional(),
      limit:    z.number().int().min(1).max(100).default(20),
      cursor:   z.string().optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams({ limit: String(input.limit) });
      if (input.platform) params.set('platform', input.platform);
      if (input.cursor)   params.set('cursor', input.cursor);
      return client.get(`/contacts?${params}`);
    },
  },

  {
    name: 'get_contact',
    description: 'Get a single contact by ID.',
    inputSchema: z.object({ id: z.string().uuid() }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/contacts/${input.id}`),
  },

  {
    name: 'update_contact',
    description: 'Update a contact name or lead stage.',
    inputSchema: z.object({
      id:                z.string().uuid(),
      name:              z.string().min(1).optional(),
      email:             z.string().email().nullable().optional(),
      lead_stage:        z.string().optional(),
      lead_temperature:  z.string().optional(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => {
      const { id, ...body } = input;
      return client.patch(`/contacts/${id}`, body);
    },
  },

  {
    name: 'list_channels',
    description: 'List every connected account (each Instagram account, WhatsApp number, and Facebook Messenger page) with its integration_id, group, and AI-reply status. Use the exact integration_id when sending to avoid selecting the wrong business account.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/channels'),
  },

  {
    name: 'list_channel_groups',
    description: 'List channel groups and their independent AI brain configuration. A channel group shares its own business facts, FAQs, reply style, and group-scoped knowledge across assigned channels.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/channels/groups'),
  },

  {
    name: 'connect_channel',
    description: 'Create a secure browser handoff for an owner to connect another Instagram account, Facebook Messenger Page, or WhatsApp Business number. Opening the link and approving Meta OAuth requires an authorized workspace user; never ask for or accept raw Meta access tokens.',
    inputSchema: z.object({ platform: z.enum(['instagram', 'messenger', 'whatsapp']) }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/channels/connect-sessions', input),
  },

  {
    name: 'create_channel_group',
    description: 'Create an AI brain group. Assign one or more connected accounts with assign_channel_group; a one-account group gives that account a dedicated brain. OAuth connection must be completed by a workspace owner in the browser.',
    inputSchema: z.object({
      name: z.string().trim().min(1).max(80),
      ai_enabled: z.boolean().default(true),
      brain_config: z.object({
        business_name: z.string().max(200).optional(),
        tone: z.enum(['professional', 'friendly', 'casual', 'custom']).optional(),
        language: z.string().min(2).max(24).optional(),
        custom_prompt: z.string().max(5000).optional(),
        company_info: z.string().max(10000).optional(),
        faqs: z.string().max(10000).optional(),
        important_links: z.string().max(5000).optional(),
        additional_context: z.string().max(5000).optional(),
        preferred_phrases: z.array(z.string().max(120)).max(30).optional(),
        banned_words: z.array(z.string().max(80)).max(50).optional(),
        emoji_usage: z.enum(['never', 'sparingly', 'often']).optional(),
        platform_prompts: z.object({ instagram: z.string().max(5000).optional(), messenger: z.string().max(5000).optional(), whatsapp: z.string().max(5000).optional() }).strict().optional(),
        enabled_platforms: z.object({ instagram: z.boolean().optional(), messenger: z.boolean().optional(), whatsapp: z.boolean().optional() }).strict().optional(),
      }).strict().default({}),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/channels/groups', input),
  },

  {
    name: 'update_channel_group',
    description: 'Update a group name, switch that group brain on/off, or change its AI reply settings. The configuration is applied to every assigned channel.',
    inputSchema: z.object({
      group_id: z.string().uuid(),
      name: z.string().trim().min(1).max(80).optional(),
      ai_enabled: z.boolean().optional(),
      brain_config: z.object({
        business_name: z.string().max(200).optional(),
        tone: z.enum(['professional', 'friendly', 'casual', 'custom']).optional(),
        language: z.string().min(2).max(24).optional(),
        custom_prompt: z.string().max(5000).optional(),
        company_info: z.string().max(10000).optional(),
        faqs: z.string().max(10000).optional(),
        important_links: z.string().max(5000).optional(),
        additional_context: z.string().max(5000).optional(),
        preferred_phrases: z.array(z.string().max(120)).max(30).optional(),
        banned_words: z.array(z.string().max(80)).max(50).optional(),
        emoji_usage: z.enum(['never', 'sparingly', 'often']).optional(),
        platform_prompts: z.object({ instagram: z.string().max(5000).optional(), messenger: z.string().max(5000).optional(), whatsapp: z.string().max(5000).optional() }).strict().optional(),
        enabled_platforms: z.object({ instagram: z.boolean().optional(), messenger: z.boolean().optional(), whatsapp: z.boolean().optional() }).strict().optional(),
      }).strict().optional(),
    }).strict(),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => {
      const { group_id, ...body } = input;
      return client.patch(`/channels/groups/${group_id}`, body);
    },
  },

  {
    name: 'assign_channel_group',
    description: 'Assign one connected account to a channel group, or pass null to use the workspace AI brain. Use list_channels and list_channel_groups first. Each connected account belongs to at most one group.',
    inputSchema: z.object({
      integration_id: z.string().uuid(),
      group_id: z.string().uuid().nullable(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.patch(`/channels/${input.integration_id}`, { channel_group_id: input.group_id }),
  },

  {
    name: 'list_channel_group_knowledge',
    description: 'List verified business knowledge scoped to one channel group. Assigned channels use only their group knowledge and group brain settings; ungrouped channels use workspace knowledge.',
    inputSchema: z.object({ group_id: z.string().uuid() }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/channels/groups/${input.group_id}/knowledge`),
  },

  {
    name: 'add_channel_group_knowledge',
    description: 'Add a FAQ, product, policy, or general fact to one group brain. Entries are prompt-injection scanned and retrieved only for channels assigned to this group. Use this to keep different brands/accounts from sharing private facts.',
    inputSchema: z.object({
      group_id: z.string().uuid(),
      type: z.enum(['faq', 'product', 'policy', 'general']),
      title: z.string().trim().min(1).max(200),
      content: z.string().trim().min(1).max(100000),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => {
      const { group_id, ...body } = input;
      return client.post(`/channels/groups/${group_id}/knowledge`, body);
    },
  },

  {
    name: 'delete_channel_group_knowledge',
    description: 'Delete one knowledge entry from a group brain. This cannot be undone.',
    inputSchema: z.object({ group_id: z.string().uuid(), entry_id: z.string().uuid() }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.delete(`/channels/groups/${input.group_id}/knowledge/${input.entry_id}`),
  },

  {
    name: 'list_channel_ai_providers',
    description: 'List provider connections configured for exactly one group or channel. Secret values are never returned. Channel settings override group settings; group settings are shared by assigned accounts.',
    inputSchema: z.object({ group_id: z.string().uuid().optional(), integration_id: z.string().uuid().optional() }).strict(),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(providerScopePath(input.group_id, input.integration_id)),
  },

  {
    name: 'set_channel_ai_provider',
    description: 'Configure ElevenLabs voice synthesis or a custom reply webhook for exactly one group or channel. ElevenLabs config supports voice_id, model_id, MP3 output_format, voice_settings (stability/similarity_boost/style 0–1, use_speaker_boost, speed 0.7–1.2), language_code, apply_text_normalization auto/on/off, apply_language_text_normalization, uint32 seed, up to 3 pronunciation_dictionary_locators {pronunciation_dictionary_id, version_id}, plus secret (API key). Webhook config: HTTPS url, timeout_ms 1000–10000, send_knowledge_context, send_conversation_history, and send_verified_tool_context booleans, plus secret (HMAC signing key). Signed request headers are X-InstantReply-Timestamp and X-InstantReply-Signature: sha256=HMAC-SHA256(secret, timestamp + "." + raw JSON body). Endpoint returns JSON {reply:string}. Secrets are encrypted at rest and never returned; webhook requests carry bounded history/context. Replies still pass grounding and fake-action checks. A channel provider overrides its group provider.',
    inputSchema: z.object({
      group_id: z.string().uuid().optional(),
      integration_id: z.string().uuid().optional(),
      provider: z.enum(['elevenlabs_tts', 'custom_reply_webhook']),
      enabled: z.boolean().default(true),
      config: z.union([
        z.object({
          voice_id: z.string().min(1).max(128),
          model_id: z.string().min(1).max(128).default('eleven_multilingual_v2'),
          output_format: z.enum(['mp3_22050_32', 'mp3_44100_128']).default('mp3_44100_128'),
          language_code: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
          apply_text_normalization: z.enum(['auto', 'on', 'off']).default('auto'),
          apply_language_text_normalization: z.boolean().default(false),
          seed: z.number().int().min(0).max(4294967295).optional(),
          pronunciation_dictionary_locators: z.array(z.object({ pronunciation_dictionary_id: z.string().min(1).max(128), version_id: z.string().min(1).max(128) }).strict()).max(3).optional(),
          voice_settings: z.object({ stability: z.number().min(0).max(1).optional(), similarity_boost: z.number().min(0).max(1).optional(), style: z.number().min(0).max(1).optional(), use_speaker_boost: z.boolean().optional(), speed: z.number().min(0.7).max(1.2).optional() }).strict().optional(),
        }).strict(),
        z.object({ url: z.string().url().refine((value) => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; }, 'Use an HTTPS URL without embedded credentials, query parameters, or fragments.'), timeout_ms: z.number().int().min(1000).max(10000).default(5000), send_knowledge_context: z.boolean().default(true), send_conversation_history: z.boolean().default(true), send_verified_tool_context: z.boolean().default(true) }).strict(),
      ]),
      secret: z.string().min(8).max(512).optional(),
    }).strict(),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => {
      const { group_id, integration_id, provider, ...body } = input;
      const base = providerScopePath(group_id, integration_id);
      return client.put(`${base}/${provider}`, body);
    },
  },

  {
    name: 'delete_channel_ai_provider',
    description: 'Remove an ElevenLabs or custom reply provider override from exactly one group or channel. If deleting a channel override, that channel inherits its group provider again.',
    inputSchema: z.object({ group_id: z.string().uuid().optional(), integration_id: z.string().uuid().optional(), provider: z.enum(['elevenlabs_tts', 'custom_reply_webhook']) }).strict(),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.delete(`${providerScopePath(input.group_id, input.integration_id)}/${input.provider}`),
  },

  {
    name: 'get_analytics_summary',
    description: 'Get inbox analytics: message volume, response times, AI usage, conversion stats.',
    inputSchema: z.object({
      start_date: z.string().describe('ISO date e.g. 2025-01-01').optional(),
      end_date:   z.string().describe('ISO date e.g. 2025-01-31').optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams();
      if (input.start_date) params.set('start_date', input.start_date);
      if (input.end_date)   params.set('end_date',   input.end_date);
      return client.get(`/analytics/summary?${params}`);
    },
  },

  {
    name: 'get_usage',
    description: 'Get API usage stats for the current workspace: request counts, error rates, top endpoints.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(90).default(30),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/usage?days=${input.days}`),
  },

  {
    name: 'list_templates',
    description: 'List WhatsApp templates with status, category, language, components, and optional usage stats. Use this before recommending sends or cleanup.',
    inputSchema: z.object({
      status: z.enum(['APPROVED', 'PENDING', 'REJECTED', 'PAUSED']).optional(),
      category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']).optional(),
      channel_id: z.string().uuid().optional(),
      stats: z.boolean().default(false),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams();
      if (input.status) params.set('status', input.status);
      if (input.category) params.set('category', input.category);
      if (input.channel_id) params.set('channel_id', input.channel_id);
      if (input.stats) params.set('stats', 'true');
      return client.get(`/templates?${params}`);
    },
  },

  {
    name: 'get_template',
    description: 'Get one stored WhatsApp template by InstantReply template ID.',
    inputSchema: z.object({
      id: z.string().uuid(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/templates/${input.id}`),
  },

  {
    name: 'validate_template_draft',
    description: 'Validate a plain-language WhatsApp template objective before creating it. Returns policy risk, likely category, issues, and UTILITY coaching.',
    inputSchema: z.object({
      objective: z.string().min(1).max(2000),
      categoryHint: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
      variables: z.array(z.string()).optional(),
      name: z.string().optional(),
      language: z.string().optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.post('/templates/generate/validate', input),
  },

  {
    name: 'validate_template',
    description: 'Validate a stored WhatsApp template against Meta submission rules before submitting or rewriting.',
    inputSchema: z.object({
      id: z.string().uuid(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.post(`/templates/${input.id}/validate`, {}),
  },

  {
    name: 'submit_template',
    description: 'Create and submit a WhatsApp template to Meta from a flat developer-friendly shape. Ask for confirmation before use.',
    inputSchema: z.object({
      name: z.string().regex(/^[a-z0-9_]+$/),
      category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).default('UTILITY'),
      language: z.string().min(2).max(10).default('en'),
      header: z.object({
        format: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']),
        text: z.string().max(60).optional(),
        example_url: z.string().url().optional(),
      }).optional(),
      body: z.string().min(1).max(1024),
      footer: z.string().max(60).optional(),
      buttons: z.array(z.union([
        z.object({ type: z.literal('QUICK_REPLY'), text: z.string().min(1).max(25) }),
        z.object({ type: z.literal('URL'), text: z.string().min(1).max(25), url: z.string().url() }),
        z.object({ type: z.literal('PHONE_NUMBER'), text: z.string().min(1).max(25), phone_number: z.string().min(5).max(20) }),
      ])).max(10).optional(),
      variable_examples: z.array(z.string()).optional(),
      allow_category_change: z.boolean().default(false),
      idempotency_key: z.string().min(1).max(128).optional(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/templates', input),
  },

  {
    name: 'submit_stored_template',
    description: 'Submit an existing stored template draft to Meta for approval. Ask for confirmation before use.',
    inputSchema: z.object({
      id: z.string().uuid(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post(`/templates/${input.id}/submit`, {}),
  },

  {
    name: 'delete_template',
    description: 'Delete a WhatsApp template from Meta and remove the local registry row. Destructive: only use after explicit user confirmation.',
    inputSchema: z.object({
      id: z.string().uuid(),
      reason: z.string().min(1).max(500).describe('Human reason for auditability, e.g. rejected duplicate or marketing replacement approved'),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.delete(`/templates/${input.id}`),
  },

  {
    name: 'send_whatsapp_template',
    description: 'Trigger a WhatsApp journey/template send by trigger_name or journey_id. Use only for consented or transactional sends and ask before sending.',
    inputSchema: z.object({
      phone: z.string().min(7).max(20),
      trigger_name: z.string().regex(/^[a-z0-9_-]+$/).optional(),
      journey_id: z.string().uuid().optional(),
      message_type: z.enum(['utility', 'authentication', 'marketing']).default('utility'),
      metadata: z.record(z.unknown()).optional(),
      idempotency_key: z.string().min(1).max(128).optional(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/webhooks/send', input),
  },

  {
    name: 'trigger_journey',
    description: 'Enroll one phone number in a WhatsApp journey by trigger_name or journey_id. Returns enrollment_id for status polling.',
    inputSchema: z.object({
      phone: z.string().min(7).max(20),
      trigger_name: z.string().regex(/^[a-z0-9_-]+$/).optional(),
      journey_id: z.string().uuid().optional(),
      metadata: z.record(z.unknown()).optional(),
      idempotency_key: z.string().min(1).max(128).optional(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/trigger', input),
  },

  {
    name: 'validate_journey_trigger',
    description: 'Dry-run a journey trigger request. Use before send_whatsapp_template or trigger_journey to catch phone, journey, duplicate, and metadata errors.',
    inputSchema: z.object({
      phone: z.string().min(7).max(20),
      trigger_name: z.string().regex(/^[a-z0-9_-]+$/).optional(),
      journey_id: z.string().uuid().optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.post('/trigger/validate', input),
  },

  {
    name: 'check_journey_status',
    description: 'Check delivery status and failure explanation for a journey enrollment.',
    inputSchema: z.object({
      enrollment_id: z.string().uuid(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/trigger/status/${input.enrollment_id}`),
  },

  {
    name: 'list_journey_history',
    description: 'List recent WhatsApp journey enrollments and delivery states.',
    inputSchema: z.object({
      journey: z.string().optional(),
      status: z.enum(['active', 'completed', 'stopped', 'failed']).optional(),
      phone: z.string().optional(),
      since: z.string().datetime().optional(),
      until: z.string().datetime().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams();
      for (const key of ['journey', 'status', 'phone', 'since', 'until', 'limit', 'offset'] as const) {
        if (input[key] !== undefined) params.set(key, String(input[key]));
      }
      return client.get(`/trigger/history?${params}`);
    },
  },

  {
    name: 'trigger_journey_batch',
    description: 'Bulk-enroll up to 100 recipients into a WhatsApp journey. Ask for explicit confirmation and validate a sample first.',
    inputSchema: z.object({
      trigger_name: z.string().regex(/^[a-z0-9_-]+$/).optional(),
      journey_id: z.string().uuid().optional(),
      recipients: z.array(z.object({
        phone: z.string().min(7).max(20),
        metadata: z.record(z.unknown()).optional(),
      })).min(1).max(100),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/trigger/batch', input),
  },

  {
    name: 'get_developer_capabilities',
    description: 'Show which API/MCP capabilities are allowed by the current API key scopes.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/developer/capabilities'),
  },

  {
    name: 'get_developer_onboarding',
    description: 'Get the developer onboarding checklist for the current workspace.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/developer/onboarding'),
  },

  {
    name: 'get_developer_limits',
    description: 'Get API rate limits, API key quota, and webhook endpoint quota for the current key.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/developer/limits'),
  },

  {
    name: 'recommend_plan',
    description: 'Get a fit recommendation for the workspace from what you learn about the business in conversation — channels they want, expected monthly message volume, team size, and whether they need API/webhook access. Returns plain-language reasons and a warning if WhatsApp needs Meta Business Verification. Not needed during first-time setup; use connect_channel / get_connection_guide first.',
    inputSchema: z.object({
      platforms: z.array(z.enum(['instagram', 'whatsapp', 'messenger'])).max(3).optional()
        .describe('Channels the business wants to answer on'),
      monthly_messages: z.number().int().min(0).optional()
        .describe('Expected inbound messages per month the AI should answer'),
      team_size: z.number().int().min(1).optional()
        .describe('People who need their own login'),
      needs_api: z.boolean().optional().describe('They want to call the REST API or MCP tools from their own code'),
      needs_webhooks: z.boolean().optional().describe('They want signed webhooks pushed to their own server'),
      needs_campaigns: z.boolean().optional().describe('They want to send proactive WhatsApp template campaigns'),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.post('/developer/recommend-plan', input),
  },

  {
    name: 'explain_delivery_failure',
    description: 'Explain a Meta/WhatsApp delivery or template error code in plain English with next steps.',
    inputSchema: z.object({
      code: z.string().min(1),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/developer/troubleshooting/errors/${encodeURIComponent(input.code)}`),
  },

  {
    name: 'ask_barq',
    description: 'Ask Barq, the InstantReply in-product agent, to do or explain anything in the account (campaigns, templates, comment rules, leads, setup). Barq uses the same tools as the dashboard. It never executes risky actions itself: it returns them as pending_approvals, which only run when decide_approval is called separately. Can take up to ~55 seconds.',
    inputSchema: z.object({
      message: z.string().min(1).max(8000).describe('What to ask or do, in plain language'),
      persona: z.enum(['creator', 'whatsapp']).optional()
        .describe('Which Barq toolset to use. Omit to match the workspace (Creator workspaces get creator, everyone else whatsapp).'),
      history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) })).max(29).optional()
        .describe('Earlier turns of this conversation, oldest first, so Barq keeps context'),
    }),
    readOnly: false,
    // Barq can perform real writes through its own tools; only approvals are gated.
    destructive: true,
    handler: async (client, input) => client.post('/agent/chat', input, 58_000),
  },

  {
    name: 'propose_knowledge_entry',
    description: 'Ask Barq to propose a knowledge entry for owner review. This creates a pending approval card only; it does not add knowledge until an owner or admin approves it with decide_approval.',
    inputSchema: z.object({
      type: z.enum(['faq', 'policy', 'product', 'general']),
      title: z.string().trim().min(2).max(200),
      content: z.string().trim().min(2).max(5000),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/agent/chat', {
      persona: 'whatsapp',
      message: `Use the propose_knowledge_entry tool to submit exactly this knowledge for owner approval. Do not claim it was added. Return the pending approval details.\n${JSON.stringify(input)}`,
    }, 58_000),
  },

  {
    name: 'propose_follow_up_rule',
    description: 'Ask Barq to propose a no-reply follow-up rule for owner review. This creates a pending approval card only; it does not activate a rule until an owner or admin approves it with decide_approval.',
    inputSchema: z.object({
      name: z.string().trim().min(1).max(120),
      trigger_value: z.string().trim().min(1).max(20).regex(/^\\d+\\s*[mhd]?$/i),
      response_template: z.string().trim().min(1).max(2000),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/agent/chat', {
      persona: 'whatsapp',
      message: `Use the propose_follow_up_rule tool to submit exactly this no-reply follow-up rule for owner approval. Do not activate it or claim it is active. Return the pending approval details.\n${JSON.stringify(input)}`,
    }, 58_000),
  },

  {
    name: 'list_pending_approvals',
    description: 'List actions Barq proposed that are waiting for a human decision (id, title, summary, risk, expiry). Nothing here has run yet.',
    inputSchema: z.object({
      status: z.enum(['pending', 'executing', 'executed', 'failed', 'declined', 'expired']).default('pending'),
      limit:  z.number().int().min(1).max(50).default(20),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams({ status: input.status, limit: String(input.limit) });
      return client.get(`/agent/approvals?${params}`);
    },
  },

  {
    name: 'decide_approval',
    description: 'Approve or decline an action Barq proposed. Approving RUNS it exactly once with the stored arguments (it may send messages or submit templates). Only call after the user has seen list_pending_approvals or the ask_barq result and said yes.',
    inputSchema: z.object({
      approval_id: z.string().uuid(),
      decision:    z.enum(['approve', 'decline']),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.post(`/agent/approvals/${input.approval_id}/decide`, { decision: input.decision }),
  },

  {
    name: 'set_channel_ai_replies',
    description: 'Turn AI auto-replies on or off for one connected channel (an Instagram account, WhatsApp number, or Messenger page), without touching the others. Use list_channels first to get the integration_id. This only gates DM auto-replies; comment automation is separate — see set_comment_ai_replies.',
    inputSchema: z.object({
      integration_id: z.string().uuid().describe('Connected account ID from list_channels'),
      enabled:         z.boolean(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.patch(`/channels/${input.integration_id}`, { ai_enabled: input.enabled }),
  },

  {
    name: 'list_keyword_automations',
    description: 'List keyword DM automation rules. Pass integration_id to see rules for one connected channel plus legacy workspace-wide rules.',
    inputSchema: z.object({ integration_id: z.string().uuid().optional() }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/automations${input.integration_id ? `?integration_id=${input.integration_id}` : ''}`),
  },

  {
    name: 'create_keyword_automation',
    description: 'Create a DM automation on one connected channel. Use trigger_type=keyword for matching message text or a provider interaction kind (reply_button, list_row, template_button, quick_reply, postback) to match the exact opaque action ID from a tapped button. Button rules require integration_id and never match the visible button label. Supported actions are reply, escalate, assign_to, and add_tag. This takes effect immediately; for Barq proposals with owner approval, use ask_barq.',
    inputSchema: z.object({
      name: z.string().min(1).max(120), trigger_type: z.enum(['keyword', 'reply_button', 'list_row', 'template_button', 'quick_reply', 'postback']).default('keyword'),
      trigger_value: z.string().min(1).max(512), integration_id: z.string().uuid(),
      action_type: z.enum(['reply', 'escalate', 'assign_to', 'add_tag']), response_template: z.string().max(2000).optional(),
      action_data: z.object({ assign_to_user_id: z.string().uuid().optional(), tag_name: z.string().max(100).optional(), escalation_message: z.string().max(1000).optional(), notify_email: z.string().email().optional(), use_ai: z.boolean().optional() }).strict().optional(),
      is_active: z.boolean().optional(), priority: z.number().int().min(-100).max(100).optional(),
    }).strict(),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post('/automations', { ...input, trigger_type: input.trigger_type ?? 'keyword' }),
  },

  {
    name: 'update_keyword_automation',
    description: 'Update a channel automation. Button trigger types are reply_button, list_row, template_button, quick_reply, or postback and require a channel-bound integration_id.',
    inputSchema: z.object({ id: z.string().uuid(), updates: z.object({ name: z.string().min(1).max(120).optional(), trigger_type: z.enum(['keyword', 'reply_button', 'list_row', 'template_button', 'quick_reply', 'postback']).optional(), trigger_value: z.string().min(1).max(512).optional(), integration_id: z.string().uuid().nullable().optional(), action_type: z.enum(['reply', 'escalate', 'assign_to', 'add_tag']).optional(), response_template: z.string().max(2000).optional(), is_active: z.boolean().optional(), priority: z.number().int().min(-100).max(100).optional() }).strict() }).strict(),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.patch(`/automations/${input.id}`, input.updates),
  },

  {
    name: 'delete_keyword_automation',
    description: 'Delete an automation rule in this workspace.',
    inputSchema: z.object({ id: z.string().uuid() }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.delete(`/automations/${input.id}`),
  },

  {
    name: 'list_comments',
    description: 'List Instagram/Facebook post comments tracked by Instant Reply. Filter by platform, sentiment, or whether a reply has been posted.',
    inputSchema: z.object({
      platform:   z.enum(['instagram', 'messenger']).optional(),
      sentiment:  z.enum(['positive', 'neutral', 'negative']).optional(),
      has_reply:  z.boolean().optional(),
      limit:      z.number().int().min(1).max(100).default(20),
      cursor:     z.string().optional(),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => {
      const params = new URLSearchParams();
      if (input.platform)             params.set('platform',   input.platform);
      if (input.sentiment)            params.set('sentiment',  input.sentiment);
      if (input.has_reply !== undefined) params.set('has_reply', String(input.has_reply));
      if (input.limit)                params.set('limit',      String(input.limit));
      if (input.cursor)               params.set('cursor',     input.cursor);
      return client.get(`/comments?${params}`);
    },
  },

  {
    name: 'get_comment',
    description: 'Get a single tracked comment by ID.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Comment ID from list_comments'),
    }),
    readOnly: true,
    destructive: false,
    handler: async (client, input) => client.get(`/comments/${input.id}`),
  },

  {
    name: 'reply_to_comment',
    description: 'Post a public reply to an Instagram/Facebook comment (POST /v1/comments/:id/reply, needs messages:send). This replies publicly under the comment, not as a DM.',
    inputSchema: z.object({
      id:   z.string().uuid().describe('Comment ID from list_comments'),
      text: z.string().min(1).max(2200),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.post(`/comments/${input.id}/reply`, { text: input.text }),
  },

  {
    name: 'set_channel_comment_ai_replies',
    description: 'Turn AI comment replies on or off for one connected Instagram or Facebook page. Use list_channels to identify the integration_id; other pages are unchanged.',
    inputSchema: z.object({ integration_id: z.string().uuid(), enabled: z.boolean() }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.patch(`/channels/${input.integration_id}`, { ai_comment_replies_enabled: input.enabled }),
  },

  {
    name: 'set_comment_ai_replies',
    description: 'Turn AI auto-replies to comments on or off for the whole org (all connected Instagram/Facebook pages). Use set_channel_comment_ai_replies to change only one connected page.',
    inputSchema: z.object({
      enabled: z.boolean(),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.patch('/comments/settings', { ai_enabled: input.enabled }),
  },

  {
    name: 'get_comment_automation_settings',
    description: 'Read org-wide comment automation and keyword rules, including rules scoped to a single connected page.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/comments/settings'),
  },

  {
    name: 'set_comment_keyword_rules',
    description: 'Replace the workspace comment keyword trigger rules. Set integration_id on a rule to limit it to one connected page; omit it for every page on the selected platform. Read existing settings first to preserve rules you want to keep.',
    inputSchema: z.object({
      rules: z.array(z.object({
        id: z.string().min(1).max(80).optional(),
        name: z.string().max(80).optional(),
        enabled: z.boolean().optional(),
        platforms: z.array(z.enum(['instagram', 'facebook'])).min(1).max(2),
        phrases: z.array(z.string().min(1).max(80)).min(1).max(20),
        matchType: z.enum(['contains', 'exact']).optional(),
        action: z.enum(['public_reply_only', 'public_reply_plus_dm', 'flag_for_review', 'hide_or_moderate', 'assign_to_human', 'ignore']).optional(),
        publicReply: z.string().max(500).optional(),
        privateReply: z.string().max(900).nullable().optional(),
        priority: z.number().int().min(0).max(1000).optional(),
        postId: z.string().max(128).nullable().optional(),
        integration_id: z.string().uuid().optional(),
      }).strict()).max(25),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) => client.patch('/comments/settings', { trigger_rules: input.rules }),
  },
];
