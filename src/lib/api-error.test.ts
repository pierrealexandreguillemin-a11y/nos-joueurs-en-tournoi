import { describe, it, expect, vi } from 'vitest';
import { apiError } from './api-error';

describe('apiError', () => {
  it('returns 500 with generic message, no error details leaked', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = apiError('/test', new Error('secret DB connection string'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
    expect(body.message).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('secret');

    spy.mockRestore();
  });

  it('logs the full error server-side with label', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Upstash timeout');

    apiError('/sync', err);

    expect(spy).toHaveBeenCalledWith('[API /sync]', err);
    spy.mockRestore();
  });

  it('handles non-Error objects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = apiError('/scrape', 'string error');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
    expect(spy).toHaveBeenCalledWith('[API /scrape]', 'string error');

    spy.mockRestore();
  });
});
