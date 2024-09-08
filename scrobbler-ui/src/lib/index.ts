import NDK, { NDKEvent, NDKKind, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { writable, derived } from 'svelte/store';
import type { NostrEvent } from './types';

export const userNdk = new NDK({ explicitRelayUrls: ['wss://relay.damus.io'] });
export const ndk = new NDK({ explicitRelayUrls: ['wss://relay.nostr-music.cc'] });

export interface ArtistPlayCount {
	artist: string;
	playCount: number;
	imageUrl?: string;
	lastStreamedAt: number; // Unix timestamp
}

export function groupEventsByArtist(events: NDKEvent[]): ArtistPlayCount[] {
	const artistData: { [artist: string]: ArtistPlayCount } = {};

	events.forEach((event) => {
		const artist = event.tags.find((tag) => tag[0] === 'artist')?.[1];
		if (artist) {
			if (!artistData[artist]) {
				artistData[artist] = {
					artist,
					playCount: 0,
					lastStreamedAt: 0
				};
			}
			artistData[artist].playCount += 1;
			if (event.created_at !== undefined) {
				artistData[artist].lastStreamedAt = Math.max(
					artistData[artist].lastStreamedAt,
					event.created_at
				);
			}
		}
	});

	return Object.values(artistData).sort((a, b) => b.playCount - a.playCount);
}

export const events = writable<NostrEvent[]>([]);

export const sortedEvents = derived(events, ($events) =>
	$events.slice().sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
);

export const artists = derived(events, ($events) => groupEventsByArtist($events));
export const recentlyPlayedArtists = derived(events, ($events) => {
	const recentArtists = new Set();
	const recentEvents = $events.slice(0, 100); // Get the last 100 events

	recentEvents.forEach((event) => {
		const artist = event.tags.find((tag) => tag[0] === 'artist')?.[1];
		if (artist) {
			recentArtists.add(artist);
		}
	});
	return Array.from(recentArtists).map((artist) => ({
		artist,
		playCount: 0,
		lastStreamedAt: 0
	} as ArtistPlayCount));
});

export async function fetchUserEvents(npub: string) {
	if (!npub) return;

	try {
		const user = ndk.getUser({ npub });

		const fetchedEvents = await ndk.fetchEvents(
			{
				kinds: [2002 as NDKKind],
				authors: [user.pubkey],
				limit: 3000
			},
			{ cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, skipVerification: true }
		);
		events.set(Array.from(fetchedEvents));
		return user;
	} catch (error) {
		console.error('Error fetching user events:', error);
	}
}

export async function fetchAllEvents() {
    const sub = ndk.subscribe({
        kinds: [2002 as NDKKind],
        limit: 100
    }, {
        closeOnEose: false,
    })
    sub.on('event', (event) => {
        events.update((events) => [...events, event]);
    });
    return sub
}
