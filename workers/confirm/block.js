// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const axios = require('axios')

// Processes unconfirmed blocks added in the queue when they got processed.
// Confirms the block against the node to see if it exists and valid.

module.exports = function (confirmQueue) {
  confirmQueue.consume('confirmQueue', confirmBlock)

  async function confirmBlock (msg) {
    try {
      const secs = msg.content.toString().split('.').length - 1
      const block = JSON.parse(msg.content.toString())
      
      // Get block data
      const check = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/blocks/at/' + block.height, {
        timeout: process.env.TIMEOUT
      })

      // Validate signature
      if (check.data.signature === block.signature) {

        // Update block
        await db('blocks').update({
          confirmed: true
        })
        .where('index', block.height)

        // Update tx belonging to block
        await db('transactions').update({
          confirmed: true
        })
        .where('block', block.height)

        console.log('[Block] [' + block.height + '] confirmed' + ' (' + secs + ')')
      }

      // Acknowledge
      confirmQueue.ack(msg)
    } catch (err) {
      console.log(err)
    }
  }
}
