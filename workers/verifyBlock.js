// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const axios = require('axios')

// Processes unconfirmed blocks added by the producer collectBlocks.js
// Confirms the block against the node to see if it exists and has a 
// valid signature match.

module.exports = async function (confirmQueue) {
  try {
    // Consume one transaction at a time
    confirmQueue.prefetch(1)
    confirmQueue.consume('confirmQueue', confirmBlock)

  }
  catch (err) {

    console.error('[Block]: ' + err.toString())
  }

  async function confirmBlock (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {

      // Get block data
      const check = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/blocks/at/' + block.height, {
        timeout: +process.env.TIMEOUT
      })

      // Validate signature
      if (check.data.signature === block.signature) {

        // Update block
        await txn('blocks').update({
          confirmed: true
        })
        .where('index', block.height)

        // Update tx belonging to block
        await txn('transactions').update({
          confirmed: true
        })
        .where('block', block.height)

        console.log('[Block] [' + block.height + '] confirmed')
      }

      // Commit db transaction
      txn.commit()

      // Acknowledge message
      await confirmQueue.ack(msg)

    }
    catch (err) {

      // Rollback db transaction
      await txn.rollback()

      // Send message back to the queue for a retry
      await confirmQueue.nack(msg)

      console.log('[Block] [' + block.height + '] ' + err.toString())
    }
  }
}
