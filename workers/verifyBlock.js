// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const axios = require('axios')
const UUID = require('uuid/v4')

// Processes unverified blocks added by the producer collectBlocks.js
// Confirms the block against the node to see if it exists and has a 
// valid signature match.

module.exports = async function (verifyQueue, txQueue) {
  try {
    // Consume one block at a time
    verifyQueue.prefetch(1)
    verifyQueue.consume('verifyQueue', confirmBlock)

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

        // Add any transactions that weren't added yet in case the block
        // was freshly forged during the collecting process. This is
        // necessary because transactions are added by a different 
        // producer than the one who forges the block.

        // We achieve this by simply sending the block once again to 
        // the transaction queue which ignores duplicates.

        txQueue.sendToQueue('txQueue', new Buffer(JSON.stringify(block)), {
          correlationId: UUID()
        })

        // Update block verified status
        await txn('blocks').update({
          verified: true
        })
        .where('index', block.height)

        // Update all transactions verified statuses belonging to the block.
        await txn('transactions').update({
          verified: true
        })
        .where('block', block.height)

        console.log('[Block] [' + block.height + '] verified')
      }

      // Commit db transaction
      txn.commit()

      // Acknowledge message
      await verifyQueue.ack(msg)

    }
    catch (err) {

      // Rollback db transaction
      await txn.rollback()

      // Send message back to the queue for a retry
      await verifyQueue.nack(msg)

      console.log('[Block] [' + block.height + '] ' + err.toString())
    }
  }
}
