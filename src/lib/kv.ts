import { Redis } from '@upstash/redis';
import type { StorageData, Event, ValidationState } from '@/types';

// Use Redis.fromEnv() to automatically detect KV_REST_API_URL and KV_REST_API_TOKEN
const kv = Redis.fromEnv();

// Namespaced key generators
export function eventsKey(slug: string): string {
  return `nos-joueurs:${slug}:events`;
}

export function validationsKey(slug: string): string {
  return `nos-joueurs:${slug}:validations`;
}

export function settingsKey(slug: string): string {
  return `nos-joueurs:${slug}:settings`;
}

/**
 * Save events to Vercel KV
 */
export async function saveEvents(events: Event[], clubSlug: string): Promise<void> {
  // Store each event individually for easier querying
  if (events.length === 0) {
    return; // Skip if no events to save
  }

  const pipeline = kv.pipeline();

  events.forEach((event) => {
    pipeline.hset(eventsKey(clubSlug), { [event.id]: JSON.stringify(event) });
  });

  await pipeline.exec();
}

/**
 * Get all events from Vercel KV
 */
export async function getEvents(clubSlug: string): Promise<Event[]> {
  const eventsHash = await kv.hgetall(eventsKey(clubSlug));

  if (!eventsHash) {
    return [];
  }

  return Object.values(eventsHash).map((eventData) => {
    // Handle both string and object returns from Upstash
    if (typeof eventData === 'string') {
      return JSON.parse(eventData) as Event;
    }
    return eventData as Event;
  });
}

/**
 * Save a single event to Vercel KV
 */
export async function saveEvent(event: Event, clubSlug: string): Promise<void> {
  await kv.hset(eventsKey(clubSlug), { [event.id]: JSON.stringify(event) });
}

/**
 * Delete an event from Vercel KV
 */
export async function deleteEvent(eventId: string, clubSlug: string): Promise<void> {
  await kv.hdel(eventsKey(clubSlug), eventId);
}

/**
 * Save validations to Vercel KV
 */
export async function saveValidations(validations: ValidationState, clubSlug: string): Promise<void> {
  await kv.set(validationsKey(clubSlug), JSON.stringify(validations));
}

/**
 * Get validations from Vercel KV
 */
export async function getValidations(clubSlug: string): Promise<ValidationState> {
  const validationsData = await kv.get(validationsKey(clubSlug));

  if (!validationsData) {
    return {};
  }

  // Handle both string and object returns from Upstash
  if (typeof validationsData === 'string') {
    return JSON.parse(validationsData) as ValidationState;
  }

  return validationsData as ValidationState;
}

/**
 * Save current event ID to Vercel KV
 */
export async function saveCurrentEventId(eventId: string, clubSlug: string): Promise<void> {
  await kv.set(settingsKey(clubSlug), JSON.stringify({ currentEventId: eventId }));
}

/**
 * Get current event ID from Vercel KV
 */
export async function getCurrentEventId(clubSlug: string): Promise<string> {
  const settingsData = await kv.get(settingsKey(clubSlug));

  if (!settingsData) {
    return '';
  }

  // Handle both string and object returns from Upstash
  let settings: { currentEventId: string };
  if (typeof settingsData === 'string') {
    settings = JSON.parse(settingsData) as { currentEventId: string };
  } else {
    settings = settingsData as { currentEventId: string };
  }

  return settings.currentEventId || '';
}

/**
 * Save all storage data to Vercel KV
 */
export async function saveStorageData(data: StorageData, clubSlug: string): Promise<void> {
  await Promise.all([
    saveEvents(data.events, clubSlug),
    saveValidations(data.validations, clubSlug),
    saveCurrentEventId(data.currentEventId || '', clubSlug),
  ]);
}

/**
 * Get all storage data from Vercel KV
 */
export async function getStorageData(clubSlug: string): Promise<StorageData> {
  const [events, validations, currentEventId] = await Promise.all([
    getEvents(clubSlug),
    getValidations(clubSlug),
    getCurrentEventId(clubSlug),
  ]);

  return {
    events,
    validations,
    currentEventId,
  };
}
