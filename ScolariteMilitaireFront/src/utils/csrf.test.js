import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ensureCsrfToken (cross-origin SPA↔API)', () => {
  beforeEach(() => {
    vi.resetModules();
    // Simulate split hosts: API Set-Cookie is not visible on SPA document.cookie
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses csrfToken from GET /auth/csrf/ body when cookie is not readable', async () => {
    const { ensureCsrfToken } = await import('./csrf.js');
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        data: { csrfToken: 'body-token-from-api' },
      }),
    };

    const token = await ensureCsrfToken(apiClient);

    expect(apiClient.get).toHaveBeenCalled();
    expect(token).toBe('body-token-from-api');
  });
});
