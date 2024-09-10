import {nip19, getPublicKey} from 'nostr-tools';
import './style.css'
import LastfmNostrPlayer from './LastfmNostrPlayer.svelte';

async function handleToggle() {
    chrome.runtime.sendMessage({type: 'toggleSync'});

}
function handlePublish() {
    chrome.runtime.sendMessage({type: 'publish' });
}

const lastfmNostrPlayerSvelte$ = document.getElementById('lastfm-nostr-player-svelte');
    const lastfmNostrPlayerSvelte = new LastfmNostrPlayer({
        target: lastfmNostrPlayerSvelte$,
        props: {
            onToggle: handleToggle,
            onPublish: handlePublish
        }
    });
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'toggleSync') {
        lastfmNostrPlayerSvelte.$set({isSyncing: request.isSyncing});
    }
    if (request.type === 'event') {
        lastfmNostrPlayerSvelte.$set({event: request.event});
    }
    if (request.type === 'lastScrobbled') {
        lastfmNostrPlayerSvelte.$set({lastScrobbled: request.event});
    }
});



function loadConfig() {
    chrome.storage.local.get('config', (result) => {
        if (!result.config) return
        const sk = nip19.decode(result.config.NOSTR_NSEC).data
        const pk = getPublicKey(sk)
        lastfmNostrPlayerSvelte.$set({npub: nip19.npubEncode(pk)});
    });
    chrome.storage.local.get('isSyncing', (result) => {
        lastfmNostrPlayerSvelte.$set({isSyncing: result.isSyncing});
    });
    chrome.storage.local.get('lastScrobbled', (result) => {
        lastfmNostrPlayerSvelte.$set({lastScrobbled: result.lastScrobbled});
    });
    chrome.storage.local.get('lastEvent', (result) => {
        lastfmNostrPlayerSvelte.$set({event: result.lastEvent});
    });
}

loadConfig();

