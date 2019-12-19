process.env.NODE_ENV = 'development'
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
})

// eslint-disable-next-line no-global-assign
require = require('esm')(module)
module.exports = require('./src')
