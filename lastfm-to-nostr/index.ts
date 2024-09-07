import { config } from 'dotenv';
import { SimplePool, getPublicKey, getEventHash, finalizeEvent, nip19, type EventTemplate } from 'nostr-tools';

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
const privateKey = nip19.decode(NOSTR_NSEC).data as Uint8Array;
const publicKey = getPublicKey(privateKey);

// Function to fetch Last.fm scrobbles
async function getLastFmScrobbles(page = 1, limit = 200): Promise<any[]> {
  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&page=${page}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.recenttracks.track;
}

// Function to convert Last.fm scrobble to Nostr event
function scrobbleToNostrEvent(scrobble: any) {
  const content = `${scrobble.name} by ${scrobble.artist['#text']}`;
  const timestamp = parseInt(scrobble.date.uts);
  const tags = [
    ['i', `mbid:recording:${scrobble.mbid}`],
    ['artist', scrobble.artist['#text']],
    ['album', scrobble.album['#text']],
    ['track', scrobble.name],
  ]
  const event: EventTemplate = {
    kind: 2002,
    created_at: timestamp,
    tags,
    content
  };

  const signedEvent = finalizeEvent(event, privateKey);
  return signedEvent;
}

// Function to publish event to a relay
async function publishToRelay(event: any, relayUrl: string) {
  const pool = new SimplePool();
  await Promise.all(pool.publish([relayUrl], event));
}

// Main function
async function main() {
  const relayUrl = 'ws://localhost:8081'; // Example relay, you can change this
  let page = 1;
  let scrobbles: any[];

  
  do {
    scrobbles = await getLastFmScrobbles(page);
    for (const scrobble of scrobbles) {
      const event = scrobbleToNostrEvent(scrobble);
      await publishToRelay(event, relayUrl);
      console.log(`Published scrobble: ${scrobble.name} by ${scrobble.artist['#text']}`);
    }
    page++;
    await Bun.sleep(1000);
  } while (scrobbles.length > 0);

  console.log('Finished publishing all scrobbles');
}

main().catch(console.error);