document.addEventListener('DOMContentLoaded', () => {
  const authButton = document.getElementById('auth-button');
  const trackInfo = document.getElementById('track-info');

  authButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'authenticate' });
  });

  chrome.storage.local.get('spotifyAccessToken', (result) => {
    if (result.spotifyAccessToken) {
      fetchCurrentlyPlaying(result.spotifyAccessToken);
    }
  });

  function fetchCurrentlyPlaying(accessToken) {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => {
      if (response.status === 204) {
        trackInfo.textContent = 'No track currently playing';
      } else {
        return response.json();
      }
    })
    .then(data => {
      if (data) {
        const track = data.item;
        trackInfo.innerHTML = `
          <img src="${track.album.images[0].url}" alt="Album Artwork" width="100">
          <p><strong>${track.name}</strong></p>
          <p>${track.artists[0].name}</p>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching currently playing track:', error);
      trackInfo.textContent = 'Error fetching track information';
    });
  }
});