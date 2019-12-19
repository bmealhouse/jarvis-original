import React from 'react'
import {useStoreActions} from 'easy-peasy'

const button = 'border rounded mx-1 px-2 font-bold'

export default function UserPlaylist({playlist}) {
  const {addPlaylistToLibrary, deletePlaylist} = useStoreActions(
    actions => actions,
  )

  const handleAddToLibrary = () => {
    addPlaylistToLibrary(playlist)
  }

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Are you sure you want to delete ${playlist.name}?`)) {
      deletePlaylist(playlist)
    }
  }

  return (
    <div className="w-full flex items-center py-3 border-b border-gray-500">
      <div className="w-1/3 text-xl font-bold">{playlist.name}</div>
      <p
        className={`w-1/3 text-sm italic ${
          playlist.tracks.total > 0 ? 'text-gray-700' : 'text-orange-500'
        }`}
      >
        {playlist.tracks.total} tracks
      </p>
      <div className="w-1/3 inline-flex">
        <button
          type="button"
          className={`${button} hover:border-gray-900`}
          onClick={handleAddToLibrary}
        >
          Add to library
        </button>
        <button
          type="button"
          className={`${button} hover:border-red-500`}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
