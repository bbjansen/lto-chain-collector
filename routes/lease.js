// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Get all leases
router.get('/', async function(req, res, next) {
  try {

      const getLeases = await db('transactions')
      .select()
      .where('type', 8)
      .orWhere('type', 9)

      res.status(200).json(getLeases)

  } catch (err) {
    res.status(400).json(null)
  }
})

// Get anchor by tid
router.get('/transaction/:id', async function(req, res, next) {
  try {
  
      const getAnchor = await db('anchors')
      .select('tid', 'anchor')
      .where('tid', req.params.id)

      res.status(200).json(getAnchor)
  
  } catch (err) {
    res.status(400).json(null)
  }
})

module.exports = router
