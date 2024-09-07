import asyncio
import json
import pandas as pd
from nostr_sdk import Client, Filter, EventSource, init_logger, LogLevel, Kind
from datetime import timedelta

async def connect_and_process():
    # Init logger
    init_logger(LogLevel.INFO)

    # Initialize client without signer
    client = Client()

    # Add relay and connect
    await client.add_relays(["ws://localhost:8081"])
    await client.connect()

    # Create filter for kind 2002 events
    f = Filter().kinds([Kind(2002)])

    scrobbles = []
    source = EventSource.relays(timedelta(seconds=60))  # Adjust the timeout as needed

    events = await client.get_events_of([f], source)

    for event in events:
        ev = json.loads(event.as_json())
        tags_dict = { tag[0]: tag[1] for tag in ev.get('tags') }
        scrobbles.append({
            'artist': tags_dict.get('artist'),
            'title': tags_dict.get('track'),
            'timestamp': ev.get('created_at'),
            'pubkey': ev.get('pubkey')  # Add this line to include the pubkey
        })
        
        # Perform analysis every 1000 scrobbles
    analyze_scrobbles(scrobbles)
    print(f"Processed {len(events)} events")

def analyze_scrobbles(scrobbles):
    df = pd.DataFrame(scrobbles)
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
    
    print("\n--- Scrobble Analysis ---")
    print(f"Total scrobbles: {len(df)}")
    
    # Top 5 artists
    top_artists = df['artist'].value_counts().head()
    print("\nTop 5 Artists:")
    print(top_artists)
    
    # Top 5 tracks
    top_tracks = df.groupby(['artist', 'title']).size().sort_values(ascending=False).head()
    print("\nTop 5 Tracks:")
    print(top_tracks)
    
    # Top 5 listeners
    top_listeners = df['pubkey'].value_counts().head()
    print("\nTop 5 Listeners:")
    print(top_listeners)
    
    # Scrobbles per day
    df['date'] = df['timestamp'].dt.date
    scrobbles_per_day = df.groupby('date').size()
    print("\nAverage scrobbles per day:", scrobbles_per_day.mean())
    
    # Most active hour
    df['hour'] = df['timestamp'].dt.hour
    most_active_hour = df['hour'].value_counts().idxmax()
    print(f"\nMost active hour: {most_active_hour}:00 - {most_active_hour+1}:00")

    

if __name__ == "__main__":
    asyncio.run(connect_and_process())
