// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../../libs').promisify
const db = require('../../libs').knex
const UUID = require('uuid/v4')

// Second workflow. Collected blocks waiting in the `keyBlock` queue
// are consumed on a 1:1 bases. The worker stores each block in the database
// and adds block n-1 to the `microBlock` queue.

module.exports = async function (keyBlock, microBlock) {
  try {

    // 1:1
    // Consume one message at a time for optimum speed,
    // stability and data integrity.

    keyBlock.prefetch(1)
    keyBlock.consume('keyBlock', store)
  }
  catch(err) {

    console.error('[Block]: ' + err.toString())
  }

  async function store (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())
  
    // Start db transaction
    const txn = await promisify(db.transaction.bind(db))
  
    try {

      // When we are at the tip of the chain (in sync), there is a high
      // probability that the block we collected has not finalized yet.

      // Before we store block n, lets add block n-1 to the `microBlock queue 
      // now that it has been finalized and we can fetch the finalized metadata.

      // Ignore n-1-1
      if(+block.height >= 2) {
        await microBlock.sendToQueue('microBlock', new Buffer(JSON.stringify(+block.height - 1)), {
          correlationId: UUID()
        })
      }

      // Store block n
      await txn('blocks').insert({
        index: block.height,
        reference: block.reference,
        generator: block.generator,
        signature: block.signature,
        size: block.blocksize,
        count: block.transactionCount,
        fee: block.fee / +process.env.ATOMIC_NUMBER || 0,
        version: block.version || 0,
        timestamp: block.timestamp,
        verified: +process.env.VERIFY_CACHE === 0 ? true : false
      })
  
      // Store block n consensus
      await txn('consensus').insert({
        index: block.height,
        target: block['nxt-consensus']['base-target'],
        signature: block['nxt-consensus']['generation-signature']
      })
  
      // Store block n feature
      if (block.features) {
        await txn('features').insert({
          index: block.height,
          features: JSON.stringify(block.features)
        })
      }
  
      // Commit db transaction
      await txn.commit()
    
      // Acknowledge message
      await keyBlock.ack(msg)
  
      console.log('[Block] [' + block.height + '] collected')
  
    } catch (err) {
  
      // SQL error 1062 = duplicate entry
      if(err.errno === 1062) {
  
        // Acknowledge message 
        await keyBlock.ack(msg)
  
        console.warn('[Block] [' + block.height + '] duplicate')
      } else {

        // Rollback db transaction
        await txn.rollback()

        // Send message back to the queue for a retry
        await keyBlock.nack(msg)

        console.error('[Block] [' + block.height + '] ' + err.toString())
      }
    }
  }
}


