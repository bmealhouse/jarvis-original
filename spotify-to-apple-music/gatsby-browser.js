import React from 'react'
import { createStore, StoreProvider } from 'easy-peasy'
import model from './src/model'

document.addEventListener('musickitloaded', () => {
  window.MusicKit.configure({
    developerToken: process.env.GATSBY_APPLE_DEVELOPER_TOKEN,
    app: {
      name: 'spotify-to-apple-music',
      build: '1978.4.1',
    },
  })
})

const store = createStore(model)
window.store = store

if (process.env.NODE_ENV === 'development') {
  if (module.hot) {
    module.hot.accept('./src/model', () => {
      store.reconfigure(model)
    })
  }
}

export function wrapRootElement({ element }) {
  return <StoreProvider store={store}>{element}</StoreProvider>
}
