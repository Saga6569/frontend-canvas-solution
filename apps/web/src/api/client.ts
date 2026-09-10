export type ApiError = { code: string; message: string };

export type Result<T> =
  { ok: true; data: T; headers: Headers } | { ok: false; error: ApiError; headers: Headers };

const BASE = '';

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  } = {},
): Promise<Result<T>> {
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': requestId,
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err: unknown) {
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Request aborted'
        : err instanceof TypeError
          ? 'Network error'
          : 'Request failed';
    return { ok: false, headers: new Headers(), error: { code: 'NETWORK_ERROR', message } };
  }

  if (response.status === 304) {
    return {
      ok: false,
      headers: response.headers,
      error: { code: 'NOT_MODIFIED', message: 'Not modified' },
    };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const body = await response.json();
      if (body?.error?.code && body?.error?.message) {
        return { ok: false, headers: response.headers, error: body.error };
      }
    }
    return {
      ok: false,
      headers: response.headers,
      error: { code: `HTTP_${response.status}`, message: response.statusText },
    };
  }

  if (response.status === 204 || !isJson) {
    return { ok: true, data: undefined as unknown as T, headers: response.headers };
  }

  const data = (await response.json()) as T;
  return { ok: true, data, headers: response.headers };
}
