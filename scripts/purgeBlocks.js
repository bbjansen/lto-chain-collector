// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')
const db = require('../utils/utils').knex

purgeBlocks(process.argv[2])

async function purgeBlocks (start) {
  try {
    const blocks = await txn('blocks')
      .select('index')
      .where('index', '>=', start)

    const end = (+start + +blocks.length)

    for (let b of blocks) {
      await txn('blocks')
        .where('index', b.index)
        .del()

      await txn('consensus')
        .where('index', b.index)
        .del()

      await txn('features')
        .where('index', b.index)
        .del()

      console.log('[Block] Purged ' + b.index)
    }

    const txns = await txn('transactions')
      .select('id')
      .whereBetween('block', [start, end])

    for (let t of txns) {
      await txn('transactions')
        .where('id', t.id)
        .del()

      await txn('proofs')
        .where('tid', t.id)
        .del()

      await txn('anchors')
        .where('tid', t.id)
        .del()

      await txn('transfers')
        .where('tid', t.id)
        .del()

      console.log('[Purged] Tx ' + t.id)
    }

    console.log('[Purged] Block ' + start + ' - ' + end)
  } catch (err) {
    console.error('[Purged]' + err.toString())
  }
}
