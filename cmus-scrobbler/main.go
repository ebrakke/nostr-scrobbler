package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/nbd-wtf/go-nostr/nip19"
)

func main() {
	configPath, listScrobbles := parseFlags()

	config, err := LoadConfig(configPath)
	if err != nil {
		fmt.Println("Error handling config:", err)
		os.Exit(1)
	}

	nostrClient, err := NewNostr(config.Nsec, config.Relays)
	if err != nil {
		fmt.Println("Error creating Nostr client:", err)
		os.Exit(1)
	}
	defer nostrClient.Close()

	npub, _ := nip19.EncodePublicKey(nostrClient.pk)
	fmt.Println("Public key:", npub)
	fmt.Println("Relays:", config.Relays)

	if listScrobbles {
		events, err := nostrClient.QueryRecentScrobbles(50)
		if err != nil {
			fmt.Println("Error listing scrobbles:", err)
			os.Exit(1)
		}
		PrintScrobbles(events)
		return
	}

	if err := runScrobbler(nostrClient); err != nil {
		fmt.Println("Error running scrobbler:", err)
		os.Exit(1)
	}
}

func parseFlags() (string, bool) {
	configPath := flag.String("config", "", "Path to the config file")
	listScrobbles := flag.Bool("ls", false, "List recent scrobbles")
	flag.Parse()
	return *configPath, *listScrobbles
}

func runScrobbler(nostrClient *Nostr) error {
	var lastTrack string
	const sleepDuration = 30 * time.Second

	for {
		if err := waitForCmus(); err != nil {
			fmt.Println("Error waiting for cmus:", err)
			time.Sleep(sleepDuration)
			continue
		}

		scrobble, err := getCurrentTrack()
		if err != nil {
			fmt.Println("Error getting current track:", err)
			time.Sleep(sleepDuration)
			continue
		}

		currentTrack := fmt.Sprintf("%s - %s", scrobble.Artist, scrobble.Track)
		if currentTrack != lastTrack {
			if err := createAndPublishScrobble(nostrClient, scrobble); err != nil {
				fmt.Println("Error with scrobble event:", err)
			} else {
				lastTrack = currentTrack
			}
		}

		time.Sleep(sleepDuration)
	}
}

func createAndPublishScrobble(nostrClient *Nostr, scrobble ScrobbleEvent) error {
	ev, err := nostrClient.CreateScrobbleEvent(scrobble)
	if err != nil {
		return fmt.Errorf("error creating scrobble event: %w", err)
	}

	fmt.Println("New scrobble event:", ev)
	err = nostrClient.PublishEvent(ev)
	if err != nil {
		return fmt.Errorf("error publishing event: %w", err)
	}

	return nil
}
