// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../libs').promisify
const db = require('../libs').knex
const UUID = require('uuid/v4')

// Consumes all items in tx queue
module.exports = async function (Transactions, Addresses) {
  try {

    // 1:1
    // Consume one message at a time for optimum speed,
    // stability and data integrity.
    Transactions.prefetch(1)
    Transactions.consume('transactions', processTx)
  }
  catch(err) {

    console.error('[Tx]: ' + err.toString())
  }

  async function processTx (msg) {

    // Parse message content
    const block = JSON.parse(msg.content.toString())

    // Check for transactions
    if (block.transactionCount >= 1) {

      // Loop through all the blocks transactions
      for (let tx of block.transactions) {

        // Start db transaction
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
            version: tx.version,
            leaseId: tx.leaseId,
            verified: +process.env.VERIFY_CACHE === 0 ? true : false
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
          if (tx.transfers) {
            for (let transfer of tx.transfers) {

              await txn('transfers').insert({
                tid: tx.id,
                recipient: transfer.recipient,
                amount: (transfer.amount / +process.env.ATOMIC_NUMBER) || null
              })

              // If enabled, update recipient balance.
              // Useful to disable when wanting a quick
              // resync from scratch.

              if(+process.env.UPDATE_ADDRESSES) {
                  await Addresses.sendToQueue('addresses', new Buffer(JSON.stringify(transfer.recipient)), {
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

            for (let tx of block.transactions) { uniqueAddresses.add(tx.recipient) }
            for (let tx of block.transactions) { uniqueAddresses.add(tx.sender) }

            uniqueAddresses = [...uniqueAddresses]
            uniqueAddresses.filter(Boolean)

            // Update balances of each address 
            for (let address of uniqueAddresses) {
              if(address) {
                await Addresses.sendToQueue('addresses', new Buffer(JSON.stringify(address)), {
                  correlationId: UUID()
                })
              }
            }
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
    await Transactions.ack(msg)
  }
}