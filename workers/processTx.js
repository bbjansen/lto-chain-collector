// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const moment = require('moment')
const UUID = require('uuid/v4')

// Consumes all items in tx queue
module.exports = function (txQueue, addressQueue) {
  try {

    // Consume one transaction at a time
    txQueue.prefetch(1)
    txQueue.consume('txQueue', processTx)
  }
  catch(err) {

    console.error('[Tx]: ' + err.toString())
  }

  async function processTx (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())

    // Check for transactions
    if (block.transactionCount >= 1) {

      // loop through transactions
      for (let tx of block.transactions) {

        // Handles db transaction
        const txn = await promisify(db.transaction.bind(db))

        try {

          // Store Tx
          await txn('transactions').insert({
            id: tx.id,
            type: tx.type,
            block: block.height,
            recipient: tx.recipient,
            sender: tx.sender,
            senderPublicKey: tx.senderPublicKey,
            amount: (tx.amount / +process.env.ATOMIC_NUMBER) || (tx.totalAmount / +process.env.ATOMIC_NUMBER) || null,
            fee: tx.fee / +process.env.ATOMIC_NUMBER,
            signature: tx.signature,
            attachment: tx.attachment,
            timestamp: tx.timestamp,
            datetime: moment(tx.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            version: tx.version,
            leaseId: tx.leaseId,
            confirmed: +process.env.CONFIRM_BLOCKS === 0 ? true : false
          })

          // Store Tx Proofs
          if (tx.proofs) {
            await txn('proofs').insert({
              tid: tx.id,
              proofs: JSON.stringify(tx.proofs)
            })
          }

          // Store Tx Anchors
          if (tx.anchors) {
            await txn('anchors').insert({
              tid: tx.id,
              anchors: JSON.stringify(tx.anchors)
            })
          }

          // Store Tx Transfers
          // not part of db transaction at the moment
          // problem with mapping promise - transaction already ended

          if (tx.transfers) {
            for(let tx of tx.transfers) {

              await txn('transfers').insert({
                tid: tx.id,
                recipient: transfer.recipient,
                amount: (transfer.amount / +process.env.ATOMIC_NUMBER) || null
              })

              // If enabled, update recipient balance.
              // Useful to disable when wanting a quick
              // resync from scratch.

              if(+process.env.UPDATE_ADDRESSES) {
                  addressQueue.sendToQueue('addressQueue', new Buffer(JSON.stringify(transfer.recipient)), {
                  correlationId: UUID()
                })
              }
            }
          }

          // If enabled, update unique recipient balance.
          // Useful to disable when wanting a quick
          // resync from scratch.
          
          if(+process.env.UPDATE_ADDRESSES) {
            
            // Create an array with unique addresses from each transaction
            let uniqueAddresses = new Set()

            block.transactions.forEach((tx) => uniqueAddresses.add(tx.recipient))
            block.transactions.forEach((tx) => uniqueAddresses.add(tx.sender))
            uniqueAddresses = [...uniqueAddresses]
            uniqueAddresses.filter(Boolean)

            // Update balances of each address 
            uniqueAddresses.forEach(address => {
              if(address) {
                addressQueue.sendToQueue('addressQueue', new Buffer(JSON.stringify(address)), {
                  correlationId: UUID()
                })
              }
            })
          }

          // Commit db transaction
          await txn.commit()

          console.log('[Tx] [' + tx.id + '] collected')
        }
        catch(err) {
      
          // SQL errror 1062 = duplicate entry
          if(err.errno === 1062) {
            
            // Commit db transaction
            await txn.commit()

            console.warn('[Tx] [' + tx.id + '] duplicate')
          } else {

            // Rollback db transaction
            await txn.rollback()

            console.error('[Block] [' + block.height + '] ' + err.toString())
          }
        }
      }
    }

    // Acknowledge message
    await txQueue.ack(msg)
  }
}