// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Get feature by block index
router.get('/:index', async function(req, res, next) {
  try {

      const getFeatures = await db('features')
      .select('index', 'feature')
      .where('index', req.params.index)

      res.json(getFeatures)

  } catch (err) {
    next(err)
  }
})

module.exports = router
