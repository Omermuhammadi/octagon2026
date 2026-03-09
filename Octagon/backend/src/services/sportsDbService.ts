import { Event, IEventFight } from '../models/Event';

const SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const DELAY_MS = 2100; // Stay safely under 30 req/min

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// API RESPONSE TYPES
// ============================================

interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  dateEvent: string;
  strVenue: string | null;
  strCity: string | null;
  strCountry: string | null;
  strStatus: string | null;
  strPoster: string | null;
  strThumb: string | null;
  strDescriptionEN: string | null;
}

interface SportsDbResult {
  idResult: string;
  idPlayer: string;
  strPlayer: string;
  idEvent: string;
  strEvent: string;
  intPosition: string;
  strDetail: string; // "WIN" or "LOSS"
  dateEvent: string;
}

// ============================================
// API FETCHERS
// ============================================

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`SportsDB API error: ${response.status} for ${url}`);
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`SportsDB fetch failed for ${url}:`, error);
    return null;
  }
}

export async function searchUFCEvents(): Promise<SportsDbEvent[]> {
  const data = await fetchJson<{ event: SportsDbEvent[] | null }>(
    `${SPORTSDB_BASE}/searchevents.php?e=UFC`
  );
  return data?.event ?? [];
}

export async function fetchEventDetails(sportsDbId: string): Promise<SportsDbEvent | null> {
  const data = await fetchJson<{ events: SportsDbEvent[] | null }>(
    `${SPORTSDB_BASE}/lookupevent.php?id=${sportsDbId}`
  );
  return data?.events?.[0] ?? null;
}

export async function fetchEventResults(sportsDbId: string): Promise<SportsDbResult[]> {
  const data = await fetchJson<{ results: SportsDbResult[] | null }>(
    `${SPORTSDB_BASE}/eventresults.php?id=${sportsDbId}`
  );
  return data?.results ?? [];
}

// ============================================
// FIGHT CARD PARSER
// ============================================

export function parseResultsToFights(results: SportsDbResult[]): IEventFight[] {
  // Results come in pairs sharing the same intPosition
  const positionMap = new Map<number, SportsDbResult[]>();

  for (const r of results) {
    const pos = parseInt(r.intPosition, 10) || 0;
    const existing = positionMap.get(pos) || [];
    existing.push(r);
    positionMap.set(pos, existing);
  }

  const fights: IEventFight[] = [];

  for (const [position, fighters] of positionMap.entries()) {
    if (fighters.length < 2) continue;

    const f1 = fighters[0];
    const f2 = fighters[1];
    const winner = f1.strDetail === 'WIN' ? f1.strPlayer
      : f2.strDetail === 'WIN' ? f2.strPlayer
      : null;

    fights.push({
      position,
      fighter1: f1.strPlayer,
      fighter2: f2.strPlayer,
      winner,
      fighter1Detail: f1.strDetail || null,
      fighter2Detail: f2.strDetail || null,
    });
  }

  // Sort by position (1 = main event)
  fights.sort((a, b) => a.position - b.position);
  return fights;
}

// ============================================
// SYNC ORCHESTRATOR
// ============================================

export interface SyncResult {
  newEvents: number;
  updatedEvents: number;
  fightCardsLoaded: number;
  errors: string[];
}

export async function syncEvents(): Promise<SyncResult> {
  const result: SyncResult = { newEvents: 0, updatedEvents: 0, fightCardsLoaded: 0, errors: [] };

  console.log('[SportsDB] Starting UFC event sync...');

  // 1. Search for UFC events
  const apiEvents = await searchUFCEvents();
  if (apiEvents.length === 0) {
    console.log('[SportsDB] No events returned from search');
    return result;
  }

  console.log(`[SportsDB] Found ${apiEvents.length} UFC events from API`);

  // 2. Upsert events into DB
  for (const apiEvent of apiEvents) {
    try {
      const eventDate = new Date(apiEvent.dateEvent);
      const isUpcoming = apiEvent.strStatus === 'Not Started' ||
        apiEvent.strStatus === 'Match Postponed' ||
        eventDate > new Date();
      const isFinished = apiEvent.strStatus === 'Match Finished';

      const location = [apiEvent.strVenue, apiEvent.strCity, apiEvent.strCountry]
        .filter(Boolean)
        .join(', ');

      const existing = await Event.findOne({ sportsDbId: apiEvent.idEvent });

      if (existing) {
        // Update existing event
        existing.name = apiEvent.strEvent;
        existing.date = eventDate;
        existing.location = location;
        existing.status = isFinished ? 'completed' : 'upcoming';
        existing.venue = apiEvent.strVenue || '';
        existing.city = apiEvent.strCity || '';
        existing.country = apiEvent.strCountry || '';
        existing.poster = apiEvent.strPoster || '';
        existing.thumb = apiEvent.strThumb || '';
        existing.lastSynced = new Date();
        await existing.save();
        result.updatedEvents++;
      } else {
        // Try matching by name+date to avoid duplicates with CSV-imported events
        const nameMatch = await Event.findOne({
          name: { $regex: apiEvent.strEvent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
          date: {
            $gte: new Date(eventDate.getTime() - 86400000),
            $lte: new Date(eventDate.getTime() + 86400000),
          },
        });

        if (nameMatch) {
          // Link existing CSV event to TheSportsDB
          nameMatch.sportsDbId = apiEvent.idEvent;
          nameMatch.venue = apiEvent.strVenue || '';
          nameMatch.city = apiEvent.strCity || '';
          nameMatch.country = apiEvent.strCountry || '';
          nameMatch.poster = apiEvent.strPoster || '';
          nameMatch.thumb = apiEvent.strThumb || '';
          nameMatch.status = isFinished ? 'completed' : 'upcoming';
          nameMatch.lastSynced = new Date();
          await nameMatch.save();
          result.updatedEvents++;
        } else {
          // Create new event
          await Event.create({
            url: `https://www.thesportsdb.com/event/${apiEvent.idEvent}`,
            eventId: `sdb_${apiEvent.idEvent}`,
            name: apiEvent.strEvent,
            date: eventDate,
            location,
            status: isFinished ? 'completed' : 'upcoming',
            sportsDbId: apiEvent.idEvent,
            venue: apiEvent.strVenue || '',
            city: apiEvent.strCity || '',
            country: apiEvent.strCountry || '',
            poster: apiEvent.strPoster || '',
            thumb: apiEvent.strThumb || '',
            lastSynced: new Date(),
          });
          result.newEvents++;
        }
      }
    } catch (err: any) {
      result.errors.push(`Event ${apiEvent.strEvent}: ${err.message}`);
    }
  }

  // 3. Fetch fight cards for completed events that don't have fights yet
  const completedWithoutFights = await Event.find({
    sportsDbId: { $ne: null },
    status: 'completed',
    $or: [{ fights: { $size: 0 } }, { fights: { $exists: false } }],
  }).limit(5); // Limit to 5 per sync to avoid rate limits

  for (const event of completedWithoutFights) {
    if (!event.sportsDbId) continue;

    await delay(DELAY_MS);

    try {
      const results = await fetchEventResults(event.sportsDbId);
      if (results.length > 0) {
        event.fights = parseResultsToFights(results);
        event.lastSynced = new Date();
        await event.save();
        result.fightCardsLoaded++;
      }
    } catch (err: any) {
      result.errors.push(`Fights for ${event.name}: ${err.message}`);
    }
  }

  console.log(`[SportsDB] Sync complete: ${result.newEvents} new, ${result.updatedEvents} updated, ${result.fightCardsLoaded} fight cards loaded`);
  if (result.errors.length > 0) {
    console.log(`[SportsDB] Sync errors: ${result.errors.join('; ')}`);
  }

  return result;
}
