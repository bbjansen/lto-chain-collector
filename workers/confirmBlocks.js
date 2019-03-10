// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../utils/utils').knex
const axios = require('axios')
const moment = require('moment')

setInterval(function() { 
  confirmBlocks()
}, process.env.INTERVAL_CONFIRM_BLOCKS)

// Takes all unconfirmed blocks from the DB and checks if 90 minutes has
// passed (lto network orphan interval). If 90 mintes has passed, it looks
// the block up against the node to see if it still exists with the same
// data. If it does, it means it must be valid.


async function confirmBlocks() {
  try {

    const blocks = await db('blocks')
    .select('index', 'signature', 'timestamp')
    .where('confirmed', false)
    .limit(100)

    blocks.map(async (block) => {

      let duration = moment.duration(moment().diff(moment(block.timestamp))).asMinutes()

      if(duration >= 90) {
        axios.get('https://' + process.env.NODE_IP + '/blocks/at/' + block.index)
        .then(b => {
          // Validate signature
          if(b.data.signature === block.signature) {
            return db('blocks').update({
              confirmed: true
            })
            .where('index', block.index)
            .then(d => {
              console.log('[Block] [' + block.index + '] confirmed')
            })
          }
        })
        .catch(err => {
          console.log('[Block] [' + block.index + '] orphaned')
        })
      }
    })
  }
  catch(err) {
    console.log(err)
  }
}