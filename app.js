// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

// Set Express App
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Helmet = require('helmet')
const Compression = require('compression')
const cors = require('cors')
const logger = require('morgan')

// Setup DB if not exist
require('./utils/db/schema')

app.use(function (req, res, next) {
  res.locals.session = req.session
  return next()
})

// Compress
app.use(Helmet())
app.use(Compression())

// Set Parsers/Path/Favicon/Templates
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(logger('dev'))

// CORS
app.use(cors())

// Routes
app.use('/block', require('./routes/block'))
app.use('/consensus', require('./routes/consensus'))
app.use('/feature', require('./routes/feature'))
app.use('/proof', require('./routes/proof'))
app.use('/transaction', require('./routes/transaction'))
app.use('/anchor', require('./routes/anchor'))
app.use('/lease', require('./routes/lease'))
app.use('/generator', require('./routes/generator'))
app.use('/address', require('./routes/address'))


// error handler
app.use(function onError (err, req, res, next) {
  res.locals.error = process.env.DEBUG == true ? err : {}
  res.statusCode = err.status || 500
  res.json(new Error('error'))
  console.log(err)
})

module.exports = app
