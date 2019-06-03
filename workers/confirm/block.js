// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const axios = require('axios')

// Takes all unconfirmed blocks from the DB and checks if 90 minutes has
// passed (lto network orphan interval). If 90 mintes has passed, it looks
// the block up against the node to see if it still exists with the same
// data. If it does, it means it must be valid.


module.exports = function (confirmQueue) {
  confirmQueue.consume('confirmQueue', confirmBlock)

    async function confirmBlock (msg) {
      try {
        const secs = msg.content.toString().split('.').length - 1
        const block = JSON.parse(msg.content.toString())
        
        const check = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/blocks/at/' + block.height)

        // Validate signature
        if(check.data.signature === block.signature) {
          await db('blocks').update({
            confirmed: true
          })
          .where('index', block.height)
          
          console.log('[Block] [' + block.height + '] confirmed' + ' (' + secs + ')')
        }

        // Acknowledge
        confirmQueue.ack(msg)
      }
    catch(err) {
      console.log(err)
    }
  }
}