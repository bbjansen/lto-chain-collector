// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../libs').promisify
const db = require('../libs').knex
const axios = require('axios')
const UUID = require('uuid/v4')


// Housekeeping.
// This bebe is needed incase we are dealing with chain divergence
// which is caused by hash collision.

const rewindChain = require('../scripts/rewind');

// Verify collected blocks and transactions against hooliganism
// and other shenanigans.

module.exports = async function (Verifier, Collector, Blocks, Transactions, Addresses) {
 
  try {

    // 1:1
    // Consume one message at a time for optimum speed,
    // stability and data integrity.

    Verifier.prefetch(1)
    Verifier.consume('verify', confirmBlock)
  }
  catch (err) {

    console.error('[Block]: ' + err.toString())
  }

  async function confirmBlock (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())

    // Start db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {

      // We may need this for later, ignore for now.

      let rewind = false

      // Let's check if the signature of the collected block still
      // matches with the currently known signature to the network.
      // In order to do that we'll need to fetch the block from the
      // network.

      const check = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/blocks/at/' + block.height, {
        timeout: +process.env.TIMEOUT
      })

      // It's a match!
      if (check.data.signature === block.signature) {

        // Mark block as verified.
        await txn('blocks').update({
          verified: true
        })
        .where('index', block.height)

        console.log('[Block] [' + block.height + '] verified')
      }
      else {

        // Oooh snap!

        // Signature mismatch happens when the signature at the time
        // of collection does not match with the one given by the network.
         
        // A block signature is a hash that mining node acquires when
        // it signs the generated block with the private key of
        // the mining account.


        // We'll need this for later
        rewind = true

        // Stop the collector
        await Collector.stop()

        // purge all queues
        await Addresses.purgeQueue('addresses')
        await Blocks.purgeQueue('blocks')
        await Transactions.purgeQueue('transactions')
        await Verifier.purgeQueue('verify')
 
        // Rewind the chain to n-1 mismatched block. 
        await rewindChain(+block.height - 1)

        // Start the collector
        await Collector.start()
      }

      // Ignores this if a rewind has been activated due to a block signature mismatch
      if(!rewind) {

        // While we are at it, lets also check if the transaction count and
        // block size of the collected block still matches.
        if((check.data.transactionCount === block.transactionCount) && (check.data.blocksize === block.blocksize)) {

          // Update all transactions verified statuses belonging to the block.
          await txn('transactions').update({
            verified: true
          })
          .where('block', block.height)

          console.log('[Block] [' + block.height + '] ' + check.data.transactionCount + ' transactions(s) verified')

        }
        else {

          // Add any transactions that weren't added yet in case the block
          // was freshly forged during the collecting process. This can
          // happen because transactions are added by a different 
          // producer than the one who forges the block.

          // We achieve this by simply sending the newly checked block data to 
          // the transaction queue which ignores duplicates.

          console.warn('[Block] [' + block.height + '] ' + (+check.data.transactionCount - +block.transactionCount) + ' transactions(s) missing on verfication')

          await Transactions.sendToQueue('transactions', new Buffer(JSON.stringify(check.data)), {
            correlationId: UUID()
          })
        }
      }

      // Commit db transaction
      txn.commit()

      // Acknowledge message
      await Verifier.ack(msg)

    }
    catch (err) {

      // Rollback db transaction
      await txn.rollback()

      // Send message back to the queue for a retry
      await Verifier.nack(msg)

      console.error('[Block] [' + block.height + '] ' + err.toString())
    }
  }
}
