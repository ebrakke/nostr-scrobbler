import {nip19, getPublicKey} from 'nostr-tools';
import './style.css'
import './LastfmNostrPlayer.js';

async function handleToggle() {
    chrome.runtime.sendMessage({type: 'toggleSync'});
    lastfmNostrPlayer.isSyncing = !lastfmNostrPlayer.isSyncing;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'toggleSync') {
        lastfmNostrPlayer.isSyncing = request.isSyncing
    }
    if (request.type === 'event') {
        lastfmNostrPlayer.event = request.event;
    }
    if (request.type === 'lastScrobbled') {
        console.log("Received last scrobbled message", request.event);
        lastfmNostrPlayer.lastScrobbled = request.event;
    }
});

const lastfmNostrPlayer = document.getElementById('lastfm-nostr-player');

function handlePublish() {
    chrome.runtime.sendMessage({type: 'publish' });
}

function loadConfig() {
    chrome.storage.local.get('config', (result) => {
        if (!result.config) return
        const sk = nip19.decode(result.config.NOSTR_NSEC).data
        const pk = getPublicKey(sk)
        lastfmNostrPlayer.npub = nip19.npubEncode(pk);
    });
    chrome.storage.local.get('isSyncing', (result) => {
        lastfmNostrPlayer.isSyncing = result.isSyncing;
    });
    chrome.storage.local.get('lastScrobbled', (result) => {
        lastfmNostrPlayer.lastScrobbled = result.lastScrobbled;
    });
}

loadConfig();

lastfmNostrPlayer.onToggle = handleToggle;
lastfmNostrPlayer.onPublish = handlePublish;

