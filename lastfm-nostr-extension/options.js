import "./style.css";
import LastfmNostrForm from "./LastfmNostrForm.svelte";

const lastfmNostrFormSvelte = new LastfmNostrForm({
  target: document.getElementById("lastfm-nostr-form-svelte"),
  props: {
    handleSaveConfig: handleSaveConfig,
  },
});

function handleSaveConfig(config) {
  chrome.runtime.sendMessage(
    {
      type: "saveConfig",
      config: {
        LASTFM_API_KEY: config.lastfm_api_key,
        LASTFM_USERNAME: config.username,
        NOSTR_NSEC: config.nsec,
        RELAY_URL: config.relayUrl,
      },
    },
    (response) => {
      if (response && response.success) {
        console.log("Configuration saved successfully");
        window.close();
      } else {
        console.error("Failed to save configuration");
      }
    }
  );
}

function loadConfig() {
  chrome.storage.local.get("config", (result) => {
    if (result.config) {
      lastfmNostrFormSvelte.$set({
        lastfm_api_key: result.config.LASTFM_API_KEY,
        username: result.config.LASTFM_USERNAME,
        nsec: result.config.NOSTR_NSEC,
        relayUrl: result.config.RELAY_URL,
      });
    }
  });
}

loadConfig();
