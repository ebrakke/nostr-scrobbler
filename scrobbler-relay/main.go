package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/fiatjaf/eventstore/lmdb"
	"github.com/fiatjaf/khatru"
	"github.com/joho/godotenv"
	"github.com/nbd-wtf/go-nostr"
	"github.com/nbd-wtf/go-nostr/nip19"
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
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	stats := NewScrobbleStats()
	relay := khatru.NewRelay()

	// Use environment variables for configuration
	relay.Info.Name = getEnv("RELAY_NAME", "Scrobbler Relay")
	relay.Info.URL = getEnv("RELAY_URL", "ws://localhost")
	dbPath := getEnv("DB_PATH", "./db")
	port := getEnv("PORT", "8080")

	db := lmdb.LMDBBackend{
		MaxLimit: 100000,
		Path:     dbPath,
	}
	if err := db.Init(); err != nil {
		panic(err)
	}
	relay.StoreEvent = append(relay.StoreEvent, db.SaveEvent)
	relay.DeleteEvent = append(relay.DeleteEvent, db.DeleteEvent)
	relay.QueryEvents = append(relay.QueryEvents, db.QueryEvents)

	relay.RejectEvent = append(relay.RejectEvent, func(ctx context.Context, ev *nostr.Event) (bool, string) {
		if ev.Kind != 2002 {
			return true, "Only kind 2002 (scrobble) events are allowed"
		}
		return false, ""
	})
	go collectSelfStats(stats, relay)
	mux := relay.Router()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		renderStats(w, stats)
	})

	mux.HandleFunc("/connect", func(w http.ResponseWriter, r *http.Request) {
		relay := r.FormValue("relay")
		go collectStats(stats, relay)
		renderStats(w, stats)
	})

	mux.HandleFunc("/backups", func(w http.ResponseWriter, r *http.Request) {
		renderBackups(w)
	})

	mux.HandleFunc("/backups/", serveBackup)

	log.Printf("Starting server on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, relay))
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

func collectSelfStats(stats *ScrobbleStats, relay *khatru.Relay) {
	r, err := nostr.RelayConnect(context.Background(), relay.Info.URL)
	if err != nil {
		log.Printf("Failed to connect to relay %s: %v", relay.Info.URL, err)
		return
	}

	sub, err := r.Subscribe(context.Background(), []nostr.Filter{{
		Kinds: []int{2002},
		Limit: 10000,
	}})
	if err != nil {
		log.Fatalf("Failed to subscribe: %v", err)
	}

	for ev := range sub.Events {
		artist := getTagValue(ev.Tags, "artist")
		track := getTagValue(ev.Tags, "track")
		stats.AddScrobble(relay.Info.URL, ev.PubKey, artist, track)
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
		<a href="https://www.last.fm/about/trackmymusic" rel="noopener noreferrer" target="_blank" class="text-sm text-gray-500">What is a scrobble?</a>
        
        <form hx-post="/connect" hx-swap="innerHTML" hx-target="body" class="mb-8">
            <input type="text" name="relay" placeholder="Enter relay URL" class="p-2 border rounded mr-2">
            <button type="submit" class="bg-blue-500 text-white p-2 rounded">Connect</button>
        </form>

		<div hx-get="/backups" hx-trigger="load" class="mb-8 bg-white p-6 rounded-lg shadow"></div>

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
                                <th class="cursor-pointer">Artist</th>
                                <th class="cursor-pointer">Count</th>
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
                                <th class="cursor-pointer">Song</th>
                                <th class="cursor-pointer">Count</th>
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
                                <th class="cursor-pointer">User</th>
                                <th class="cursor-pointer">Count</th>
                            </tr>
                        </thead>
                        <tbody id="users-{{$relayURL}}">
                            {{range $user, $count := $relay.UserScrobbles}}
                            <tr>
                                <td>
									<a href="https://ditto.pub/{{$user | npubEncode}}" target="_blank" rel="noopener noreferrer">
										<span>{{$user | npubEncode | truncate}}</span>
									</a>
								</td>
                                <td>{{$count}}</td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        {{end}}
    </div> </body>
</html>
`

	funcMap := template.FuncMap{
		"npubEncode": func(pubkey string) string {
			npub, err := nip19.EncodePublicKey(pubkey)
			if err != nil {
				return pubkey // Return original if encoding fails
			}

			// Truncate the npub
			return npub
		},
		"truncate": func(s string) string {
			if len(s) > 10 {
				return s[:10] + "..." + s[len(s)-8:]
			}
			return s
		},
	}

	t, err := template.New("stats").Funcs(funcMap).Parse(tmpl)
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

type BackupFile struct {
	Name string
	Size string
}

func renderBackups(w http.ResponseWriter) {
	backups, err := listBackups("./backups") // Adjust the path as needed
	if err != nil {
		http.Error(w, "Failed to list backups", http.StatusInternalServerError)
		return
	}
	tmpl := `
	<h3 class="text-2xl font-semibold mb-4">Available Backups (LMDB)</h3>
	<ul class="space-y-2">
		{{range .}}
		<li>
			<a href="/backups/{{.Name}}" class="text-blue-500 hover:underline" download>{{.Name}} ({{.Size}})</a>
		</li>
		{{else}}
		<li>No backups available</li>
		{{end}}
	</ul>
	`

	t, err := template.New("backups").Parse(tmpl)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = t.Execute(w, backups)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func listBackups(dir string) ([]BackupFile, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var backups []BackupFile
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".zip") {
			info, err := file.Info()
			if err != nil {
				continue
			}
			size := formatFileSize(info.Size())
			backups = append(backups, BackupFile{Name: file.Name(), Size: size})
		}
	}

	// Sort backups by modification time (newest first)
	sort.Slice(backups, func(i, j int) bool {
		iInfo, _ := os.Stat(filepath.Join(dir, backups[i].Name))
		jInfo, _ := os.Stat(filepath.Join(dir, backups[j].Name))
		return iInfo.ModTime().After(jInfo.ModTime())
	})

	return backups, nil
}

func formatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func serveBackup(w http.ResponseWriter, r *http.Request) {
	filename := filepath.Base(r.URL.Path)
	filePath := filepath.Join("./backups", filename)

	// Check if the file exists and is within the backups directory
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	// Set headers for file download
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Type", "application/zip")

	// Serve the file
	http.ServeFile(w, r, filePath)
}

// Helper function to get environment variables with a default value
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
