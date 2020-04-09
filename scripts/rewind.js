// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'


// Do not even think about using this function to rewind tens of thousands,
// let alone hundreds of thousands of blocks. Preferably should only be used 
// for less than 500 blocks.

const promisify = require('../libs').promisify
const db = require('../libs').knex

module.exports = async function rewindChain (target) {

  // Handles db transaction
  const txn = await promisify(db.transaction.bind(db))

  try {

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

      console.log('[Block] [' + b.index + '] rewinded')
    }


    // Select all transaction(s)
    const txns = await txn('transactions')
      .select('id')
      .where('block', '>=', target)

    
    // Loop through all transactions and delete associated
    // proofs, anchors and tranfer(s).
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

      console.log('[Tx] [' + t.id + '] rewinded')
    }

    // Commit db transaction
    await txn.commit()

    console.log('[Block] [' + target + ' - ' + end + '] rewinded')

    // Return message with success
    return true

  } catch (err) {

    // Rollback db transaction
    await txn.rollback()

    console.error('[Rewind]' + err.toString())

    // Return message with success
    return false
  }
}