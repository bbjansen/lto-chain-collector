// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Block last
router.get('/last', async function(req, res, next) {
  try {

      const getBlock = await db('blocks')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .orderBy('index', 'desc')
      .limit(1)

      const getConsensus = await db('consensus')
      .select('target', 'signature')
      .where('index', getBlock[0].index)
      .limit(1)

      getBlock.push({consensus: getConsensus[0]})

      const getTranfers = await db('transactions')
      .select('type', 'id')
      .where('block', getBlock[0].index)
  
      getBlock.push({transactions: getTranfers})
  
      res.status(200).json(getBlock)

  } catch (err) {
    console.log(err)
    next(err)
}
})


// Block Range
router.get('/:start/:end', async function(req, res, next) {
  try {

    const getBlocks = await db('blocks')
    .select()
    .whereBetween('index', [req.params.start, req.params.end])
    .limit(1000)

    res.status(200).json(getBlocks)

  } catch (err) {
    next(err)
  }
})


// Get block by generator address
router.get('/address/:address', async function(req, res, next) {
  try {

      const getBlocks = await db('blocks')
      .select()
      .where('generator', req.params.address)
      .orderBy('index', 'desc')
      .limit(1)

      res.status(200).json(getBlocks)

  } catch (err) {
    next(err)
  }
})


// Get unconfirmed blocks
router.get('/unconfirmed', async function(req, res, next) {
  try {
      const getBlocks = await db('blocks')
      .select()
      .whereRaw('datetime > NOW() - INTERVAL 90 MINUTE')
      .where('confirmed', false)
      .orderBy('index', 'desc')

      res.status(200).json(getBlocks)

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Get orphaned blocks
router.get('/orphans', async function(req, res, next) {
  try {
      const getBlocks = await db('blocks')
      .select()
      .whereRaw('datetime < NOW() - INTERVAL 90 MINUTE')
      .where('confirmed', false)
      .orderBy('index', 'desc')

      res.status(200).json(getBlocks)

  } catch (err) {
    next(err)
  }
})

// Block at index
router.get('/:index', async function(req, res, next) {
  try {

    const getBlock = await db('blocks')
    .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
    .orderBy('index', 'desc')
    .limit(1)

    const getConsensus = await db('consensus')
    .select('target', 'signature')
    .where('index', getBlock[0].index)
    .limit(1)

    getBlock.push({consensus: getConsensus[0]})

    const getTranfers = await db('transactions')
    .select('type', 'id')
    .where('block', getBlock[0].index)

    getBlock.push({transactions: getTranfers})

    res.status(200).json(getBlock)

  } catch (err) {
    next(err)
  }
})

module.exports = router
