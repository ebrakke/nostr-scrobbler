import asyncio
import json
import ssl
import time
import pandas as pd
from nostr.filter import Filter, Filters
from nostr.event import EventKind
from nostr.relay_manager import RelayManager
from nostr.message_type import ClientMessageType

async def connect_and_process():
    filters = Filters([Filter(kinds=[2002])])
    subscription_id = "scrobble_subscription"
    request = [ClientMessageType.REQUEST, subscription_id]
    request.extend(filters.to_json_array())

    relay_manager = RelayManager()
    relay_manager.add_relay("ws://relay.home.lan")
    relay_manager.add_subscription(subscription_id, filters)
    relay_manager.open_connections({"cert_reqs": ssl.CERT_NONE})
    
    await asyncio.sleep(1.25)  # allow the connections to open

    message = json.dumps(request)
    relay_manager.publish_message(message)
    await asyncio.sleep(1)  # allow the messages to send

    scrobbles = []
    while relay_manager.message_pool.has_events():
        event_msg = relay_manager.message_pool.get_event()
        
        # Convert tags to a dictionary
        tags_dict = {tag[0]: tag[1] for tag in event_msg.event.tags if len(tag) >= 2}
        
        scrobbles.append({
            'artist': tags_dict.get('artist', 'Unknown'),
            'title': tags_dict.get('track', 'Unknown'),
            'timestamp': event_msg.event.created_at
        })
        
        # Perform analysis every 100 scrobbles
        if len(scrobbles) % 100 == 0:
            analyze_scrobbles(scrobbles)

    relay_manager.close_connections()

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
