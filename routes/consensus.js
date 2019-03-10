// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Get consensus by block
router.get('/block/:index', async function(req, res, next) {
    try {

        const getConsensus = await db('consensus')
        .select()
        .where('index', req.params.index)

        res.status(200).json(getConsensus)

    } catch (err) {
        res.status(400).json(null)
    }
})

// Get consensus by target range
router.get('/target/:a/:end', async function(req, res, next) {
    try {
    
        const getConsensus = await db('consensus')
        .select()
        .whereBetween('target', [req.params.start, req.params.end])
  
        res.status(200).json(getConsensus)
    
    } catch (err) {
      console.log(err)
      res.status(400).json(null)
    }
  })

// Get consensus by signature
router.get('/signature/:signature', async function(req, res, next) {
  try {
  
      const getConsensus = await db('consensus')
      .select()
      .where('signature', req.params.signature)

      res.status(200).json(getConsensus)
  
  } catch (err) {
    res.status(400).json(null)
  }
})


module.exports = router
