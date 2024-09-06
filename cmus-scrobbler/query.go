package main

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/nbd-wtf/go-nostr"
)

func QueryRecentScrobbles(relayURLs []string, pubkey string, limit int) ([]nostr.Event, error) {
	filter := nostr.Filter{
		Kinds:   []int{2002},
		Authors: []string{pubkey},
		Limit:   limit,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var allEvents []nostr.Event
	for _, url := range relayURLs {
		relay, err := nostr.RelayConnect(ctx, url)
		if err != nil {
			fmt.Printf("Error connecting to relay %s: %v\n", url, err)
			continue
		}
		defer relay.Close()

		events, err := relay.QuerySync(ctx, filter)
		if err != nil {
			fmt.Printf("Error querying relay %s: %v\n", url, err)
			continue
		}

		for _, event := range events {
			allEvents = append(allEvents, *event)
		}
	}

	// Sort events by creation time (newest first)
	sort.Slice(allEvents, func(i, j int) bool {
		return allEvents[i].CreatedAt > allEvents[j].CreatedAt
	})

	// Limit the total number of events if necessary
	if len(allEvents) > limit {
		allEvents = allEvents[:limit]
	}

	return allEvents, nil
}
