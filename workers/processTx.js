// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../utils/utils').knex
const moment = require('moment')
const UUID = require('uuid/v4')

// Consumes all items in tx queue
module.exports = function (txQueue, addressQueue) {
  txQueue.consume('txQueue', processTx)

  async function processTx (msg) {
    try {
      const block = JSON.parse(msg.content.toString())

      // If tx: map and store block transactions
      if (block.transactionCount >= 1) {
        block.transactions.map(async (tx) => {

          // Store Tx
          await db('transactions').insert({
            id: tx.id,
            type: tx.type,
            block: block.height,
            recipient: tx.recipient,
            sender: tx.sender,
            senderPublicKey: tx.senderPublicKey,
            amount: (tx.amount / 100000000) || (tx.totalAmount / 100000000) || null,
            fee: tx.fee / 100000000,
            signature: tx.signature,
            attachment: tx.attachment,
            timestamp: tx.timestamp,
            datetime: moment(tx.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            version: tx.version,
            leaseId: tx.leaseId
          })

          // Store Tx Proofs
          if (tx.proofs) {
            tx.proofs.map(async (proof) => {
              await db('proofs').insert({
                tid: tx.id,
                proof: proof
              })
            })
          }

          // Store Tx Anchors
          if (tx.anchors) {
            tx.anchors.map(async (anchor) => {
              await db('anchors').insert({
                tid: tx.id,
                anchor: anchor
              })
            })
          }

          // Store Tx Transfers
          if (tx.transfers) {
            tx.transfers.map(async (transfer) => {
              await db('transfers').insert({
                tid: tx.id,
                recipient: transfer.recipient,
                amount: (transfer.amount / 100000000) || null
              })

              // If enabled, update recipient balance.
              // Useful to disable when wanting a quick
              // resync from scratch.

              if(process.env.UPDATE_ADDRESSES === 1 || !UPDATE_ADDRESSES) {
                  addressQueue.sendToQueue('addressQueue', new Buffer(JSON.stringify(transfer.recipient)), {
                  correlationId: UUID()
                })
              }
            })
          }
          console.log('[Tx] [' + tx.id + '] processed')
        })

        // If enabled, update unique recipient balance.
        // Useful to disable when wanting a quick
        // resync from scratch.
        if(process.env.UPDATE_ADDRESSES === 1 || !UPDATE_ADDRESSES) {
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
      }

      // Acknowledge
      await txQueue.ack(msg)
    } catch (err) {
      // Acknowledge the job, to avoid it going back to the queue - read message at start
      // processBlock.ack(msg)
      console.error('[ Tx]' + err.toString())
    }
  }
}
