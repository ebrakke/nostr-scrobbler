# NUD (Nostr Unofficial Document) for Scrobbling

This repository contains projects and specifications related to music scrobbling on the Nostr protocol.

## Scrobble Event (NUD-2002)

The Scrobble Event is a proposed Nostr event type for recording music listening activity.

### Event Type

- **Kind**: 2002

```json
{
  "id": "61d01c796fe4f0a4a62db13e26d5923e029a53f352b3cbe74593df9bbe67397e",
  "pubkey": "2ce6f968e7029ac9d347202fdc203ed12e8373ad602fa4f2e4492214a006bf13",
  "created_at": 1723416627,
  "kind": 2002,
  "tags": [
    [
      "album",
      "Muchacho de Lujo"
    ],
    [
      "track",
      "The Quotidian Beasts"
    ],
    [
      "artist",
      "Phosphorescent"
    ],
    [
      "i",
      "mbid:artist:739da2f1-0741-4c60-a6ed-f42d49bf2eb1"
    ],
    [
      "i",
      "mbid:release_group:ba3647fa-e82e-4e39-811d-66307f9f2c42"
    ],
    [
      "i",
      "mbid:release:a1812b30-e3ea-4ea7-b7bd-f2f3bfdc08f0"
    ],
    [
      "r",
      "https://coverartarchive.org/release-group/ba3647fa-e82e-4e39-811d-66307f9f2c42/front"
    ]
  ],
  "content": "Phosphorescent - The Quotidian Beasts",
  "sig": "eb359d95e3a321b8cfb95adafba95a14010941430edd4b3c015b1f0650bfe39a5cf149593ca1c4771a0bc1a983ba0315b91acd705efa243f0bebe2b3e59a5632"
}
```


Audio Events - from [Add audio track NIP](https://github.com/nostr-protocol/nips/pull/1043)
---------------

```json
{
  "id": <event_id>,
  "pubkey": <author_pubkey>,
  "created_at": <created_at>,
  "kind": 31337,
  "content": "Chill beats",
  "tags": [
    ["d", "<id>"],
    ["c", "Pop", "genre"],
    ["c", "EDM", "subgenre"],
    ["c", "Columbia Records", "record_label"],
    ["c", "AC/DC", "artist"],
    ["i", "podcast:item:guid:123", "https://fountain.fm/episode/30uEXC25615Ze2ELjY2p"],
    ["p", "2a07724d42fd8004b5c97b62ba03b6baf3919f9e8211667039987866997e97ad", "wss://my-relay.com", "AC/DC"],
    ["title", "Platinum Robots on the Moon"],
    ["subject", "Platinum Robots on the Moon"],
    ["published_at", "<published_at>"],
    ["imeta", "url https://example.com/my-track.m3u8", "x <hash>", ...]
  ]
}
```

Music Playlist
---------------
| Music Playlist | 30037 | a list of kind `31337` music tracks | `"a"` (kind:31337 music tracks)