import { z } from 'zod';
import type { InstantReplyClient } from './client.js';

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
    description: 'Send a reply message in a conversation. Use for responding to customers across Instagram, WhatsApp, or Messenger.',
    inputSchema: z.object({
      conversation_id: z.string().uuid(),
      content:         z.string().min(1).max(4096).describe('Message text content'),
      content_type:    z.enum(['text', 'image', 'document', 'audio', 'video']).default('text'),
    }),
    readOnly: false,
    destructive: true,
    handler: async (client, input) =>
      client.post(`/conversations/${input.conversation_id}/messages`, {
        content:      input.content,
        content_type: input.content_type,
      }),
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
    description: 'List connected social channels (Instagram, WhatsApp, Messenger pages).',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/channels'),
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
    description: 'Show which API/MCP capabilities are allowed by the current API key scopes and plan tier.',
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
    description: 'Get API rate limits, API key quota, and webhook endpoint quota for the current key plan tier.',
    inputSchema: z.object({}),
    readOnly: true,
    destructive: false,
    handler: async (client) => client.get('/developer/limits'),
  },

  {
    name: 'recommend_plan',
    description: 'Recommend the right InstantReply plan from what you learn about the business in conversation — channels they want, expected monthly message volume, team size, and whether they need API/webhook access. Returns a recommendation with plain-language reasons, a cheaper alternative when one still fits, and a warning if WhatsApp needs Meta Business Verification. Use this before telling a user what to sign up for.',
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
];
