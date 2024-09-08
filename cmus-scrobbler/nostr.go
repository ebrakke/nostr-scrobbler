package main

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/nbd-wtf/go-nostr"
	"github.com/nbd-wtf/go-nostr/nip19"
)

type Nostr struct {
	sk     string
	pk     string
	relays []*nostr.Relay
}

func NewNostr(nsec string, relayURLs []string) (*Nostr, error) {
	_, sk, err := nip19.Decode(nsec)
	if err != nil {
		return nil, fmt.Errorf("error decoding private key: %w", err)
	}

	pk, err := nostr.GetPublicKey(sk.(string))
	if err != nil {
		return nil, fmt.Errorf("error getting public key: %w", err)
	}

	n := &Nostr{
		sk: sk.(string),
		pk: pk,
	}

	err = n.connectToRelays(relayURLs)
	if err != nil {
		return nil, err
	}

	return n, nil
}

func (n *Nostr) connectToRelays(relayURLs []string) error {
	for _, url := range relayURLs {
		relay, err := nostr.RelayConnect(context.Background(), url)
		if err != nil {
			fmt.Printf("Error connecting to relay %s: %v\n", url, err)
			continue
		}
		n.relays = append(n.relays, relay)
	}

	if len(n.relays) == 0 {
		return fmt.Errorf("failed to connect to any relays")
	}

	return nil
}

func (n *Nostr) Close() {
	for _, relay := range n.relays {
		relay.Close()
	}
}

type ScrobbleEvent struct {
	Artist string
	Track  string
	Album  string
	MbID   string
}

func (n *Nostr) CreateScrobbleEvent(scrobble ScrobbleEvent) (*nostr.Event, error) {
	content := fmt.Sprintf("%s - %s", scrobble.Artist, scrobble.Track)
	ev := nostr.Event{
		Kind:      2002,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Tags:      nostr.Tags{},
		Content:   content,
	}

	ev.Tags = append(ev.Tags, nostr.Tag{"artist", scrobble.Artist})
	ev.Tags = append(ev.Tags, nostr.Tag{"track", scrobble.Track})
	ev.Tags = append(ev.Tags, nostr.Tag{"album", scrobble.Album})
	ev.Tags = append(ev.Tags, nostr.Tag{"mbid", scrobble.MbID})

	ev.Sign(n.sk)
	return &ev, nil
}

func (n *Nostr) PublishEvent(ev *nostr.Event) error {
	for _, relay := range n.relays {
		err := relay.Publish(context.Background(), *ev)
		if err != nil {
			fmt.Printf("Error publishing event to %s: %v\n", relay.URL, err)
		} else {
			fmt.Printf("Event published successfully to %s\n", relay.URL)
		}
	}
	return nil
}

func (n *Nostr) QueryRecentScrobbles(limit int) ([]nostr.Event, error) {
	filter := nostr.Filter{
		Kinds:   []int{2002},
		Authors: []string{n.pk},
		Limit:   limit,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var allEvents []nostr.Event
	for _, relay := range n.relays {
		events, err := relay.QuerySync(ctx, filter)
		if err != nil {
			fmt.Printf("Error querying relay %s: %v\n", relay.URL, err)
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

func (n *Nostr) GetLastScrobble() (*nostr.Event, error) {
	events, err := n.QueryRecentScrobbles(1)
	if err != nil {
		return nil, err
	}

	if len(events) == 0 {
		return nil, nil
	}

	return &events[0], nil
}

func PrintScrobbles(events []nostr.Event) {
	fmt.Println("Recent scrobbles:")
	for _, ev := range events {
		fmt.Printf("- %s (at %s)\n", ev.Content, ev.CreatedAt.Time().Format(time.RFC3339))
	}
}
