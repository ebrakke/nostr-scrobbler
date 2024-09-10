<script>
  export let npub = '';
  export let event = null;
  export let lastScrobbled = null;
  export let isSyncing = false;
  export let onToggle = () => {};
  export let onPublish = () => {};

  let showJsonModal = false;
  let modalContent = null;

  function handleToggleSync() {
    onToggle(!isSyncing);
    isSyncing = !isSyncing;
  }

  function handlePublish() {
    if (event && (!lastScrobbled || event.content !== lastScrobbled.content)) {
      onPublish(event);
    }
  }

  function showModal(content) {
    modalContent = content;
    showJsonModal = true;
  }

  function hideModal() {
    showJsonModal = false;
    modalContent = null;
  }

  function copyJsonToClipboard() {
    const jsonString = JSON.stringify(modalContent, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => alert('JSON copied to clipboard!'))
      .catch(err => console.error('Failed to copy JSON: ', err));
  }

  function renderJsonTree(obj, level = 0) {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }

    const entries = Object.entries(obj);

    return `
      ${obj instanceof Array ? '[' : '{'}
      ${entries.map(([key, value], index) => `
        <div style="padding-left: ${level * 10}px;">
          ${obj instanceof Array ? '' : `<span class="text-blue-300">"${key}"</span>: `}
          ${typeof value === 'object' && value !== null
            ? renderJsonTree(value, level + 1)
            : `<span class="text-green-300">${JSON.stringify(value)}</span>`}${index < entries.length - 1 ? ',' : ''}
        </div>
      `).join('')}
      <div style="padding-left: ${(level - 1) * 10}px;">${obj instanceof Array ? ']' : '}'}</div>
    `;
  }
</script>

<div class="bg-gray-800 text-green-400 font-mono border-2 border-gray-600 rounded-lg p-5 w-full h-full">
  <h2 class="text-2xl mb-4 font-bold text-green-400 animate-pulse">Now Playing</h2>
  
  <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm break-all">
    <p>Nostr Public Key:</p>
    <p class="text-xs">{npub}</p>
  </div>

  <div class="flex justify-between items-center mb-4">
    <span>Sync Status:</span>
    <div class="flex items-center">
      {#if isSyncing}
        <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      {/if}
      <button
        on:click={handleToggleSync}
        class="ml-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
        style="background-color: {isSyncing ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'};"
      >
        {isSyncing ? 'Stop' : 'Start'}
      </button>
    </div>
  </div>

  {#if event}
    <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm">
      <p class="font-bold">Current Playing:</p>
      <p>{event.content}</p>
      {#if !lastScrobbled || event.content !== lastScrobbled.content}
        <button
          on:click={handlePublish}
          class="mt-2 bg-green-600 text-black border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
        >
          Publish
        </button>
      {/if}
      <button
        on:click={() => showModal(event)}
        class="mt-2 ml-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
      >
        Show Raw JSON
      </button>
    </div>
  {:else}
    <p class="bg-gray-900 border border-green-400 p-3 text-sm italic">No current scrobble event</p>
  {/if}

  {#if lastScrobbled}
    <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm">
      <p class="font-bold">Last Scrobbled:</p>
      <p>{lastScrobbled.content}</p>
      <button
        on:click={() => showModal(lastScrobbled)}
        class="mt-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
      >
        Show Raw JSON
      </button>
    </div>
  {/if}
</div>

{#if showJsonModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 border-2 border-green-400 rounded-lg p-4 max-w-3xl w-full max-h-[80vh] flex flex-col">
      <div class="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 z-10 pb-2">
        <h3 class="text-xl font-bold text-green-400">Raw JSON</h3>
        <div>
          <button
            on:click={copyJsonToClipboard}
            class="mr-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
          >
            Copy JSON
          </button>
          <button
            on:click={hideModal}
            class="text-green-400 hover:text-green-300 focus:outline-none"
          >
            ✕
          </button>
        </div>
      </div>
      <div class="bg-gray-900 p-4 rounded-lg overflow-x-auto flex-grow text-white">
        {@html renderJsonTree(modalContent)}
      </div>
    </div>
  </div>
{/if}