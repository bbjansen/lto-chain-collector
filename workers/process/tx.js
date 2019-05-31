// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../../utils/utils').knex
const moment = require('moment')
const axios = require('axios')

// Consumes all items in tx queue
module.exports = function (txQueue) {

    // Set a 2 minute timer as the block is still being filled.
    setTimeout(function(){ 
        txQueue.consume('txQueue', processTx)

    }, 120000);

    async function processTx (msg) {
        try {
            const secs = msg.content.toString().split('.').length - 1
            const index = JSON.parse(msg.content.toString())
            
            var block = await axios.get('https://' + process.env.NODE_IP + '/blocks/at/' + index)
            block = block.data

             // Store block
             await db('blocks').update({
                count: block.transactionCount,
            })
            .where('index', block.height)

            // Store block transactions 
            if(block.transactionCount >= 1) {
                block.transactions.map(async (tx) => {

                    // Store Tx
                    await db('transactions').insert({
                        id: tx.id,
                        type: tx.type,
                        block: block.height,
                        recipient: tx.recipient,
                        sender: tx.sender,
                        senderPublicKey: tx.senderPublicKey,
                        amount: (tx.amount / process.env.ATOMIC) || (tx.totalAmount / process.env.ATOMIC) || null,
                        fee: tx.fee / process.env.ATOMIC,
                        signature: tx.signature,
                        attachment: tx.attachment,
                        timestamp: tx.timestamp,
                        datetime: moment(tx.timestamp).format('YYYY-MM-DD HH:mm:ss'),
                        version: tx.version,
                        leaseId: tx.leaseId
                    })

                    // Store Tx Proofs
                    if(tx.proofs) {
                        tx.proofs.map(async (proof) => {
                            await db('proofs').insert({
                                tid: tx.id,
                                proof: proof
                            })
                        })
                    }

                    // Store Tx Anchors
                    if(tx.anchors) {
                        tx.anchors.map(async (anchor) => {
                            await db('anchors').insert({
                                tid: tx.id,
                                anchor: anchor
                            })
                        })
                    }

                    // Store Tx Transfers
                    if(tx.transfers) {
                        tx.transfers.map(async (transfer) => {
                            await db('transfers').insert({
                                tid: tx.id,
                                recipient: transfer.recipient,
                                amount: (transfer.amount / process.env.ATOMIC) || null
                            })
                        })    
                    }

                    console.log('[Tx] [' + tx.id + '] processed' + ' (' + secs + ')')
                })    
            }
            
            // Acknowledge
            txQueue.ack(msg)

        }
        catch (err) {
            // Acknowledge the job, to avoid it going back to the queue - read message at start
            // processBlock.ack(msg)
            console.log(err)
            console.log('[Process Tx] Error: ' + err.toString())
        }
    }
}