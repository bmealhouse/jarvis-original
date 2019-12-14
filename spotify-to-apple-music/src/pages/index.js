import React from 'react'
import Helmet from 'react-helmet'
import SpotifyAuth from '../components/spotify-auth'
import SpotifyPlaylists from '../components/spotify-playlists'

export default function Index() {
  return (
    <>
      <Helmet>
        <link
          href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css"
          rel="stylesheet"
        ></link>
        <script src="https://js-cdn.music.apple.com/musickit/v1/musickit.js" />
        <style type="text/css">{`
          html {
            font-family: -apple-system,system-ui,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif;
          }
        `}</style>
      </Helmet>
      <div className="w-screen h-screen text-gray-900">
        <main className="flex p-8">
          <SpotifyAuth />
          <SpotifyPlaylists />
        </main>
      </div>
    </>
  )
}
