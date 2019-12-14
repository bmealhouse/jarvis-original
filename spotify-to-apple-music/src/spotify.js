import axios from 'axios'

const playlistCache = new Map()
window.playlistCache = playlistCache

export async function playlists(getStoreState) {
  const { get } = makeRequestUtils(getStoreState)
  const { items } = await get('/v1/me/playlists?limit=50')
  return items
}

export async function deletePlaylist(getStoreState, id) {
  const { del } = makeRequestUtils(getStoreState)
  await del(`/v1/playlists/${id}/followers`)
}

export async function playlistTracks(getStoreState, id) {
  if (playlistCache.has(id)) {
    return playlistCache.get(id)
  }

  const { get } = makeRequestUtils(getStoreState)

  let tracks = []
  let nextUri = `/v1/playlists/${id}/tracks`

  do {
    const { items, next } = await get(nextUri)
    tracks = [...tracks, ...items.map(item => item.track)]
    nextUri = next && next.replace('https://api.spotify.com', '')
  } while (nextUri)

  playlistCache.set(id, tracks)

  return tracks
}

export async function removeTracksFromLibrary(getStoreState, tracks) {
  const { del } = makeRequestUtils(getStoreState)

  while (tracks.length > 0) {
    // purposely mutate tracks to send 50 per request
    const groupOfTracks = tracks.splice(0, 50)
    await del(
      `/v1/me/tracks`,
      groupOfTracks.map(track => track.id)
    )
  }
}

function makeRequestUtils(getStoreState) {
  const { credentials } = getStoreState()

  const options = {
    baseURL: 'https://api.spotify.com',
    headers: {
      Authorization: credentials,
      'Content-Type': 'application/json',
    },
  }

  return {
    async get(uri) {
      const { data } = await axios.get(uri, options)
      return data
    },
    async del(uri, data) {
      await axios.delete(uri, { ...options, data })
    },
  }
}
