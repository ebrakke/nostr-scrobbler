import "./style.css";
import './LastfmNostrForm';

function handleSaveConfig(config) {
    chrome.runtime.sendMessage({type: 'saveConfig', config:{
        LASTFM_API_KEY: config.lastfm_api_key,
        LASTFM_USERNAME: config.username,
        NOSTR_NSEC: config.nsec,
        RELAY_URL: config.relayUrl
    }}, (response) => {
        if (response && response.success) {
            console.log('Configuration saved successfully');
        } else {
            console.error('Failed to save configuration');
        }
    });
}

function loadConfig() {
    chrome.storage.local.get('config', (result) => {
        console.log('Configuration loaded', result);
        if (result.config) {
            console.log('Configuration loaded', result.config);
            document.getElementById('lastfm-nostr-form').lastfm_api_key = result.config.LASTFM_API_KEY;
            document.getElementById('lastfm-nostr-form').username = result.config.LASTFM_USERNAME;
            document.getElementById('lastfm-nostr-form').nsec = result.config.NOSTR_NSEC;
            document.getElementById('lastfm-nostr-form').relayUrl = result.config.RELAY_URL;
        }
    });
}


document.getElementById('lastfm-nostr-form').handleSaveConfig = handleSaveConfig;
loadConfig();
