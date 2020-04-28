// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../libs').knex
const axios = require('axios')
const UUID = require('uuid/v4')

// This is the start of the workflow. The Collector fetches blocks from the
// public chain in increments of 100 and adds each block to the `keyBlock`
// queue for the next workflow.

module.exports = async function (keyBlock) {
  try {
    
    let lastIndex = 0
    let blockIndex = 0
    let blockCount = 0

    // Let's grab the last block announced by the network 
    lastIndex = await axios.get('https://' + process.env.NODE_ADDRESS + '/blocks/height', {
      timeout: +process.env.TIMEOUT
    })

    lastIndex = lastIndex.data.height

    // Retrieve last recorded block in our database
    blockIndex = await db('blocks')
      .select('index')
      .orderBy('index', 'desc')
      .limit(1)

    // Account for a fresh sync with no recorded blocks
    if (blockIndex.length >= 1) {
      blockIndex = blockIndex[0].index
    } else {
      blockIndex = 0
    }

    // Calculate how many blocks we are behind
    const heightDiff = lastIndex - blockIndex

    // Check we are behind, if not abort.
    if (heightDiff < 1) {
      console.log('[Block] [' + lastIndex + '] synced')
      return
    }

    // Calculate # of blocks to scan
    if (heightDiff >= 99) {
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

    // Fetch the next batch of blocks
    const blocks = await axios.get('https://' + process.env.NODE_ADDRESS + '/blocks/seq/' + (blockIndex + 1) + '/' + endIndex, {
      timeout: +process.env.TIMEOUT
    })

    for (let block of blocks.data) {
      
      // Add each block to the `keyBlock` queue where they will be recorded in the database
      await keyBlock.sendToQueue('keyBlock', new Buffer(JSON.stringify(block)), {
        correlationId: UUID(),
      })
    }
  } catch (err) {
    console.error('[Block] ' + err.toString())
  }
}
