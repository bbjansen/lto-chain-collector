// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const axios = require('axios')

// Processes unconfirmed blocks added in the queue when they got processed.
// Confirms the block against the node to see if it exists and valid.

module.exports = function (confirmQueue) {

  confirmQueue.consume('confirmQueue', confirmBlock)

  async function confirmBlock (msg) {

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {
      const block = JSON.parse(msg.content.toString())
      
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

      // Commit transaction and acknowledge message
      await txn.commit()
      await confirmQueue.ack(msg)

    } catch (err) {
      // roll back transaction and send message back to the queue
      await txn.rollback()
      await confirmQueue.nack(msg)
      console.log('[Block] ' + err.toString())
    }
  }
}
