// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../utils/utils').knex
const moment = require('moment')

// Consumes all items in block queue
module.exports = function (blockQueue) {

  // Consume one block at a time
  blockQueue.prefetch(1)

  blockQueue.consume('blockQueue', processBlock)

  async function processBlock (msg) {

    const block = JSON.parse(msg.content.toString())

    try {

      // Store block
      await db('blocks').insert({
        index: block.height,
        reference: block.reference,
        generator: block.generator,
        signature: block.signature,
        size: block.blocksize || 0,
        count: block.transactionCount || 0,
        fee: block.fee / +process.env.ATOMIC_NUMBER || 0,
        version: block.version || 0,
        timestamp: block.timestamp,
        datetime: moment(block.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        confirmed: +process.env.CONFIRM_BLOCKS === 0 ? true : false
      })

      // Store block consensus
      await db('consensus').insert({
        index: block.height,
        target: block['nxt-consensus']['base-target'],
        signature: block['nxt-consensus']['generation-signature']
      })

      // Store block feature
      if (block.features) {
        await db('features').insert({
          index: block.height,
          features: JSON.stringify(block.features)
        })
      }

      console.log('[Block] [' + block.height + '] collected')
    
      // Acknowledge message
      await blockQueue.ack(msg)

    } catch (err) {

      // If duplicate entry, acknowledge message
      if(err.errno === 1062) {
        await blockQueue.ack(msg)
        console.warn('[Block] [' + block.height + '] duplicate')
      } else {

        // Send message back to the queue for a retry
        await blockQueue.nack(msg)
        console.error('[Block]: ' + err.toString())
      }
    }
  }
}
