import { LitElement, html } from 'lit';

export class LastfmNostrForm extends LitElement {
  static properties = {
    username: { type: String },
    lastfm_api_key: { type: String },
    nsec: { type: String },
    relayUrl: { type: String },
    handleSaveConfig: { type: Function },
  };

  constructor() {
    super();
    this.username = '';
    this.lastfm_api_key = '';
    this.nsec = '';
    this.relayUrl = 'wss://relay.nostr-music.cc';
    this.handleSaveConfig = () => {
      console.log('handleSaveConfig');
    };
  }
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="bg-gray-900 text-white rounded-lg p-8 max-w-xl w-full shadow-2xl">
        <h1 class="text-purple-500 text-4xl font-bold mb-4">Last.fm Nostr Extension</h1>
        <p class="text-gray-300 mb-6 text-lg">Amplify your music experience on the decentralized web!</p>
        
        <div class="mb-8 bg-gray-800 p-6 rounded-lg">
          <h2 class="text-purple-400 text-xl font-semibold mb-4">Why Connect?</h2>
          <ul class="list-disc list-inside space-y-2 text-gray-300">
            <li>Build an open, permissionless graph of your music journey</li>
            <li>Discover listeners with similar tastes across the Nostr network</li>
            <li>Uncover new music through decentralized recommendations</li>
            <li>Own and control your listening data on the decentralized web</li>
          </ul>
        </div>

        <div class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium mb-2">Last.fm Username</label>
            <input
              type="text"
              id="username"
              .value=${this.username}
              @input=${this._handleUsernameInput}
              class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your Last.fm username"
            />
          </div>
          <div>
            <label for="lastfm_api_key" class="block text-sm font-medium mb-2">Last.fm API Key</label>
            <input
              type="text"
              id="lastfm_api_key"
              .value=${this.lastfm_api_key}
              @input=${this._handleLastfmApiKeyInput}
              class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your Last.fm API key"
            />
          </div>
          <div>
            <label for="nsec" class="block text-sm font-medium mb-2">Nostr Secret Key (nsec)</label>
            <input
              type="password"
              id="nsec"
              .value=${this.nsec}
              @input=${this._handleNsecInput}
              class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your Nostr secret key"
            />
          </div>
          <div>
            <label for="relayUrl" class="block text-sm font-medium mb-2">Relay URL</label>
            <input
              type="text"
              id="relayUrl"
              .value=${this.relayUrl}
              @input=${this._handleRelayUrlInput}
              class="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        </div>
        <button 
          @click=${this._handleConnect}
          class="w-full mt-8 bg-purple-500 text-white py-3 px-4 rounded-full font-bold text-lg hover:bg-purple-400 transition-colors duration-300 transform hover:scale-105"
        >
          Connect and Amplify Your Music Experience
        </button>
        <p class="text-gray-400 text-sm mt-4 text-center">Join the decentralized music revolution today!</p>
      </div>
    `;
  }

  _handleUsernameInput(e) {
    this.username = e.target.value;
  }

  _handleLastfmApiKeyInput(e) {
    this.lastfm_api_key = e.target.value;
  }

  _handleNsecInput(e) {
    this.nsec = e.target.value;
  }

  _handleRelayUrlInput(e) {
    this.relayUrl = e.target.value;
  }

  _handleConnect() {
    this.handleSaveConfig(this);
  }
}

customElements.define('lastfm-nostr-form', LastfmNostrForm);