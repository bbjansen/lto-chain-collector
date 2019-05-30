// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Get proof by id
router.get('/:proof', async function(req, res, next) {
  try {

      const getProof = await db('proofs')
      .select('tid', 'proof')
      .where('proof', req.params.proof)

      res.json(getProof)

  } catch (err) {
    next(err)
  }
})

// Get proof by tid
router.get('/transaction/:id', async function(req, res, next) {
  try {
  
      const getProof = await db('proofs')
      .select('tid', 'proof')
      .where('tid', req.params.id)

      res.status(200).json(getProof)
  
  } catch (err) {
    next(err)
  }
})

module.exports = router
