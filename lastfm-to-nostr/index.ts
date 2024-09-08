import { config } from 'dotenv';
import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

// Load environment variables
config();

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USERNAME = process.env.LASTFM_USERNAME;
const NOSTR_NSEC = process.env.NOSTR_NSEC;

if (!LASTFM_API_KEY || !LASTFM_USERNAME || !NOSTR_NSEC) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Decode the nsec to get the private key
const privateKey = nip19.decode(NOSTR_NSEC).data as string;
const signer = new NDKPrivateKeySigner(privateKey);

// Function to fetch Last.fm scrobbles
async function getLastFmScrobbles(page = 1, limit = 200): Promise<any[]> {
  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&page=${page}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.recenttracks.track;
}

// Function to convert Last.fm scrobble to Nostr event
function scrobbleToNostrEvent(scrobble: any, ndk: NDK): NDKEvent {
  const content = `${scrobble.name} by ${scrobble.artist['#text']}`;
  const timestamp = parseInt(scrobble.date.uts);
  const tags = [
    ['i', `mbid:recording:${scrobble.mbid}`],
    ['artist', scrobble.artist['#text']],
    ['album', scrobble.album['#text']],
    ['track', scrobble.name],
  ];
  
  const event = new NDKEvent(ndk);
  event.kind = 2002;
  event.created_at = timestamp;
  event.tags = tags;
  event.content = content;

  return event;
}

// Function to fetch existing scrobble events from the relay
async function getExistingScrobbles(ndk: NDK): Promise<Set<number>> {
  const events = await ndk.fetchEvents({
    kinds: [2002 as NDKKind],
    authors: [ndk.activeUser!.pubkey as string],
  });
  
  return new Set(Array.from(events).map(event => event.created_at as number));
}

// Main function
async function main() {
  const relayUrl = 'wss://relay.nostr-music.cc'; // Example relay, you can change this
  const ndk = new NDK({ explicitRelayUrls: [relayUrl], signer });
  await ndk.connect();

  let page = 1;
  let scrobbles: any[];

  // Fetch existing scrobbles
  const existingScrobbles = await getExistingScrobbles(ndk);
  console.log(`Found ${existingScrobbles.size} existing scrobbles`);

  do {
    scrobbles = await getLastFmScrobbles(page);
    for (const scrobble of scrobbles) {
      const timestamp = parseInt(scrobble.date.uts);
      
      // Check if the scrobble already exists
      if (!existingScrobbles.has(timestamp)) {
        const event = scrobbleToNostrEvent(scrobble, ndk);
        await event.publish();
        console.log(`Published scrobble: ${scrobble.name} by ${scrobble.artist['#text']}`);
      } else {
        console.log(`Skipping duplicate scrobble: ${scrobble.name} by ${scrobble.artist['#text']}`);
      }
    }
    page++;
    await Bun.sleep(2000)
  } while (scrobbles.length > 0);

  console.log('Finished publishing all new scrobbles');
}

main().catch(console.error);