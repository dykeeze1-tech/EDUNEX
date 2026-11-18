export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.pathname + input.search
      : input.url;

  if (url.startsWith('/api/')) {
    let token: string | null = null;
    try {
      token = typeof window !== 'undefined' ? window.sessionStorage.getItem('edunexa_token') : null;
    } catch {
      token = null;
    }

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return window.fetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    });
  }

  return window.fetch(input, init);
}
