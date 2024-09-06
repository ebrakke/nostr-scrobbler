# cmus-scrobbler

cmus-scrobbler is a Go application that scrobbles your music plays from cmus to NOSTR relays. It monitors your cmus player and publishes scrobble events to configured NOSTR relays.

## Features

- Monitors cmus playback in real-time
- Publishes scrobble events (kind 2002) to NOSTR relays
- Supports listing recent scrobbles
- Configurable through YAML config file

## Configuration

When you run cmus-scrobbler for the first time, it automatically generates a configuration file in your home directory at `~/.cmus-scrobbler.yaml`. This file will contain a newly generated NOSTR private key (nsec) but will have an empty list of relays.

To complete the configuration:

1. Open the auto-generated config file:
   ```
   nano ~/.cmus-scrobbler.yaml
   ```

2. Add your desired NOSTR relay URLs and, if you prefer, replace the auto-generated nsec with your own:
   ```yaml
   nsec: your_nsec_here
   relays:
     - wss://relay1.example.com
     - wss://relay2.example.com
   ```

3. Save the file and exit the editor.

Note: If you want to use a different location for your config file, you can specify it when running the scrobbler using the `-config` flag:

## List your recent scrobbles

```
./cmus-scrobbler -ls
```

## Installation

Find the latest release on the releases page

## From source

- Go 1.23 or higher
- cmus music player installed and configured

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cmus-scrobbler.git
   cd cmus-scrobbler
   ```

2. Build the application:
   ```
   go build
   ```

