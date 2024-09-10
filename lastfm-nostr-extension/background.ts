import NDK, {
  NDKEvent,
  NDKKind,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import {
  Subject,
  interval,
  from,
  BehaviorSubject,
  combineLatest,
  of,
  concat,
  merge,
} from "rxjs";
import {
  switchMap,
  filter,
  tap,
  catchError,
  withLatestFrom,
  shareReplay,
  map,
  debounceTime,
  startWith,
  take,
} from "rxjs/operators";

type Config = {
  LASTFM_API_KEY: string;
  LASTFM_USERNAME: string;
  NOSTR_NSEC: string;
  RELAY_URL: string;
};

const config$$ = new BehaviorSubject<Config | null>(null);
const isSyncing$$ = new BehaviorSubject<boolean>(false);
const nowPlaying$$ = new BehaviorSubject<any | null>(null);
const publishEventQueue$$ = new Subject<void>();
const lastPlayed$$ = new BehaviorSubject<string | null>(null);
const ndk$$ = new BehaviorSubject<NDK | null>(null);
const ndk$ = ndk$$.pipe(filter((n) => !!n));

const INTERVAL = 20000;

// Function to initialize NDK
async function initializeNDK(config: Config) {
  if (!config.NOSTR_NSEC) return;
  try {
    const privateKey = nip19.decode(config.NOSTR_NSEC).data as string;
    const signer = new NDKPrivateKeySigner(privateKey);
    const ndk = new NDK({ explicitRelayUrls: [config.RELAY_URL], signer });
    ndk.activeUser = await signer.user();
    await ndk.connect();
    ndk$$.next(ndk);
  } catch (error) {
    console.error("Error initializing NDK", error);
  }
}

// Function to fetch Last.fm now playing
async function fetchNowPlaying(): Promise<any> {
  const config = await getConfig();
  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${config.LASTFM_USERNAME}&api_key=${config.LASTFM_API_KEY}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const mostRecent = data.recenttracks.track[0];
  return mostRecent;
}

// Function to convert Last.fm scrobble to Nostr event
function scrobbleToNostrEvent(scrobble: any, ndk: NDK): NDKEvent {
  const content = `${scrobble.name} by ${scrobble.artist["#text"]}`;
  const tags = [
    ["r", scrobble.image[2]["#text"]],
    ["artist", scrobble.artist["#text"]],
    ["album", scrobble.album["#text"]],
    ["track", scrobble.name],
  ];
  if (scrobble.mbid) {
    tags.push(["i", `mbid:recording:${scrobble.mbid}`]);
  }
  if (scrobble.album.mbid) {
    tags.push(["i", `mbid:release:${scrobble.album.mbid}`]);
  }

  const event = new NDKEvent(ndk);
  event.kind = 2002;
  event.created_at = Math.floor(Date.now() / 1000);
  event.tags = tags;
  event.content = content;

  return event;
}
async function fetchLatestEvent(ndk: NDK) {
  if (!ndk) return null;
  const events = await ndk.fetchEvents({
    kinds: [2002 as NDKKind],
    authors: [ndk.activeUser!.pubkey],
    limit: 1,
  });
  if (events.size === 0) return null;
  return Array.from(events.values())[0];
}

const nowPlaying$ = merge(
  isSyncing$$.pipe(filter(Boolean), tap(() => console.log("Syncing"))),
  interval(INTERVAL)
).pipe(
  withLatestFrom(config$$, isSyncing$$, ndk$),
  filter(
    ([_, config, isSyncing]) =>
      isSyncing && !!config?.LASTFM_API_KEY && !!config?.LASTFM_USERNAME
  ),
  switchMap(() => from(fetchNowPlaying())),
  filter((nowPlaying) => !!nowPlaying),
  tap((nowPlaying) => nowPlaying$$.next(nowPlaying)),
  shareReplay(1)
);

const event$$ = new Subject<NDKEvent>();
const event$ = merge(event$$, nowPlaying$.pipe(
  withLatestFrom(lastPlayed$$, ndk$),
  filter(([nowPlaying, lastPlaying]) => nowPlaying.content !== lastPlaying),
  map(([nowPlaying, _, ndk]) => scrobbleToNostrEvent(nowPlaying, ndk!)),
  tap((event) => setLastEvent(event)),
  shareReplay(1)
));

const publish$ = publishEventQueue$$.pipe(
  debounceTime(1000),
  withLatestFrom(event$),
  switchMap(([_, event]) => combineLatest([from(event.publish()), of(event)])),
  map(([_, event]) => event)
);

const lastScrobbled$ = combineLatest([
  config$$.pipe(filter((config) => !!config?.NOSTR_NSEC)),
  publish$.pipe(startWith(null)),
  ndk$,
]).pipe(
  switchMap(([_, event, ndk]) => {
    if (event) {
      return of(event);
    }
    return from(fetchLatestEvent(ndk));
  }),
  filter((event) => !!event),
  shareReplay(1)
);

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "saveConfig") {
    saveConfig(request.config);
    config$$.next(request.config);
    sendResponse({ success: true });
  } else if (request.type === "toggleSync") {
    const isSyncing = await getIsSyncing();
    await setIsSyncing(!isSyncing);
    isSyncing$$.next(!isSyncing);
    return true;
  } else if (request.type === "publish") {
    publishEventQueue$$.next();
    return true;
  } 
});

// Update the onInstalled listener
chrome.runtime.onInstalled.addListener(async () => {
  chrome.runtime.openOptionsPage();
});

async function getConfig() {
  const { config } = await chrome.storage.local.get("config");
  return config as Config;
}

async function saveConfig(config: Config) {
  await chrome.storage.local.set({ config });
}

async function setIsSyncing(isSyncing: boolean) {
  await chrome.storage.local.set({ isSyncing });
}

async function getIsSyncing() {
  const { isSyncing } = await chrome.storage.local.get("isSyncing");
  return isSyncing;
}

async function getLastEvent() {
  const { lastEvent } = await chrome.storage.local.get("lastEvent");
  return lastEvent;
}

async function setLastEvent(event: NDKEvent) {
  await chrome.storage.local.set({ lastEvent: event.rawEvent() });
}

function sendEventMessage(e: NDKEvent) {
  chrome.runtime.sendMessage({ type: "event", event: e.rawEvent() });
}

function setLastScrobbled(e: NDKEvent) {
  chrome.runtime.sendMessage({ type: "lastScrobbled", event: e.rawEvent() });
  chrome.storage.local.set({ lastScrobbled: e.rawEvent() });
}

getConfig().then(async (c) => {
  if (c) {
    await setIsSyncing(false);
    config$$.next(c);
    await initializeNDK(c);
    const ndk = ndk$$.getValue();
    event$.subscribe((e) => {
      sendEventMessage(e);
      setLastEvent(e);
    });
    publish$.subscribe((e) => console.log("Published event", e));
    lastScrobbled$.subscribe((e) => {
      if (e) {
        setLastScrobbled(e);
      }
    });
    nowPlaying$.subscribe((n) => console.log("Now playing", n));
    const lastEvent = await getLastEvent();
    if (lastEvent) {
      console.log("Last event", lastEvent);
      event$$.next(new NDKEvent(ndk!, lastEvent));
    }
  } else {
    chrome.runtime.openOptionsPage();
  }
});
