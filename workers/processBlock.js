// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const moment = require('moment')

// Consumes all items in block queue
module.exports = function (blockQueue) {

  blockQueue.consume('blockQueue', processBlock)

  async function processBlock (msg) {

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {
      const block = JSON.parse(msg.content.toString())

      // Check if block hasn't been inserted yet
      const checkBlock = await txn('blocks')
        .count('* as count')
        .where('index', block.height)

      if (checkBlock[0].count === 0) {

        // Store block
        await txn('blocks').insert({
          index: block.height,
          reference: block.reference,
          generator: block.generator,
          signature: block.signature,
          size: block.blocksize || 0,
          count: block.transactionCount || 0,
          fee: block.fee / +process.env.ATOMIC_NUMBER || 0,
          version: block.version || 0,
          timestamp: block.timestamp,
          datetime: moment(block.timestamp).format('YYYY-MM-DD HH:mm:ss')
        })

        // Store block consensus
        await txn('consensus').insert({
          index: block.height,
          target: block['nxt-consensus']['base-target'],
          signature: block['nxt-consensus']['generation-signature']
        })

        // Store block feature
        if (block.features) {
          block.features.map(async (feature) => {
            await txn('features').insert({
              index: block.height,
              feature: feature
            })
          })
        }

        console.log('[Block] [' + block.height + '] collected')
      }
      else {
        console.warn('[Block] [' + block.height + '] duplicate')
      }

      // Commit transaction and acknowledge message
      await txn.commit()
      await blockQueue.ack(msg)

    } catch (err) {
      // roll back transaction and send message back to the queue
      await txn.rollback()
      await blockQueue.nack(msg)
      console.error('[Block]: ' + err.toString())
    }
  }
}
