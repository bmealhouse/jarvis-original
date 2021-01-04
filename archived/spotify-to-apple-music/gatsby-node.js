require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
})

const path = require('path')
const {getToken} = require('apple-music-token-node')

const {token} = getToken(
  path.resolve(__dirname, `./AuthKey_${process.env.APPLE_KEY_ID}.p8`),
  process.env.APPLE_TEAM_ID,
  process.env.APPLE_KEY_ID,
)

process.env.GATSBY_APPLE_DEVELOPER_TOKEN = token
