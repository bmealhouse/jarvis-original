import axios from 'axios'

const searchCache = new Map()
window.searchCache = searchCache

export async function search(term) {
  if (searchCache.has(term)) {
    return searchCache.get(term)
  }

  const musicKit = window.MusicKit.getInstance()
  await musicKit.authorize()

  return quotaExceededRetry(async () => {
    console.log(`Searching "${term}"`)
    const { songs: { data } = {} } = await musicKit.api.search(term, {
      limit: 50,
      types: 'songs',
    })
    searchCache.set(term, data)
    return data
  })
}

export async function createPlaylist(name, songs) {
  const musicKit = window.MusicKit.getInstance()
  const appleMusicToken = await musicKit.authorize()
  const { post } = makeRequestUtils(appleMusicToken)

  const {
    data: [playlistData],
  } = await post('/me/library/playlists', {
    attributes: { name },
    relationships: {
      tracks: {
        data: songs.map(song => ({ id: song.id, type: 'songs' })),
      },
    },
  })

  return playlistData
}

export async function addToLibrary(songs) {
  const musicKit = window.MusicKit.getInstance()
  await musicKit.authorize()
  await musicKit.api.library.add({ songs: songs.map(song => song.id) })
}

function makeRequestUtils(appleMusicToken) {
  const config = {
    baseURL: 'https://api.music.apple.com/v1',
    headers: {
      Authorization: `Bearer ${process.env.GATSBY_APPLE_DEVELOPER_TOKEN}`,
      'Music-User-Token': appleMusicToken,
      'Content-Type': 'application/json',
    },
  }

  return {
    async post(uri, data) {
      const response = await axios.post(uri, data, config)
      return response.data
    },
  }
}

function quotaExceededRetry(fn) {
  return new Promise(resolve => {
    ;(function retry() {
      setTimeout(async () => {
        try {
          resolve(await fn())
        } catch (error) {
          if (error.errorCode === 'QUOTA_EXCEEDED') {
            retry(fn)
          } else {
            throw error
          }
        }
      }, 1000)
    })()
  })
}
