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
  
  // Consume one transaction at a time
  txQueue.prefetch(1)

  txQueue.consume('txQueue', processTx)

  async function processTx (msg) {

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {
      const block = JSON.parse(msg.content.toString())

      // Check for transactions
      if (block.transactionCount >= 1) {

        // map transactions
        block.transactions.map(async (tx) => {

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
            leaseId: tx.leaseId
          })

          // Store Tx Proofs
          if (tx.proofs) {
            await txn('proofs').insert({
              tid: tx.id,
              proof: proofs
            })
          }

          // Store Tx Anchors
          if (tx.anchors) {
            await txn('anchors').insert({
              tid: tx.id,
              anchor: anchors
            })
          }


          // Commit transaction
          await txn.commit()

          // Store Tx Transfers
          // not part of db transaction at the moment
          // problem with mapping promise - transaction already ended

          if (tx.transfers.length >= 1) {
            tx.transfers.map(async (transfer) => {

              await db('transfers').insert({
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
            })
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


          console.log('[Tx] [' + tx.id + '] processed')
        })
      }

      // Ackownledge
      await txQueue.ack(msg)

    } catch (err) {
      // roll back transaction and send message back to the queue
      await txn.rollback()
      await txQueue.nack(msg)
      console.error('[Tx]' + err.toString())
    }
  }
}
