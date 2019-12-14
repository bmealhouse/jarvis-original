import React, { useEffect } from 'react'
import { useStoreState, useStoreActions } from 'easy-peasy'
import Playlist from './playlist'

export default function UserPlaylists() {
  const { isAuthenticated, playlists } = useStoreState(state => state)
  const fetchPlaylists = useStoreActions(actions => actions.fetchPlaylists)

  useEffect(() => {
    if (isAuthenticated && !playlists) {
      fetchPlaylists()
    }
  }, [isAuthenticated, playlists, fetchPlaylists])

  return (
    isAuthenticated &&
    playlists && (
      <section className="flex flex-wrap px-8">
        {playlists.map(playlist => (
          <Playlist key={playlist.id} playlist={playlist}></Playlist>
        ))}
      </section>
    )
  )
}
