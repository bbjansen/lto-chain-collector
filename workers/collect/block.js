// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../../utils/utils').knex
const axios = require('axios')
const UUID = require('uuid/v4')

// Collect newly produced blocks and sends them to the queue for internal processing.
// Connects to a LTO node API

module.exports = function (blockQueue, confirmQueue, addressQueue) {
  setInterval(function () {
    collectBlocks()
  }, process.env.COLLECT_BLOCKS)

  async function collectBlocks () {
    try {
      let lastIndex = 0
      let blockIndex = 0
      let blockCount = 0

      // Grab the network height and last collected block index
      lastIndex = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/blocks/height', {
        timeout: process.env.TIMEOUT
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

      // Check we are behind (n-1), if not halt.
      // Reason for n-1 is because when a newly produced block
      // is announced to the network, it may not contain all
      // final transacstions yet. For now ignore the latest block
      // In future it would be nice to report the latest block,
      // and update its tx count when processing n + 1 block.

      if (blockIndex >= lastIndex || heightDiff <= 1) {
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
      const blocks = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/blocks/seq/' + (blockIndex + 1) + '/' + endIndex, {
        timeout: process.env.TIMEOUT
      })

      // Process blocks
      blocks.data.forEach(block => {
        // Add each block to the queue for processing
        blockQueue.sendToQueue('blockQueue', new Buffer(JSON.stringify(block)), {
          correlationId: UUID(),
        })

        // Add each block to the confirm queue for processing with a delay of 90 min
        // requires rabbitMQ delay message plugin
        confirmQueue.publish('delayed', 'address', new Buffer(JSON.stringify(block)), {
          correlationId: UUID(),
          headers: { 'x-delay': 1000 * 60 * 10 }
        })

        // Update block generator balance
        addressQueue.sendToQueue('addressQueue', new Buffer(JSON.stringify(block.generator)), {
          correlationId: UUID(),
        })
      })
    } catch (err) {
      console.log('[Block] ' + err.toString())
    }
  }
}
