const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = 'user-read-currently-playing';

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: 'OFF' });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.getBadgeText({}, (currentText) => {
    const nextState = currentText === 'ON' ? 'OFF' : 'ON';
    chrome.action.setBadgeText({ text: nextState });

    if (nextState === 'ON') {
      authenticate();
    }
  });
});

function authenticate() {
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', SCOPES);

  chrome.identity.launchWebAuthFlow(
    { url: authUrl.toString(), interactive: true },
    (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        console.error('Error during authentication');
        return;
      }

      const url = new URL(redirectUrl);
      const hash = url.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (accessToken) {
        chrome.storage.local.set({ spotifyAccessToken: accessToken }, () => {
          console.log('Access token saved');
        });
      }
    }
  );
}