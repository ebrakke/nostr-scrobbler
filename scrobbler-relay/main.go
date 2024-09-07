package main

import (
	"context"
	"html/template"
	"log"
	"net/http"
	"sync"

	"github.com/nbd-wtf/go-nostr"
)

type RelayStats struct {
	URL            string
	TotalScrobbles int
	Artists        map[string]int
	Songs          map[string]int
	UserScrobbles  map[string]int
}

type ScrobbleStats struct {
	Relays map[string]*RelayStats
	mu     sync.RWMutex
}

func NewScrobbleStats() *ScrobbleStats {
	return &ScrobbleStats{
		Relays: make(map[string]*RelayStats),
	}
}

func (s *ScrobbleStats) AddScrobble(relayURL, pubkey, artist, track string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.Relays[relayURL]; !exists {
		s.Relays[relayURL] = &RelayStats{
			URL:           relayURL,
			Artists:       make(map[string]int),
			Songs:         make(map[string]int),
			UserScrobbles: make(map[string]int),
		}
	}

	relay := s.Relays[relayURL]
	relay.TotalScrobbles++
	relay.Artists[artist]++
	relay.Songs[track]++
	relay.UserScrobbles[pubkey]++
}

func main() {
	stats := NewScrobbleStats()
	go collectStats(stats, "ws://relay.home.lan")
	// Set up web server
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		renderStats(w, stats)
	})

	http.HandleFunc("/connect", func(w http.ResponseWriter, r *http.Request) {
		relay := r.FormValue("relay")
		go collectStats(stats, relay)
		renderStats(w, stats)
	})

	log.Println("Starting server on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}

func collectStats(stats *ScrobbleStats, relayURL string) {
	relay, err := nostr.RelayConnect(context.Background(), relayURL)
	if err != nil {
		log.Printf("Failed to connect to relay %s: %v", relayURL, err)
		return
	}

	sub, err := relay.Subscribe(context.Background(), []nostr.Filter{{
		Kinds: []int{2002},
		Limit: 10000,
	}})
	if err != nil {
		log.Fatalf("Failed to subscribe: %v", err)
	}

	for ev := range sub.Events {
		artist := getTagValue(ev.Tags, "artist")
		track := getTagValue(ev.Tags, "track")
		stats.AddScrobble(relayURL, ev.PubKey, artist, track)
	}
}

func getTagValue(tags nostr.Tags, key string) string {
	for _, tag := range tags {
		if tag[0] == key && len(tag) > 1 {
			return tag[1]
		}
	}
	return ""
}

func renderStats(w http.ResponseWriter, stats *ScrobbleStats) {
	tmpl := `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scrobble Stats</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@2.0.2"></script>
	<link href="https://cdn.jsdelivr.net/gh/tofsjonas/sortable@latest/sortable.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/gh/tofsjonas/sortable@latest/sortable.min.js"></script>


</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold mb-8">Scrobble Stats</h1>
        
        <form hx-post="/connect" hx-swap="innerHTML" hx-target="body" class="mb-8">
            <input type="text" name="relay" placeholder="Enter relay URL" class="p-2 border rounded mr-2">
            <button type="submit" class="bg-blue-500 text-white p-2 rounded">Connect</button>
        </form>

        {{range $relayURL, $relay := .Relays}}
        <div class="mb-8">
            <h2 class="text-3xl font-bold mb-4">{{$relay.URL}}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-2xl font-semibold mb-4">Total Scrobbles</h3>
                    <p class="text-4xl font-bold">{{$relay.TotalScrobbles}}</p>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow max-h-[300px] overflow-y-auto">
                    <h3 class="text-2xl font-semibold mb-4">Top Artists</h3>
                    <table id="artist-table" class="table-auto w-full sortable">
                        <thead>
                            <tr>
                                <th class="cursor-pointer" onclick="sortTable(this, 'artists-{{$relayURL}}')">Artist</th>
                                <th class="cursor-pointer" onclick="sortTable(this, 'artists-{{$relayURL}}')">Count</th>
                            </tr>
                        </thead>
                        <tbody id="artists-{{$relayURL}}">
                            {{range $artist, $count := $relay.Artists}}
                            <tr>
                                <td>{{$artist}}</td>
                                <td>{{$count}}</td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow max-h-[300px] overflow-y-auto">
                    <h3 class="text-2xl font-semibold mb-4">Top Songs</h3>
                    <table id="songs-table" class="table-auto w-full sortable">
                        <thead>
                            <tr>
                                <th class="cursor-pointer" onclick="sortTable(this, 'songs-{{$relayURL}}')">Song</th>
                                <th class="cursor-pointer" onclick="sortTable(this, 'songs-{{$relayURL}}')">Count</th>
                            </tr>
                        </thead>
                        <tbody id="songs-{{$relayURL}}">
                            {{range $song, $count := $relay.Songs}}
                            <tr>
                                <td>{{$song}}</td>
                                <td>{{$count}}</td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow max-h-[300px] overflow-y-auto">
                    <h3 class="text-2xl font-semibold mb-4">Top Users</h3>
                    <table id="users-table" class="table-auto w-full sortable">
                        <thead>
                            <tr>
                                <th class="cursor-pointer" onclick="sortTable(this, 'users-{{$relayURL}}')">User</th>
                                <th class="cursor-pointer" onclick="sortTable(this, 'users-{{$relayURL}}')">Count</th>
                            </tr>
                        </thead>
                        <tbody id="users-{{$relayURL}}">
                            {{range $user, $count := $relay.UserScrobbles}}
                            <tr>
                                <td>{{$user}}</td>
                                <td>{{$count}}</td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        {{end}}
    </div>
</body>
</html>
`

	t, err := template.New("stats").Parse(tmpl)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	stats.mu.Lock()
	defer stats.mu.Unlock()

	err = t.Execute(w, stats)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
