import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock global fetch for outbound requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/scrape — URL validation (SSRF prevention)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('400 si url manquante', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('400 si url n\'est pas un string', async () => {
    const res = await POST(makeRequest({ url: 123 }));
    expect(res.status).toBe(400);
  });

  it('400 si url est mal formée', async () => {
    const res = await POST(makeRequest({ url: 'not-a-url' }));
    expect(res.status).toBe(400);
  });

  it.each([
    ['un domaine attaquant contenant echecs.asso.fr en substring', 'https://attacker.com/?x=echecs.asso.fr'],
    ['un sous-domaine malveillant', 'https://echecs.asso.fr.attacker.com/page'],
    ['totalement différent', 'https://evil.com/data'],
  ])('403 si hostname est %s', async (_label, url) => {
    const res = await POST(makeRequest({ url }));
    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('200 avec hostname echecs.asso.fr', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: () => Promise.resolve('<html>' + 'x'.repeat(200) + '</html>'),
    });

    const res = await POST(makeRequest({ url: 'https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123/123&Action=Ga' }));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('200 avec hostname www.echecs.asso.fr', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: () => Promise.resolve('<html>' + 'x'.repeat(200) + '</html>'),
    });

    const res = await POST(makeRequest({ url: 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123/123&Action=Ls' }));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
