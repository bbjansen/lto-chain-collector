// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../utils/utils').knex
const axios = require('axios')
const UUID = require('uuid/v4')

// Collect new blocks and sends them to the queue for internal processing.

module.exports = function (blockQueue, verifyQueue, txQueue, addressQueue) {

  setInterval(function () {
    collectBlocks()
  }, process.env.COLLECT_BLOCKS)

  async function collectBlocks () {

    try {
      
      let lastIndex = 0
      let blockIndex = 0
      let blockCount = 0

      // Grab the network height and last collected block index
      lastIndex = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/blocks/height', {
        timeout: +process.env.TIMEOUT
      })

      blockIndex = await db('blocks')
        .select('index')
        .orderBy('index', 'desc')
        .limit(1)

      // Format
      lastIndex = lastIndex.data.height

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

      // Get Blocks
      const blocks = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/blocks/seq/' + (blockIndex + 1) + '/' + endIndex, {
        timeout: +process.env.TIMEOUT
      })

      // Process blocks
      for (let block of blocks.data) {
        
        // Add each block to the queue for processing
        blockQueue.sendToQueue('blockQueue', new Buffer(JSON.stringify(block)), {
          correlationId: UUID(),
        })

        // If enabled, add each block to a confirm 
        // queue for processing with a delay of 90 min.
        // Enabled by default, disable for quicker sync
        // from scratch. Requires rabbitMQ delay message
        // plugin
        
        if(+process.env.CONFIRM_BLOCKS) {
          verifyQueue.publish('delayed', 'block', new Buffer(JSON.stringify(block)), {
            correlationId: UUID(),
            headers: { 'x-delay': +process.env.DELAY_BLOCKS }
          })
        }

        // Add each block to the tx queue for processing
        txQueue.sendToQueue('txQueue', new Buffer(JSON.stringify(block)), {
          correlationId: UUID()
        })

        // If enabled, skip updating block generator balance.
        // Useful to disable when wanting a quick
        // resync from scratch.
        if(+process.env.UPDATE_ADDRESSES) {
          addressQueue.sendToQueue('addressQueue', new Buffer(JSON.stringify(block.generator)), {
            correlationId: UUID(),
          })
        }
      }
    } catch (err) {
      console.log('[Block] ' + err.toString())
    }
  }
}
