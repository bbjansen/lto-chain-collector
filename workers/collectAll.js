// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../utils/utils').knex
const moment = require('moment')
const axios = require('axios')


setInterval(function() { 
    collectAll()
}, process.env.INTERVAL_COLLECT_ALL)


// Grabs the current node height and checks if we are behind.
// If so, take the latest blocks, store them, including all
// its meta data including anchors, features, leases, addresses,
// transfers, proofs and concensus data.


async function collectAll() {
  try {
    let lastIndex = 0
    let blockIndex = 0
    let blockCount = 0

    // Grab the network height and last collected block index
    lastIndex = await axios.get('https://' + process.env.NODE_IP + '/blocks/height')

    blockIndex = await db('blocks')
    .select('index')
    .orderBy('index', 'desc')
    .limit(1)

    // Format
    lastIndex = lastIndex.data.height

    if(blockIndex.length >= 1) {
        blockIndex = blockIndex[0].index + 1
    } else {
        blockIndex = 1
    }

    // Check we are behind, if not halt!
    if(blockIndex >= lastIndex) {
        throw('[Block] reached top')
    }

    //Calculate how many blocks we are behind
    const heightDiff = lastIndex - blockIndex

    // Calculate # of blocks to scan
    if(heightDiff >= 99) {
        blockCount = 99
      } else if (heightDiff > 50) {
        blockCount = 50
      } else if (heightDiff > 30) {
        blockCount = 30
      } else if (heightDiff > 10) {
        blockCount = 10
      } else if (heightDiff > 5) {
        blockCount = 5
      } else {
        blockCount = 1
      }

    // Adjust for overspill 
    if ((blockIndex + blockCount) > lastIndex) {
        blockCount = (lastIndex - blockIndex - 1)
    }

    // Calculate end range
    const endIndex = (blockIndex + blockCount)

    // Get Blocks
    const blocks = await axios.get('https://' + process.env.NODE_IP + '/blocks/seq/' + blockIndex + '/' + endIndex)

    // Process blocks
    blocks.data.map(async (block) => {

        // Store block
        await db('blocks').insert({
            index: block.height,
            reference: block.reference,
            generator: block.generator,
            signature: block.signature,
            size: block.blocksize || 0,
            count: block.transactionCount || 0,
            fee: block.fee / process.env.ATOMIC || 0,
            version: block.version || 0,
            timestamp: block.timestamp,
            datetime: moment(block.timestamp).format('YYYY-MM-DD HH:mm:ss')
        })

        // Store block consensus
        await db('consensus').insert({
            index: block.height,
            target: block['nxt-consensus']['base-target'],
            signature: block['nxt-consensus']['generation-signature']
        }) 
        

        // Store block feature
        if(block.features) {
            block.features.map(async (feature) => {
                await db('features').insert({
                    index: block.height,
                    feature: feature
                })
            })
        }

        console.log('[Block] [' + block.height + '] collected')


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
                    amount: (tx.amount / process.env.ATOMIC) || null,
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
            })    
        }
    })
  }
  catch(err) {
    console.log(err)
  }
}