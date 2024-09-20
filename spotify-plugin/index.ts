import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = 3001;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';

const ENABLE_LOGGING = process.env.ENABLE_LOGGING === 'true';
const LOG_FILE = path.join(__dirname, 'error.log');

function logError(error: any) {
  if (ENABLE_LOGGING) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${error.stack || error}\n`;
    fs.appendFileSync(LOG_FILE, errorMessage);
    console.error(errorMessage);
  }
}

app.get('/', (req, res) => {
  const access_token = req.query.access_token as string;
  const loginUrl = '/login';
  const profileUrl = access_token ? `/profile?access_token=${access_token}` : '#';
  const currentlyPlayingUrl = access_token ? `/currently-playing?access_token=${access_token}` : '#';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spotify Plugin</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <h1>Spotify Plugin</h1>
      <nav>
        <ul>
          <li><a href="${loginUrl}">Login with Spotify</a></li>
          <li><a href="${profileUrl}" ${!access_token ? 'class="disabled"' : ''}>View Profile</a></li>
          <li><a href="${currentlyPlayingUrl}" ${!access_token ? 'class="disabled"' : ''}>Currently Playing</a></li>
        </ul>
      </nav>
      <p>Note: Profile and Currently Playing links require login.</p>
    </body>
    </html>
  `);
});

app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID!,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }).toString()
  );
});

app.get('/callback', async (req, res) => {
  const code = req.query.code as string;

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString(),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = response.data;
    res.redirect(`/?access_token=${access_token}`);
  } catch (error) {
    logError(error);
    res.status(500).send('Error during authentication');
  }
});

app.get('/profile', async (req, res) => {
  const access_token = req.query.access_token as string;

  try {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const profile = response.data;
    res.json(profile);
  } catch (error) {
    logError(error);
    res.status(500).send('Error fetching profile');
  }
});

// New function to convert Spotify event to kind: 2002 event
function convertToKind2002Event(spotifyTrack: any): any {
  return {
    kind: 2002,
    content: `${spotifyTrack.item.name} - ${spotifyTrack.item.artists[0].name}`,
    tags: [
      ["i", spotifyTrack.item.uri],
      ["source", "spotify"],
      ["r", spotifyTrack.item.album.images[0].url]
    ],
    created_at: Math.floor(Date.now() / 1000)
  };
}

// Updated /currently-playing endpoint
app.get('/currently-playing', async (req, res) => {
  const access_token = req.query.access_token as string;
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing?market=US', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (response.status === 204) {
      res.json({ isPlaying: false });
    } else {
      const track = response.data;
      const kind2002Event = convertToKind2002Event(track);
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Currently Playing</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f0f0f0; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background-color: white; border-radius: 10px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); text-align: center; }
            img { max-width: 300px; border-radius: 5px; }
            h1 { color: #1DB954; }
            p { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Currently Playing</h1>
            <img src="${track.item.album.images[0].url}" alt="Album Artwork">
            <p><strong>${track.item.name}</strong></p>
            <p>${track.item.artists[0].name}</p>
          </div>
          <script>
            const kind2002Event = ${JSON.stringify(kind2002Event, null, 2)};
            
            const eventContainer = document.createElement('div');
            eventContainer.innerHTML = \`
              <h2>Kind 2002 Event</h2>
              <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(kind2002Event, null, 2)}
              </pre>
            \`;
            
            document.body.appendChild(eventContainer);
          </script>
        </body>
        </html>
      `;

      res.send(htmlTemplate);
    }
  } catch (error) {
    logError(error.message);
    res.status(500).json({ error: 'Error fetching currently playing track' });
  }
});

// Serve static files
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Error logging is ${ENABLE_LOGGING ? 'enabled' : 'disabled'}`);
});