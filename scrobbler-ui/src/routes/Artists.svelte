<script lang="ts">
  import type { ArtistPlayCount } from '$lib/index';

  let { artists }: { artists: ArtistPlayCount[] } = $props();

  const placeholderImage = '/record.jpg';
</script>

<div class="grid md:grid-cols-2 gap-4">
  {#each artists as { artist, playCount, imageUrl }}
    <div class="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors duration-300 cursor-pointer">
      <div class="aspect-square relative">
        <img
          src={imageUrl || placeholderImage}
          alt={artist}
          class="w-full h-full object-cover"
        />
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <h3 class="text-white font-bold truncate">{artist}</h3>
          <p class="text-gray-300 text-sm">
            {playCount} {playCount === 1 ? 'play' : 'plays'}
          </p>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  /* Add any additional custom styles here if needed */
</style>
