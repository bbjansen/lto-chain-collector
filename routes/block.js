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
    .leftJoin('consensus', 'blocks.index', 'consensus.index')
    .rightJoin('transactions', 'blocks.index', 'transactions.block')
    .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target'))
    .orderBy('blocks.index', 'desc')
    .limit(1)
    .options({
      nestTables: true
    })

  

    res.status(200).json(getBlock[0])

  } catch (err) {
    console.log(err)
    next(err)
}
})


router.get('/last/:index', async function(req, res, next) {
  try {

      const getBlocks = await db('blocks')
      .leftJoin('consensus', 'blocks.index', 'consensus.index')
      .rightJoin('transactions', 'blocks.index', 'transactions.block')
      .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target, transactions.id, transactions.type'))
      .orderBy('blocks.index', 'desc')
      .limit(req.params.index)
      .options({
        nestTables: true
      })

      res.status(200).json(getBlocks)

  } catch (err) {
    console.log(err)
    next(err)
}
})


// Block Range
router.get('/:start/:end', async function(req, res, next) {
  try {

    const getBlocks = await db('blocks')
    .leftJoin('consensus', 'blocks.index', 'consensus.index')
    .rightJoin('transactions', 'blocks.index', 'transactions.block')
    .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target, transactions.id, transactions.type'))
    .whereBetween('blocks.index', [req.params.start, req.params.end])
    .orderBy('blocks.index', 'desc')
    .limit(1000)
    .options({
      nestTables: true
    })

    res.status(200).json(getBlocks)

  } catch (err) {
    next(err)
  }
})


// Get block by generator address
router.get('/address/:address', async function(req, res, next) {
  try {

    const getBlock = await db('blocks')
    .leftJoin('consensus', 'blocks.index', 'consensus.index')
    .rightJoin('transactions', 'blocks.index', 'transactions.block')
    .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target, transactions.id, transactions.type'))
    .where('generator', req.params.address)
    .orderBy('blocks.index', 'desc')
    .options({
      nestTables: true
    })

    res.status(200).json(getBlock)

  } catch (err) {
    next(err)
  }
})


// Get unconfirmed blocks
router.get('/unconfirmed', async function(req, res, next) {
  try {
    const getBlocks = await db('blocks')
    .leftJoin('consensus', 'blocks.index', 'consensus.index')
    .rightJoin('transactions', 'blocks.index', 'transactions.block')
    .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target, transactions.id, transactions.type'))
    .whereRaw('blocks.datetime > NOW() - INTERVAL 90 MINUTE')
    .where('blocks.confirmed', false)
    .orderBy('blocks.index', 'desc')
    .limit(1000)
    .options({
      nestTables: true
    })

    res.status(200).json(getBlocks)

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Block at index
router.get('/:index', async function(req, res, next) {
  try {

    const getBlock = await db('blocks')
    .leftJoin('consensus', 'blocks.index', 'consensus.index')
    .rightJoin('transactions', 'blocks.index', 'transactions.block')
    .select(db.raw('blocks.index, blocks.reference, blocks.generator, blocks.signature, blocks.size, blocks.count, blocks.fee, blocks.version, blocks.timestamp, blocks.confirmed, consensus.signature, consensus.target, transactions.id, transactions.type'))
    .where('blocks.index', req.params.index)
    .orderBy('blocks.index', 'desc')
    .limit(1)
    .options({
      nestTables: true
    })

    res.status(200).json(getBlock[0])

  } catch (err) {
    next(err)
  }
})

module.exports = router
