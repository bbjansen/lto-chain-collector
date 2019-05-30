// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../../utils/utils').knex
const axios = require('axios')
const UUID = require('uuid/v4')

// Collect newly produced blocks and sends them to the queue for internal processing.
// Connects to a LTO node API

module.exports = function (blockQueue) {

    setInterval(function() { 
        collectBlocks()

    }, process.env.COLLECT_BLOCKS)

    async function collectBlocks() {
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
                blockIndex = blockIndex[0].index
            } else {
                blockIndex = 0
            }

            //Calculate how many blocks we are behind
            const heightDiff = lastIndex - blockIndex

            // Check we are behind, if not halt!
            if(blockIndex >= lastIndex || heightDiff === 0) {
                throw('[Block] reached top')
            }

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
            const blocks = await axios.get('https://' + process.env.NODE_IP + '/blocks/seq/' + (blockIndex + 1) + '/' + endIndex)
            
            // Process blocks
            blocks.data.map(async (block) => {
                // Add each block to the queue for processing
                blockQueue.sendToQueue('blockQueue', new Buffer(JSON.stringify(block)), {
                    correlationId: UUID()
                })
            })
        }
        catch(err) {
            console.log(err)
        }
    }
}