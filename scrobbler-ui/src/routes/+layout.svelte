<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { NDKUser } from '@nostr-dev-kit/ndk';
	import type { NostrEvent } from '$lib/types';
	import Name from './Name.svelte';
	import {
		fetchAllEvents,
		fetchUserEvents,
		ndk,
		recentlyPlayedArtists,
		sortedEvents,
		userNdk
	} from '$lib';
	import Artists from './Artists.svelte';
	import Chart from './Chart.svelte';
	import Avatar from './Avatar.svelte';

	let npub: string = $state('');
	let user: NDKUser | null = $state(null);

	let currentlyListeningUsers: { [key: string]: NostrEvent } = $derived.by(() => {
		const now = Date.now() / 1000;
		const recentThreshold = 10 * 60; // 10 minutes
		const userTracks: { [key: string]: NostrEvent } = {};

		$sortedEvents.forEach((event) => {
			if (now - (event.created_at || 0) <= recentThreshold) {
				if (
					!userTracks[event.pubkey] ||
					(event.created_at || 0) > (userTracks[event.pubkey].created_at || 0)
				) {
					userTracks[event.pubkey] = event;
				}
			}
		});

		return userTracks;
	});

	function formatDate(timestamp: number | undefined): string {
		if (timestamp === undefined) return 'Just now';
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'Just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getTrackInfo(event: NostrEvent) {
		const artist = event.tags.find((tag) => tag[0] === 'artist')?.[1] || 'Unknown Artist';
		const track = event.tags.find((tag) => tag[0] === 'track')?.[1] || 'Unknown Track';
		const scrobbledBy = event.pubkey;
		const art = event.tags.find((tag) => tag[0] === 'r')?.[1];
		return { artist, track, scrobbledBy, art };
	}

	onMount(async () => {
		await ndk.connect();
		await userNdk.connect();
		fetchAllEvents();
	});
</script>

<slot />

<div class="p-4">
	<div class="mb-6">
		<label for="npub" class="block text-sm font-medium text-gray-700 mb-2">Enter your npub:</label>
		<div class="flex">
			<input
				type="text"
				id="npub"
				bind:value={npub}
				placeholder="npub1..."
				class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				onclick={async () => (user = (await fetchUserEvents(npub)) ?? null)}
				class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				Fetch Stats
			</button>
		</div>
	</div>

	{#if user}
		<div class="mb-4">
			<h2 class="text-xl font-bold">Stats for: <Name {npub} /></h2>
			<div class="mt-8">
				<h2 class="text-2xl font-bold mb-6">Listening Activity 📊</h2>
				<Chart events={$sortedEvents} />
			</div>
		</div>
	{/if}

	{#if $sortedEvents.length > 0}
		<div class="">
			<div class="mb-2">
				<h2 class="text-2xl font-bold mb-6">Currently Listening Users 🎧</h2>
				<div class="space-y-4">
					{#each Object.entries(currentlyListeningUsers) as [pubkey, event] (event.id)}
						{@const { artist, track, art } = getTrackInfo(event)}
						<div
							class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors duration-300 shadow-md flex w-full items-center gap-x-4"
						>
							<div>
							{#if art}
								<img src={art} class="w-16 h-16 rounded-md" alt="album art" />
							{/if}
							</div>
							<div class="flex justify-between items-start w-full">
								<div>
									<h3 class="text-lg font-semibold text-white"><Name {pubkey} /></h3>
									<p class="text-gray-400">{track}</p>
									<p class="text-gray-400">{artist}</p>
								</div>
								<div>
									<div class="mr-4 w-16 h-16 hidden md:block">
										<Avatar {pubkey} ndk={userNdk} class="rounded-full" />
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
		<div>
			<h2 class="text-2xl font-bold mb-6">Recently Played Tracks 🎵</h2>
			<div class="space-y-4">
				{#each $sortedEvents.slice(0, 10) as event (event.id)}
					{@const { artist, track, scrobbledBy, art } = getTrackInfo(event)}
					<div
						class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors duration-300 shadow-md flex items-center gap-x-2"
					>
						{#if art}
							<img src={art} class="w-16 h-16 rounded-md" alt="album art" />
						{/if}
						<div class="flex justify-between items-start w-full">
							<div>
								<h3 class="text-lg font-semibold text-white">{track}</h3>
								<p class="text-gray-400">{artist}</p>
								<p class="text-gray-400"><Name pubkey={scrobbledBy} /></p>
							</div>
							<span class="text-sm text-gray-500 bg-gray-900 px-2 py-1 rounded-full">
								{formatDate(event.created_at)}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div>
			<h2 class="text-2xl font-bold mb-6">Recently Played Artists 🎸</h2>
			<Artists artists={$recentlyPlayedArtists.slice(0, 25)} />
		</div>
	{:else if user}
		<p class="text-gray-600">No events found for this user.</p>
	{/if}
</div>
