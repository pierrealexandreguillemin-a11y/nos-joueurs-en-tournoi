import { Redis } from '@upstash/redis';
import type { StorageData, Event, ValidationState } from '@/types';

// Use Redis.fromEnv() to automatically detect KV_REST_API_URL and KV_REST_API_TOKEN
const kv = Redis.fromEnv();

const STORAGE_KEY = 'nos-joueurs-en-tournoi';
const EVENTS_KEY = `${STORAGE_KEY}:events`;
const VALIDATIONS_KEY = `${STORAGE_KEY}:validations`;
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;

/**
 * Save events to Vercel KV
 */
export async function saveEvents(events: Event[]): Promise<void> {
  // Store each event individually for easier querying
  if (events.length === 0) {
    return; // Skip if no events to save
  }

  const pipeline = kv.pipeline();

  events.forEach((event) => {
    pipeline.hset(`${EVENTS_KEY}`, { [event.id]: JSON.stringify(event) });
  });

  await pipeline.exec();
}

/**
 * Get all events from Vercel KV
 */
export async function getEvents(): Promise<Event[]> {
  const eventsHash = await kv.hgetall(`${EVENTS_KEY}`);

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
export async function saveEvent(event: Event): Promise<void> {
  await kv.hset(`${EVENTS_KEY}`, { [event.id]: JSON.stringify(event) });
}

/**
 * Delete an event from Vercel KV
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await kv.hdel(`${EVENTS_KEY}`, eventId);
}

/**
 * Save validations to Vercel KV
 */
export async function saveValidations(validations: ValidationState): Promise<void> {
  await kv.set(VALIDATIONS_KEY, JSON.stringify(validations));
}

/**
 * Get validations from Vercel KV
 */
export async function getValidations(): Promise<ValidationState> {
  const validationsData = await kv.get(VALIDATIONS_KEY);

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
export async function saveCurrentEventId(eventId: string): Promise<void> {
  await kv.set(SETTINGS_KEY, JSON.stringify({ currentEventId: eventId }));
}

/**
 * Get current event ID from Vercel KV
 */
export async function getCurrentEventId(): Promise<string> {
  const settingsData = await kv.get(SETTINGS_KEY);

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
export async function saveStorageData(data: StorageData): Promise<void> {
  await Promise.all([
    saveEvents(data.events),
    saveValidations(data.validations),
    saveCurrentEventId(data.currentEventId || ''),
  ]);
}

/**
 * Get all storage data from Vercel KV
 */
export async function getStorageData(): Promise<StorageData> {
  const [events, validations, currentEventId] = await Promise.all([
    getEvents(),
    getValidations(),
    getCurrentEventId(),
  ]);

  return {
    events,
    validations,
    currentEventId,
  };
}
