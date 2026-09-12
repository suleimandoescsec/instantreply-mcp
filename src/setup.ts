/**
 * Zero-key onboarding: RFC 8628 device-authorization pairing.
 *
 * This is what makes `npx @instantreply/mcp` usable with no account and no
 * API key already in hand. It never creates an account itself — the browser
 * step at /pair still goes through normal signup with captcha and legal
 * consent, exactly like a human clicking "Sign up" would. This module only
 * handles the polling handshake and stashing the resulting key locally so
 * the next `npx` run skips setup entirely.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.INSTANTREPLY_API_URL ?? 'https://api.instantreply.co';
const CONFIG_DIR = join(homedir(), '.instantreply');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

interface StoredConfig {
  apiKey?: string;
}

export function readStoredApiKey(): string | undefined {
  try {
    if (!existsSync(CONFIG_PATH)) return undefined;
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoredConfig;
    return typeof parsed.apiKey === 'string' && parsed.apiKey.length > 0 ? parsed.apiKey : undefined;
  } catch {
    return undefined;
  }
}

function storeApiKey(apiKey: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  // Best-effort 0600 — Windows ignores the mode bits but every other
  // platform this ships to (macOS, Linux) honors it for a secrets file.
  writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 });
}

interface DeviceCodeResponse {
  success: boolean;
  data: {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
  };
}

export async function requestDeviceCode(
  platform: 'instagram' | 'whatsapp' | 'messenger' | 'full',
): Promise<DeviceCodeResponse['data']> {
  const res = await fetch(`${BASE_URL}/v1/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requested_platform: platform, client_name: '@instantreply/mcp' }),
  });
  if (!res.ok) {
    throw new Error(`Could not start setup (HTTP ${res.status}). Try again in a moment.`);
  }
  const body = (await res.json()) as DeviceCodeResponse;
  return body.data;
}

/**
 * Public discovery data — how to connect each channel, what Meta requires,
 * and how long it really takes. Deliberately callable with no API key, since
 * an agent needs it to advise someone who hasn't signed up yet.
 */
export async function fetchConnectionGuide(): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/v1/device/connection-guide`);
  if (!res.ok) {
    throw new Error(`Could not fetch the connection guide (HTTP ${res.status}).`);
  }
  const body = (await res.json()) as { data: unknown };
  return body.data;
}

export type PollResult =
  | { status: 'approved'; apiKey: string }
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'denied' };

export async function pollDeviceToken(deviceCode: string): Promise<PollResult> {
  const res = await fetch(`${BASE_URL}/v1/device/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode }),
  });

  if (res.ok) {
    const body = (await res.json()) as { data: { api_key: string } };
    storeApiKey(body.data.api_key);
    return { status: 'approved', apiKey: body.data.api_key };
  }

  const err = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
  const code = err?.error?.code;
  if (code === 'authorization_pending') return { status: 'pending' };
  if (code === 'expired_token') return { status: 'expired' };
  if (code === 'access_denied') return { status: 'denied' };
  throw new Error(`Setup check failed (HTTP ${res.status}).`);
}

/**
 * Poll until approved/expired/denied, honoring the server's requested
 * interval. Callers pass this to an MCP tool handler, which itself is
 * subject to the client's own request timeout — so this backs off but
 * still returns within a bounded number of attempts rather than looping
 * forever inside a single tool call.
 */
export async function waitForApproval(
  deviceCode: string,
  intervalSeconds: number,
  maxAttempts = 20,
): Promise<PollResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await pollDeviceToken(deviceCode);
    if (result.status !== 'pending') return result;
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
  return { status: 'pending' };
}
