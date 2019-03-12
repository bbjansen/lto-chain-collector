// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex
const moment = require('moment')

// stats
router.get('/all', async function(req, res, next) {
  try {

    const firstBlock = await db('blocks')
    .select('timestamp')
    .where('index', 1)
    .limit(1)

    const lastBlock = await db('blocks')
    .select('index', 'timestamp')
    .orderBy('blocks.index', 'desc')
    .limit(1)

    const avgBlock = await db('blocks')
    .avg('size as size')
    .avg('count as count')
    .avg('fee as fee')

    const sumBlock = await db('blocks')
    .sum('size as size')
    .sum('count as count')
    .sum('fee as fee')

    const blockDiff = moment.duration(moment(lastBlock[0].timestamp).diff(moment(firstBlock[0].timestamp))).asSeconds()
    const avgBlockTime = blockDiff / (lastBlock[0].index - 1)

    const countTxns = await db('transactions')
    .count('* as count')
    .where('type', 4)

    const countAnchors = await db('transactions')
    .count('* as count')
    .where('type', 15)

    const countStartLease = await db('transactions')
    .count('* as count')
    .where('type', 8)

    const countCancelLease = await db('transactions')
    .count('* as count')
    .where('type', 9)

    const countMassTx = await db('transactions')
    .count('* as count')
    .where('type', 11)

    const countMassTransfers = await db('transfers')
    .count('* as count')

    const totalAddresses = await db('addresses')
    .count('* as count')
    
    const activeAddresses = await db('addresses')
    .count('* as count')
    .where('regular', '>', 0)
    .orWhere('generating', '>', 0)
    .orWhere('available', '>', 0)
    .orWhere('effective', '>', 0)


    const totalGenerators = await db('blocks')
    .count('generator as sum')
    .groupBy('generator')

    const avgConsensus = await db('consensus')
    .avg('target as target')

    const stats = {
      stats: {
        totalBlocks: lastBlock[0].index,
        totalTxns: sumBlock[0].count,
        totalSize: sumBlock[0].size,
        totalFee: sumBlock[0].fee,
        totalAddresses: totalAddresses[0].count,
        totalGenerators: totalGenerators.length,
        averageEmission: +avgBlockTime.toFixed(0),
        averageBlockSize: +avgBlock[0].size.toFixed(0),
        averageBlockTxns: +avgBlock[0].count.toFixed(2),
        averageBlockFee: +avgBlock[0].fee.toFixed(2),
        averageTarget: +avgConsensus[0].target.toFixed(2),
        activeLeases: countStartLease[0].count - countCancelLease[0].count,
        activeAddresses: activeAddresses[0].count,
        tx: {
          standard: countTxns[0].count,
          anchor: countAnchors[0].count,
          massTransactions: countMassTx[0].count,
          massTransfers: countMassTransfers[0].count,
          startLease: countStartLease[0].count,
          cancelLease: countCancelLease[0].count,
        },
      },
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss Z')
    }
    res.status(200).json(stats)

  } catch (err) {
    next(err)
  }
})

// Get transactions count by period
router.get('/transaction/:period', async function(req, res, next) {
  try {

    let range
    let scale

    if(req.params.period === 'day') {
      range = 'day'
      scale = '%Y-%m-%d %H'
    }
    else if(req.params.period === 'week') {
      range = 'week'
      scale = '%Y-%m-%d'
    }
    else if(req.params.period === 'month') {
      range = 'month'
      scale = '%Y-%m-%d'
    }
    else if(req.params.period === 'year') {
      range = 'year'
      scale = '%Y-%m'
    }

    const countTxns = await db('transactions')
    .count('* as count')
    .where('type', 4)
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    const countAnchors = await db('transactions')
    .count('* as count')
    .where('type', 15)
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    const countStartLease = await db('transactions')
    .count('* as count')
    .where('type', 8)
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    const countCancelLease = await db('transactions')
    .count('* as count')
    .where('type', 9)
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    const countMassTx = await db('transactions')
    .count('* as count')
    .select()
    .where('type', 11)
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])

    const countMassTransfers = await db('transfers')
    .leftOuterJoin('transactions', 'transfers.tid', 'transactions.id')
    .count('* as count')
    .whereBetween('transactions.datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
    //.groupBy('transfers.tid')


    const getData = await db('transactions')
    .select(db.raw('date_format(datetime, "' + scale + '") as period, type'))
    .count('* as count')
    .whereBetween('datetime', [moment().subtract(1, range).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
    .groupByRaw('date_format(datetime, "' + scale + '")')
    .groupBy('type')

    const stats = {
      stats: {
        standard: countTxns[0].count,
        anchor: countAnchors[0].count,
        massTransactions: countMassTx[0].count,
        massTransfers: countMassTransfers[0].count,
        startLease: countStartLease[0].count,
        cancelLease: countCancelLease[0].count,
      },
      data: getData,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss Z')
    }
    
    res.status(200).json(stats)
  
  } catch (err) {
    next(err)
  }
})

module.exports = router
