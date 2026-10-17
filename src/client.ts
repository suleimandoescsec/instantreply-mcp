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
  private notice: string | null = null;

  constructor(apiKey: string, options: InstantReplyClientOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/$/, '');
    this.timeoutMs = normalizeTimeout(options.timeoutMs);
  }

  async request<T>(method: string, path: string, body?: unknown, timeoutMs?: number, extraHeaders?: Record<string, string>): Promise<T> {
    const effectiveTimeoutMs = timeoutMs === undefined ? this.timeoutMs : normalizeTimeout(timeoutMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);
    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}/v1${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@instantreply.co/mcp/0.7.0',
          ...extraHeaders,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`InstantReply API request timed out after ${effectiveTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // The server may attach one friendly account notice (header, URI-encoded). Keep it for the tool wrapper.
    const notice = res.headers.get('x-instantreply-notice');
    if (notice) {
      try { this.notice = decodeURIComponent(notice); } catch { /* ignore malformed */ }
    }

    if (!res.ok) {
      // The API answers { status, code, message } (a few older routes nest it as error.message). Reading only the nested
      // form turned every failure into the bare HTTP status text ("Forbidden", "Not Found", "Too Many Requests"), so the
      // AI app could neither fix its call nor tell the customer why (test keys refused, key quota, plan limits...).
      const err = (await res.json().catch(() => null)) as { message?: unknown; code?: unknown; errors?: unknown; error?: { message?: unknown } } | null;
      const message = [err?.message, err?.error?.message].find((m): m is string => typeof m === 'string' && m.length > 0) ?? res.statusText;
      const code = typeof err?.code === 'string' && err.code !== 'ERROR' ? ` [${err.code}]` : '';
      // A 400 from request validation carries which field is wrong and why ({errors: [{field, message}]}); without it the
      // agent only learns "Validation failed" and cannot fix its call.
      const fields = Array.isArray(err?.errors)
        ? (err.errors as unknown[]).slice(0, 3).flatMap((e) => {
          const f = e as { field?: unknown; message?: unknown } | null;
          const text = typeof f?.message === 'string' ? f.message : '';
          return text ? [typeof f?.field === 'string' && f.field ? `${f.field}: ${text}` : text] : [];
        })
        : [];
      throw new Error(`InstantReply API error ${res.status}: ${message}${code}${fields.length ? ` (${fields.join('; ')})` : ''}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** Returns and clears the notice captured from the last response, if any. */
  takeNotice(): string | null { const n = this.notice; this.notice = null; return n; }

  get<T>(path: string) { return this.request<T>('GET', path); }
  /** `timeoutMs` overrides the client default for one slow call (e.g. ask_barq). */
  post<T>(path: string, body: unknown, timeoutMs?: number, extraHeaders?: Record<string, string>) { return this.request<T>('POST', path, body, timeoutMs, extraHeaders); }
  patch<T>(path: string, body: unknown) { return this.request<T>('PATCH', path, body); }
  put<T>(path: string, body: unknown) { return this.request<T>('PUT', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}
