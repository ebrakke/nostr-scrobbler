import { hexToBytes } from '@noble/hashes/utils'
import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk'
import * as dotenv from 'dotenv'
import { v4 as uuid } from 'uuid'

dotenv.config()

const privateKey = process.env.PRIVATE_KEY!
const ndk = new NDK({
  explicitRelayUrls: ['wss://relay.nostr-music.cc'],
  signer: new NDKPrivateKeySigner(hexToBytes(privateKey))
})

async function queryScrobbleEvents(): Promise<NDKEvent[]> {
  await ndk.connect()
  const events = await ndk.fetchEvents({
    kinds: [2002 as NDKKind],
    limit: 10,
  })
  return Array.from(events)
}

function convertToAudioTrack(scrobbleEvent: NDKEvent): NDKEvent {
  const audioTrack = new NDKEvent(ndk)
  audioTrack.kind = 31337
  audioTrack.content = `${scrobbleEvent.tagValue('artist')} - ${scrobbleEvent.tagValue('track')}`
  audioTrack.created_at = Math.floor(new Date().getTime() / 1000)

  const tag = scrobbleEvent.tags.find(tag => tag[0] === 'i' && tag[1].startsWith('mbid:recording')) || []
  const id = tag[1]?.split(':')[2] ?? uuid()

  audioTrack.tags = [
    ['d', id],
    ['c', 'title', scrobbleEvent.tagValue('track')!],
    ['i', scrobbleEvent.tagValue('i')!]
  ]
  if (scrobbleEvent.tagValue('album')) {
    audioTrack.tags.push(['c','album', scrobbleEvent.tagValue('album')!])
  }
  if (scrobbleEvent.tagValue('artist')) {
    audioTrack.tags.push(['c', 'artist', scrobbleEvent.tagValue('artist')!])
  }

  // Add MusicBrainz IDs if available
  scrobbleEvent.tags
    .filter(tag => tag[0] === 'i' && tag[1].startsWith('mbid:'))
    .forEach(tag => {
      audioTrack.tags.push(['i', tag[1]])
    })

  // Add cover art if available
  const coverArt = scrobbleEvent.tagValue('r')
  if (coverArt) {
    audioTrack.tags.push(['imeta', `url ${coverArt}`])
  }

  return audioTrack
}

async function publishAudioTrack(audioTrack: NDKEvent) {
  try {
    await audioTrack.publish()
    console.log(`Audio track ${audioTrack.id} published successfully`)
  } catch (error) {
    console.error(`Failed to publish audio track: ${error}`)
  }
}

async function main() {
  try {
    await ndk.connect()
    const scrobbleEvents = await queryScrobbleEvents()
    console.log(`Found ${scrobbleEvents.length} scrobble events`)

    for (const scrobbleEvent of scrobbleEvents) {
      const audioTrack = convertToAudioTrack(scrobbleEvent)
      console.log(audioTrack.rawEvent())
    //   await publishAudioTrack(audioTrack)
    }

    console.log('All audio tracks published')
  } catch (error) {
    console.error('Error:', error)
  } finally {
  }
}

main()
