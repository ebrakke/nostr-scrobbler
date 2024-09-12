package main

import (
	"bufio"
	"context"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nbd-wtf/go-nostr"
)

var (
	secretKeys = []string{
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
		nostr.GeneratePrivateKey(),
	}
	testSongs []string
)

func init() {
	// Load test songs from file
	file, err := os.Open("test_songs.txt")
	if err != nil {
		panic("Failed to open test_songs.txt: " + err.Error())
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		testSongs = append(testSongs, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		panic("Error reading test_songs.txt: " + err.Error())
	}
}

func getRandomSong() (string, string) {
	if len(testSongs) == 0 {
		return "Default Song", "Default Artist"
	}
	song := testSongs[rand.Intn(len(testSongs))]
	parts := strings.Split(song, " - ")
	if len(parts) != 2 {
		return song, "Unknown Artist"
	}
	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
}

func TestGenerateAndPublishScrobbles(t *testing.T) {
	relay, err := nostr.RelayConnect(context.Background(), "ws://localhost:8081")
	if err != nil {
		t.Fatalf("Failed to connect to relay: %v", err)
	}
	defer relay.Close()

	// Generate and publish 10000 random scrobbles
	for i := 0; i < 100; i++ {
		event := generateRandomScrobble()
		err := relay.Publish(context.Background(), *event)
		if err != nil {
			t.Errorf("Failed to publish event: %v", err)
		}
	}
}

func generateRandomScrobble() *nostr.Event {
	track, artist := getRandomSong()
	sk := secretKeys[rand.Intn(len(secretKeys))]
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
