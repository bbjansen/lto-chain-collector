// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const knex = module.exports = require('knex')({
  client: 'mysql',
  //debug: true,
  //timezone: 'UTC',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8'
    // multipleStatements: true
  },
  pool: {
    min: 2,
    max: 10
  }
})

module.exports = knex
