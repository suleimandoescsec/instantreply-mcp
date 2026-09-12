const BASE_URL = process.env.INSTANTREPLY_API_URL ?? 'https://api.instantreply.co';
const DEFAULT_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;

export interface InstantReplyClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(value) || value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    throw new Error(`timeoutMs must be an integer between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`);
  }
  return value;
}

export class InstantReplyClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey: string, options: InstantReplyClientOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/$/, '');
    this.timeoutMs = normalizeTimeout(options.timeoutMs);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}/v1${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@instantreply/mcp/0.1.0',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`InstantReply API request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(`InstantReply API error ${res.status}: ${(err as any)?.error?.message ?? res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown) { return this.request<T>('POST', path, body); }
  patch<T>(path: string, body: unknown) { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}
