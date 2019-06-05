// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const knex = module.exports = require('knex')({
  client: process.env.DB_TYPE,
  // debug: true,
  // timezone: 'UTC',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8'
  },
  pool: {
    min: 2,
    max: 100
  }
})

module.exports = knex
