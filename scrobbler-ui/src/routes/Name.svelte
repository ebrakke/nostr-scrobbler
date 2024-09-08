<script lang="ts">
  import { onMount } from 'svelte';
  import { userNdk } from '$lib';
	import { nip19 } from 'nostr-tools';
	import type { NDKUserProfile } from '@nostr-dev-kit/ndk';

  let { pubkey, npub: npubProp } = $props<{ pubkey?: string, npub?: string }>();
  let name = $state('');
  let npub = $derived(npubProp || nip19.npubEncode(pubkey));
  let profile = $state<NDKUserProfile | null>(null);
  let profileLink = $derived(profile ? `https://ditto.pub/${profile?.nip05 ? `@${profile.nip05}` : npub}` : null);

  onMount(async () => {
    profile = await userNdk.getUser({ pubkey, npub}).fetchProfile();
    name = profile?.nip05 || profile?.name || pubkey.slice(0, 8);

  });
</script>

{#if profileLink}
<a href={profileLink} target="_blank">
    <span class="text-sm text-gray-500">{name}</span>
  </a>
{:else}
  <span class="text-sm text-gray-500">{name}</span>
{/if}