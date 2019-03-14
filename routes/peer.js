// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex
const moment = require('moment')

// Get all peers
router.get('/all', async function(req, res, next) {
  try {
      const getPeers = await db('peers')
      .select()

      res.json(getPeers)
  } catch (err) {
    next(err)
  }
})


// Get peer by address
router.get('/:address', async function(req, res, next) {
  try {
      const getPeers = await db('peers')
      .where('address', req.params.address)
      .select()

      res.json(getPeers)
  } catch (err) {
    next(err)
  }
})

router.get('/last/:period', async function(req, res, next) {
  try {
    
    let range

    if(req.params.period === 'hour') {
      range = 'hour'
    }
    else if(req.params.period === 'day') {
      range = 'days'
    }
    else if(req.params.period === 'week') {
      range = 'week'
    }
    else if(req.params.period === 'month') {
      range = 'month'
    }
    else if(req.params.period === 'year') {
      range = 'year'
    }


    const getPeers = await db('peers')
    .select()
    .whereBetween('updated', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])


    res.json(getPeers)
  } catch (err) {
    next(err)
  }
})



module.exports = router
