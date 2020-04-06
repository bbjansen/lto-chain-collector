// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex

async function rewindChain (target) {
  try {

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))


    // Grab all blocks equal or greater than target.
    const blocks = await txn('blocks')
      .select('index')
      .where('index', '>=', target)

    const end = (+target + +blocks.length)


    // Loop through all blocks and delete associated
    // consensus and features data.

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

      console.log('[Block] Rewind ' + b.index)
    }


    // Select all transasctions
    const txns = await txn('transactions')
      .select('id')
      .where('block', '>=', target)

    
    // Loop through all transactions and delete associated
    // proofs, anchors and tranfers.
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

      console.log('[Rewind] Tx ' + t.id)
    }

    // Commit db transaction
    await txn.commit()

    console.log('[Rewind] Block ' + target + ' - ' + end)

  } catch (err) {

    // Rollback db transaction
    await txn.rollback()

    console.error('[Rewind]' + err.toString())
  }
}

module.exports = rewindChain