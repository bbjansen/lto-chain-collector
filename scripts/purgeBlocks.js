// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')
const db = require('../utils/utils').knex

purgeBlocks(process.argv[2])

async function purgeBlocks (start) {
  try {
    const blocks = await db('blocks')
      .select('index')
      .where('index', '>=', start)

    const end = (+start + +blocks.length)

    blocks.map(async (b) => {
      await db('blocks')
        .where('index', b.index)
        .del()

      await db('consensus')
        .where('index', b.index)
        .del()

      await db('features')
        .where('index', b.index)
        .del()

      console.log('[Block] Purged ' + b.index)
    })

    const txns = await db('transactions')
      .select('id')
      .whereBetween('block', [start, end])

    txns.map(async (t) => {
      await db('transactions')
        .where('id', t.id)
        .del()

      await db('proofs')
        .where('tid', t.id)
        .del()

      await db('anchors')
        .where('tid', t.id)
        .del()

      await db('transfers')
        .where('tid', t.id)
        .del()

      console.log('[Purged] Tx ' + t.id)
    })

    console.log('[Purged] Block ' + start + ' - ' + end)
  } catch (err) {
    console.error('[Purged]' + err.toString())
  }
}
