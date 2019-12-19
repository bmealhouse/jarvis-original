import {action, thunk, computed} from 'easy-peasy'
import * as spotify from './spotify'
import * as appleMusic from './apple-music'

export default {
  credentials: null,
  playlists: null,

  // selectors
  isAuthenticated: computed(state => Boolean(state.credentials)),

  // actions
  setCredentials: action((state, payload) => {
    state.credentials = `${payload.token_type} ${payload.access_token}`
    window.location.hash = ''
  }),
  loadPlaylists: action((state, playlists) => {
    state.playlists = playlists
  }),
  removePlaylist: action((state, id) => {
    state.playlists.splice(
      state.playlists.findIndex(playlist => playlist.id === id),
      1,
    )
  }),

  // effects
  fetchPlaylists: thunk(async (actions, _payload, {getStoreState}) => {
    const playlists = await spotify.playlists(getStoreState)
    actions.loadPlaylists(playlists)
  }),
  deletePlaylist: thunk(async (actions, playlist, {getStoreState}) => {
    await spotify.deletePlaylist(getStoreState, playlist.id)
    actions.removePlaylist(playlist.id)
  }),
  addPlaylistToLibrary: thunk(async (actions, playlist, {getStoreState}) => {
    const tracks = await spotify.playlistTracks(getStoreState, playlist.id)

    let songs = await Promise.all(tracks.map(findAppleMusicSong))
    songs = songs.filter(Boolean)

    try {
      if (
        // eslint-disable-next-line no-alert
        window.confirm(`
Add ${songs.length} songs to your apple music library?\n
${songs.map(formatAppleMusicSongName).join('\n')}
`)
      ) {
        await spotify.removeTracksFromLibrary(getStoreState, tracks)
        console.log('Removed tracks from Spotify library')

        await appleMusic.addToLibrary(songs)
        console.log('Added songs to Apple Music library')

        const {id} = await appleMusic.createPlaylist(playlist.name, songs)
        console.log(`Created playlist: ${id}`)
      }
    } catch (error) {
      console.error(error)
    }
  }),
}

async function findAppleMusicSong(track) {
  const {searchTerm, ...searchTermMetadata} = buildSearchTerm(track)

  let searchResults = null
  try {
    searchResults = await appleMusic.search(searchTerm)
    return filterSearchResults(searchResults, searchTermMetadata)
  } catch (error) {
    const {artistName, albumName, trackName} = searchTermMetadata
    console.error('No search results', {
      artistName,
      albumName,
      trackName,
      searchResults,
    })
  }
}

function buildSearchTerm(track) {
  const artistName = track.artists[0].name
  const albumName = track.album.name
  const trackName = track.name

  const formattedArtistName = artistName.toLowerCase()

  const formattedAlbumName = albumName
    .replace(' (Deluxe)', '')
    .replace(' (Deluxe Edition)', '')
    .replace(' (Holiday Edition Deluxe)', '')
    .replace(' (Special Edition)', '')
    .replace(' 1 & 2', '')
    .toLowerCase()

  const formattedTrackName = trackName
    .replace(' - 20th Anniversary Remaster', '')
    .replace(' - Live', '')
    .toLowerCase()

  return {
    artistName,
    albumName,
    trackName,
    formattedArtistName,
    formattedAlbumName,
    formattedTrackName,
    searchTerm: `${formattedArtistName} ${formattedTrackName}`,
    originalTrack: track,
  }
}

function filterSearchResults(searchResults, searchTermMetadata) {
  let remainingSearchResults = searchResults

  const {
    formattedArtistName,
    formattedAlbumName,
    formattedTrackName,
  } = searchTermMetadata

  remainingSearchResults = filterBy(
    `includesArtistName(${formattedArtistName})`,
    ({attributes: {artistName}}) =>
      artistName.toLowerCase().includes(formattedArtistName),
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `preferAlbumName(remastered|deluxe)`,
    ({attributes: {albumName}}) => {
      const albumNameLowerCase = albumName.toLowerCase()
      return (
        albumNameLowerCase.includes(`${formattedAlbumName} (deluxe`) ||
        albumNameLowerCase.includes(`${formattedAlbumName} (remastered`)
      )
    },
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `includesAlbumName(${formattedAlbumName})`,
    ({attributes: {albumName}}) =>
      albumName.toLowerCase().includes(formattedAlbumName),
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `includesTrackName(${formattedTrackName})`,
    ({attributes: {name}}) => name.toLowerCase().includes(formattedTrackName),
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `excatArtistName(${formattedArtistName})`,
    ({attributes: {artistName}}) =>
      artistName.toLowerCase() === formattedArtistName,
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `exactAlbumName(${formattedAlbumName})`,
    ({attributes: {albumName}}) =>
      albumName.toLowerCase() === formattedAlbumName,
    remainingSearchResults,
  )

  remainingSearchResults = filterBy(
    `exactTrackName(${formattedTrackName})`,
    ({attributes: {name}}) => name.toLowerCase() === formattedTrackName,
    remainingSearchResults,
  )

  if (remainingSearchResults.length > 1) {
    let mostGenres = 0
    return remainingSearchResults.reduce((songWithMostGenres, song) => {
      const {
        attributes: {genreNames},
      } = song

      if (genreNames.length > mostGenres) {
        mostGenres = genreNames.length
        return song
      }

      return songWithMostGenres
    }, remainingSearchResults[0])
  }

  if (remainingSearchResults.length > 1) {
    console.error('Requires more filtering', remainingSearchResults)
  }

  if (remainingSearchResults.length === 0) {
    console.error('Filtered too much')
  }

  return remainingSearchResults[0]
}

function filterBy(filterFuncName, filterFunc, remainingSearchResults) {
  if (remainingSearchResults.length > 1) {
    const filteredSearchResults = remainingSearchResults.filter(filterFunc)
    if (filteredSearchResults.length > 0) {
      return filteredSearchResults
    }
  }

  return remainingSearchResults
}

function formatAppleMusicSongName(song) {
  return `${song.attributes.artistName} - ${song.attributes.name} (${song.attributes.albumName})`
}
