<script>
  import { nip19, generateSecretKey, getPublicKey } from "nostr-tools";

  export let username = "";
  export let lastfm_api_key = "";
  export let nsec = "";
  export let relayUrl = "wss://relay.nostr-music.cc";
  export let handleSaveConfig = () => {};

  let npub = "";
  let showCopyMessage = false;

  $: if (nsec && nsec !== "") {
    try {
      const sk = nip19.decode(nsec).data;
      npub = nip19.npubEncode(getPublicKey(sk));
    } catch (error) {
      console.error("Error decoding nsec:", error);
    }
  }

  function _handleConnect() {
    handleSaveConfig({ username, lastfm_api_key, nsec, relayUrl });
  }

  function _handleGenerateKeys() {
    const sk = generateSecretKey();
    nsec = nip19.nsecEncode(sk);
    npub = nip19.npubEncode(getPublicKey(sk));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showCopyMessage = true;
    setTimeout(() => (showCopyMessage = false), 3000);
  }
</script>

<div class="bg-gray-900 text-white rounded-lg p-8 max-w-xl w-full shadow-2xl">
  <p class="text-gray-300 mb-6 text-lg">
    Amplify your music experience on the decentralized web!
  </p>

  <div class="mb-8 bg-gray-800 p-6 rounded-lg">
    <h2 class="text-purple-400 text-xl font-semibold mb-4">Why Connect?</h2>
    <ul class="list-disc list-inside space-y-2 text-gray-300">
      <li>Build an open, permissionless graph of your music journey</li>
      <li>Discover listeners with similar tastes across the Nostr network</li>
      <li>Own and control your listening data on the decentralized web</li>
    </ul>
  </div>

  <div class="space-y-4">
    <div>
      <label for="username" class="block text-sm font-medium mb-2"
        >Last.fm Username</label
      >
      <input
        type="text"
        id="username"
        bind:value={username}
        class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Your Last.fm username"
      />
    </div>
    <div>
      <label for="lastfm_api_key" class="block text-sm font-medium mb-2"
        >Last.fm API Key</label
      >
      <input
        type="text"
        id="lastfm_api_key"
        bind:value={lastfm_api_key}
        class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Your Last.fm API key"
      />
    </div>
    <div>
      <label for="nsec" class="block text-sm font-medium mb-2"
        >Nostr Secret Key (nsec)</label
      >
      <div class="flex space-x-2">
        <input
          type="password"
          id="nsec"
          bind:value={nsec}
          class="flex-grow px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Your Nostr secret key"
        />
        <button
          on:click={() => copyToClipboard(nsec)}
          class="px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600"
          title="Copy nsec"
        >
          📋
        </button>
      </div>
    </div>
    <div>
      <label for="npub" class="block text-sm font-medium mb-2"
        >Nostr Public Key (npub)</label
      >
      <div class="flex space-x-2">
        <input
          type="text"
          id="npub"
          value={npub}
          readonly
          class="flex-grow px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Your Nostr public key"
        />
        <button
          on:click={() => copyToClipboard(npub)}
          class="px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600"
          title="Copy npub"
        >
          📋
        </button>
      </div>
    </div>
    <button
      on:click={_handleGenerateKeys}
      class="w-full bg-blue-500 text-white py-2 px-4 rounded-md font-bold hover:bg-blue-400 transition-colors duration-300"
    >
      Generate New Nostr Keys
    </button>

    {#if showCopyMessage}
      <p class="text-green-400 text-sm text-center">Copied to clipboard!</p>
    {/if}

    {#if nsec}
      <p class="text-yellow-400 text-sm text-center">
        Important: Save your nsec (secret key) in a secure password manager. You
        can use this nsec to login to different NOSTR clients. If you want to
        setup a profile associated with these keys, you can use a NOSTR client
        like <a
          href="https://ditto.pub"
          class="text-blue-400 hover:text-blue-300"
          target="_blank">Ditto</a
        > and login with your nsec.
      </p>
    {/if}

    <div>
      <label for="relayUrl" class="block text-sm font-medium mb-2"
        >Relay URL</label
      >
      <input
        type="text"
        id="relayUrl"
        bind:value={relayUrl}
        class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
    <button
      on:click={_handleConnect}
      class="w-full mt-8 bg-purple-500 text-white py-3 px-4 rounded-full font-bold text-lg hover:bg-purple-400 transition-colors duration-300 transform hover:scale-105"
    >
      Connect and Amplify Your Music Experience
    </button>
    <p class="text-gray-400 text-sm mt-4 text-center">
      Join the decentralized music revolution today!
    </p>
  </div>
</div>
