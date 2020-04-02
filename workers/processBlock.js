// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const moment = require('moment')

// Processes all blocks it receives from the producer collectBlock.js

module.exports = async function (blockQueue) {
  try {

    // Consume one block at a time
    blockQueue.prefetch(1)
    blockQueue.consume('blockQueue', processBlock)
  }
  catch(err) {

    console.error('[Block]: ' + err.toString())
  }

  async function processBlock (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())
  
    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))
  
    try {
  
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
        datetime: moment(block.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        verified: +process.env.CONFIRM_BLOCKS === 0 ? true : false
      })
  
      // Store block consensus
      await txn('consensus').insert({
        index: block.height,
        target: block['nxt-consensus']['base-target'],
        signature: block['nxt-consensus']['generation-signature']
      })
  
      // Store block feature
      if (block.features) {
        await txn('features').insert({
          index: block.height,
          features: JSON.stringify(block.features)
        })
      }
  
      // Commit db transaction
      await txn.commit()
    
      // Acknowledge message
      await blockQueue.ack(msg)
  
      console.log('[Block] [' + block.height + '] collected')
  
    } catch (err) {
  
      // SQL errror 1062 = duplicate entry
      if(err.errno === 1062) {
  
        // Acknowledge message 
        await blockQueue.ack(msg)
  
        console.warn('[Block] [' + block.height + '] duplicate')
      } else {

        // Rollback db transaction
        await txn.rollback()

        // Send message back to the queue for a retry
        await blockQueue.nack(msg)

        console.error('[Block] [' + block.height + '] ' + err.toString())
      }
    }
  }
}


