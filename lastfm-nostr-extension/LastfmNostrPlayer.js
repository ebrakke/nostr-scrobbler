import { LitElement, html } from 'lit';

export class LastfmNostrPlayer extends LitElement {
  static properties = {
    npub: { type: String },
    event: { type: Object },
    lastScrobbled: { type: Object },
    isSyncing: { type: Boolean },
    onToggle: { type: Function },
    onPublish: { type: Function },
  };

  constructor() {
    super();
    this.npub = '';
    this.event = null;
    this.lastScrobbled = null;
    this.isSyncing = false;
    this.onToggle = () => {};
    this.onPublish = () => {};
    this.showRawJson = false;
    this.showJsonModal = false;
    this.modalContent = null;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const canPublish = this.event && (!this.lastScrobbled || this.event.content !== this.lastScrobbled.content);

    return html`
      <div class="bg-gray-800 text-green-400 font-mono border-2 border-gray-600 rounded-lg p-5 w-full h-full">
        <h2 class="text-2xl mb-4 font-bold text-green-400 animate-pulse">Now Playing</h2>
        
        <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm break-all">
          <p>Nostr Public Key:</p>
          <p class="text-xs">${this.npub}</p>
        </div>

        <div class="flex justify-between items-center mb-4">
          <span>Sync Status:</span>
          <div class="flex items-center">
            ${this.isSyncing ? this.renderTurntable() : ''}
            <button
              @click=${this._handleToggleSync}
              class="ml-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
              style="background-color: ${this.isSyncing ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'};"
            >
              ${this.isSyncing ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        ${this.event
          ? html`
              <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm">
                <p class="font-bold">Current Playing:</p>
                <p>${this.event.content}</p>
                ${canPublish
                  ? html`
                      <button
                        @click=${this._handlePublish}
                        class="mt-2 bg-green-600 text-black border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                      >
                        Publish
                      </button>
                    `
                  : ''}
                <button
                  @click=${() => this._showJsonModal(this.event)}
                  class="mt-2 ml-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                >
                  Show Raw JSON
                </button>
                </div>
              `
            : html`
              <p class="bg-gray-900 border border-green-400 p-3 text-sm italic">No current scrobble event</p>
            `
        }
        ${this.showJsonModal ? this._renderJsonModal() : ''}

        ${this.lastScrobbled
          ? html`
              <div class="bg-gray-900 border border-green-400 p-3 mb-3 text-sm">
                <p class="font-bold">Last Scrobbled:</p>
                <p>${this.lastScrobbled.content}</p>
                <button
                  @click=${() => this._showJsonModal(this.lastScrobbled)}
                  class="mt-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                >
                  Show Raw JSON
                </button>
              </div>
            `
          : ''
        }
      </div>
    `;
  }

  renderTurntable() {
    return html`
      <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    `;
  }

  _handleToggleSync() {
    this.onToggle(!this.isSyncing);
  }

  _handlePublish() {
    if (this.event && (!this.lastScrobbled || this.event.content !== this.lastScrobbled.content)) {
      this.onPublish(this.event);
    }
  }

  _showJsonModal(content) {
    this.modalContent = content;
    this.showJsonModal = true;
    this.requestUpdate();
  }

  _hideJsonModal() {
    this.showJsonModal = false;
    this.modalContent = null;
    this.requestUpdate();
  }

  _renderJsonModal() {
    return html`
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-gray-800 border-2 border-green-400 rounded-lg p-4 max-w-3xl w-full max-h-[80vh] flex flex-col">
          <div class="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 z-10 pb-2">
            <h3 class="text-xl font-bold text-green-400">Raw JSON</h3>
            <div>
              <button
                @click=${this._copyJsonToClipboard}
                class="mr-2 bg-gray-700 text-green-400 border-2 border-green-400 rounded px-3 py-1 text-sm transition-colors duration-300 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
              >
                Copy JSON
              </button>
              <button
                @click=${this._hideJsonModal}
                class="text-green-400 hover:text-green-300 focus:outline-none"
              >
                ✕
              </button>
            </div>
          </div>
          <div class="bg-gray-900 p-4 rounded-lg overflow-x-auto flex-grow">
            ${this._renderJsonTree(this.modalContent)}
          </div>
        </div>
      </div>
    `;
  }

  _toggleRawJson() {
    this.showRawJson = !this.showRawJson;
    this.requestUpdate();
  }

  _toggleLastScrobbledRawJson() {
    this.showLastScrobbledRawJson = !this.showLastScrobbledRawJson;
    this.requestUpdate();
  }

  _renderJsonTree(obj, level = 0) {
    if (typeof obj !== 'object' || obj === null) {
      return html`<span class="text-green-300">${JSON.stringify(obj)}</span>`;
    }

    const indent = '  '.repeat(level);
    const entries = Object.entries(obj);

    return html`
      ${obj instanceof Array ? '[' : '{'}
      ${entries.map(([key, value], index) => html`
        <div style="padding-left: ${level * 10}px;">
          ${obj instanceof Array ? '' : html`<span class="text-blue-300">"${key}"</span>: `}
          ${typeof value === 'object' && value !== null
            ? this._renderJsonTree(value, level + 1)
            : html`<span class="text-green-300">${JSON.stringify(value)}</span>`}${index < entries.length - 1 ? ',' : ''}
        </div>
      `)}
      <div style="padding-left: ${(level - 1) * 10}px;">${obj instanceof Array ? ']' : '}'}</div>
    `;
  }

  _copyJsonToClipboard() {
    const jsonString = JSON.stringify(this.modalContent, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      // Optionally, you can show a temporary message to indicate successful copying
      alert('JSON copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy JSON: ', err);
    });
  }
}

customElements.define('lastfm-nostr-player', LastfmNostrPlayer);
