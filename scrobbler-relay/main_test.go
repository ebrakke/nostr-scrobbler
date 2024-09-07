package main

import (
	"context"
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nbd-wtf/go-nostr"
)

var (
	artists = []string{
		"The Beatles", "Queen", "Pink Floyd", "Led Zeppelin", "Radiohead",
		"David Bowie", "Nirvana", "The Rolling Stones", "Coldplay", "U2",
		"Metallica", "Muse", "Arctic Monkeys", "Oasis", "The Killers",
		"Foo Fighters", "Red Hot Chili Peppers", "Green Day", "The Strokes", "Blur",
		"Arcade Fire", "Tame Impala", "The White Stripes", "Gorillaz", "Daft Punk",
	}
	songs = []string{
		"Bohemian Rhapsody", "Stairway to Heaven", "Imagine", "Comfortably Numb", "Hey Jude",
		"Space Oddity", "Smells Like Teen Spirit", "(I Can't Get No) Satisfaction", "Viva la Vida", "With or Without You",
		"Enter Sandman", "Supermassive Black Hole", "Do I Wanna Know?", "Wonderwall", "Mr. Brightside",
		"Everlong", "Californication", "American Idiot", "Last Nite", "Song 2",
		"Wake Up", "The Less I Know The Better", "Seven Nation Army", "Feel Good Inc.", "Get Lucky",
	}
)

func TestGenerateAndPublishScrobbles(t *testing.T) {
	relay, err := nostr.RelayConnect(context.Background(), "ws://relay.home.lan")
	if err != nil {
		t.Fatalf("Failed to connect to relay: %v", err)
	}
	defer relay.Close()

	// Generate and publish 10 random scrobbles
	for i := 0; i < 10000; i++ {
		event := generateRandomScrobble()
		fmt.Printf("%v\n", event)
		err := relay.Publish(context.Background(), *event)
		if err != nil {
			t.Errorf("Failed to publish event: %v", err)
		} else {
			t.Logf("Published scrobble: %s - %s by %s", event.Tags.GetFirst([]string{"artist"}), event.Tags.GetFirst([]string{"track"}), event.PubKey)
		}
	}
}

func generateRandomScrobble() *nostr.Event {
	artist := artists[rand.Intn(len(artists))]
	track := songs[rand.Intn(len(songs))]
	sk := nostr.GeneratePrivateKey()
	pk, err := nostr.GetPublicKey(sk)
	if err != nil {
		panic(err)
	}

	event := nostr.Event{
		PubKey:    pk,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      2002,
		Tags: nostr.Tags{
			nostr.Tag{"artist", artist},
			nostr.Tag{"track", track},
			nostr.Tag{"i", fmt.Sprintf("mbid:recording:%s", uuid.New().String())},
		},
		Content: fmt.Sprintf("Listening to %s by %s", track, artist),
	}

	event.Sign(sk)
	return &event
}

func init() {
	rand.Seed(time.Now().UnixNano())
}
