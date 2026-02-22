import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSyncToken } from '@/lib/hmac';

// Mock kv module
vi.mock('@/lib/kv', () => ({
  saveEvents: vi.fn(async () => {}),
  getEvents: vi.fn(async () => []),
  saveValidations: vi.fn(async () => {}),
  getValidations: vi.fn(async () => ({})),
  saveCurrentEventId: vi.fn(async () => {}),
  getCurrentEventId: vi.fn(async () => ''),
  getStorageData: vi.fn(async () => ({ events: [], validations: {}, currentEventId: '' })),
  eventsKey: vi.fn((slug: string) => `nos-joueurs:${slug}:events`),
  validationsKey: vi.fn((slug: string) => `nos-joueurs:${slug}:validations`),
  settingsKey: vi.fn((slug: string) => `nos-joueurs:${slug}:settings`),
}));

import { POST } from '../sync/route';
import { GET } from '../fetch/route';
import { NextRequest } from 'next/server';

function makeSyncRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/events/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeFetchRequest(params?: Record<string, string>, headers?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/events/fetch');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), { method: 'GET', headers });
}

describe('API routes — QG-5: validation slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/events/sync', () => {
    it('400 si clubSlug manquant dans le body', async () => {
      const req = makeSyncRequest({ events: [], validations: {} });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('400 si clubSlug vide ""', async () => {
      const req = makeSyncRequest({ clubSlug: '', events: [], validations: {} });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('400 si clubSlug contient des caractères invalides "HAY CHESS!"', async () => {
      const req = makeSyncRequest({ clubSlug: 'HAY CHESS!', events: [], validations: {} });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('400 si clubSlug dépasse 40 caractères', async () => {
      const req = makeSyncRequest({ clubSlug: 'a'.repeat(41), events: [], validations: {} });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('401 si X-Sync-Token manquant', async () => {
      const req = makeSyncRequest({
        clubSlug: 'hay-chess',
        events: [{ id: 'e1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('401 si X-Sync-Token invalide', async () => {
      const req = makeSyncRequest(
        {
          clubSlug: 'hay-chess',
          events: [{ id: 'e1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
          validations: {},
        },
        { 'X-Sync-Token': 'bad-token' },
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('200 avec clubSlug valide et token HMAC correct', async () => {
      const token = await generateSyncToken('hay-chess');
      const req = makeSyncRequest(
        {
          clubSlug: 'hay-chess',
          events: [{ id: 'e1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
          validations: {},
        },
        { 'X-Sync-Token': token },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('400 si event sans id (Zod validation)', async () => {
      const req = makeSyncRequest({
        clubSlug: 'hay-chess',
        events: [{ name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request body');
    });

    it('400 si events est un string au lieu d\'un array (Zod validation)', async () => {
      const req = makeSyncRequest({
        clubSlug: 'hay-chess',
        events: 'not-an-array',
        validations: {},
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('400 si validations contient une valeur non-boolean (Zod validation)', async () => {
      const req = makeSyncRequest({
        clubSlug: 'hay-chess',
        events: [{ id: 'e1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: { t1: { player1: { round_1: 'oui' } } },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('413 si body dépasse 1MB', async () => {
      const largeBody = JSON.stringify({ clubSlug: 'hay-chess', events: [], data: 'x'.repeat(1_048_577) });
      const req = new NextRequest('http://localhost:3000/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody,
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
    });
  });

  describe('GET /api/events/fetch', () => {
    it('400 si clubSlug manquant dans le query string', async () => {
      const req = makeFetchRequest();
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('400 si clubSlug invalide', async () => {
      const req = makeFetchRequest({ clubSlug: 'INVALID SLUG!' });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('401 si X-Sync-Token manquant', async () => {
      const req = makeFetchRequest({ clubSlug: 'hay-chess' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('401 si X-Sync-Token invalide', async () => {
      const req = makeFetchRequest({ clubSlug: 'hay-chess' }, { 'X-Sync-Token': 'bad' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('200 avec clubSlug valide et token HMAC correct', async () => {
      const token = await generateSyncToken('hay-chess');
      const req = makeFetchRequest({ clubSlug: 'hay-chess' }, { 'X-Sync-Token': token });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });
});
