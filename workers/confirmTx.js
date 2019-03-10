// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../utils/utils').knex
const axios = require('axios')


setInterval(function() { 
  confirmTx()
}, process.env.INTERVAL_CONFIRM_TX)


// Takes all unconfirmed transactions from the DB and looks them up
// against the node to see if they exist. If they exist, it then checks
// if the transaction exists in the mempool. If it does not, it means
// it must be valid.

async function confirmTx() {
  try {

    // Grab all unconfirmed transactions from confirmed blocks
    const transactions = await db('transactions')
    .leftJoin('blocks', 'transactions.block', 'blocks.index')
    .select('transactions.id')
    //.where('blocks.confirmed', true)
    .where('transactions.confirmed', false)
    .limit(100)

    transactions.map(async (tx) => {

      // Check if transaction exist
      axios.get('https://' + process.env.NODE_IP + '/transactions/info/' + tx.id)
      .then(d => {
 
        // check if tx is confirmed
        return axios.get('https://' + process.env.NODE_IP + '/transactions/unconfirmed/info/' + tx.id)
 
      })
      .catch(err => {        
        // If this error, confirm tx - we can ignore the other error
        // sidenote: please introduce error codes lto devs
        if(err.response.data.details === 'Transaction is not in UTX') {

          db('transactions').update({
            confirmed: true
          })
          .where('id', tx.id)
          .then(d => {
            console.log('[Tx] [' + tx.id + '] confirmed')
          })
        } else {
          console.log('[Tx] [' + tx.id + '] orphaned')
        }
      })
    })
  }
  catch(err) {
    console.log(err)
  }
}