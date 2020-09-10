// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
"use strict";

const knex = require("knex")({
  client: process.env.DB_TYPE,
  // debug: true,
  // timezone: 'UTC',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: "utf8",
  },
  pool: {
    min: 2,
    max: 151,
    //    createTimeoutMillis: 30000,
    //    acquireTimeoutMillis: 100000,
    //    idleTimeoutMillis: 30000,
    //    reapIntervalMillis: 1000,
    //    createRetryIntervalMillis: 1000,
    propagateCreateError: false,
  },
});

module.exports = knex;
