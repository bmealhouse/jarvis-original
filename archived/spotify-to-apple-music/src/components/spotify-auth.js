import React, {useEffect} from 'react'
import {useStoreState, useStoreActions} from 'easy-peasy'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faLock, faUnlock} from '@fortawesome/free-solid-svg-icons'

export default function SpotifyAuth() {
  const isAuthenticated = useStoreState(state => state.isAuthenticated)
  const setCredentials = useStoreActions(actions => actions.setCredentials)

  useEffect(() => {
    if (isAuthenticated) return

    const {hash} = window.location
    if (hash) {
      const keyValuePairs = hash.slice(1).split('&')
      setCredentials(
        keyValuePairs.reduce((hashMap, kvp) => {
          const [key, value] = kvp.split(`=`)
          return {...hashMap, [key]: Number(value) || value}
        }, {}),
      )
    } else {
      requestSpotifyAuthentication()
    }
  }, [isAuthenticated, setCredentials])

  return (
    <div className="py-3">
      <FontAwesomeIcon icon={isAuthenticated ? faLock : faUnlock} size="2x" />
    </div>
  )
}

async function requestSpotifyAuthentication() {
  const clientId = `client_id=${process.env.GATSBY_SPOTIFY_CLIENT_ID}`
  const redirectUri = `redirect_uri=${process.env.GATSBY_SPOTIFY_REDIRECT_URI}`
  const scope = `scope=playlist-modify-public%20playlist-modify-private%20user-library-modify`
  window.location.replace(
    `https://accounts.spotify.com/authorize?${clientId}&${redirectUri}&${scope}&response_type=token`,
  )
}
