// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const axios = require('axios')

setInterval(function() { 
  collectAddress()
}, process.env.INTERVAL_COLLECT_ADDRESS)

// Takes all recipient and sender addresses in recorded transactions
// and stores them in the addresses table so we can track it in
// scanAddress.js 

async function collectAddress() {
  try {

    // Get all recorded recipients
    const recipient = await db('transactions')
    .select('recipient as address')
    .limit(process.env.BATCH_COLLECT_ADDRESS)
    .whereNotIn(['recipient'], db.select('address').from('addresses'))

    
    // Get all recorded sender
    const sender = await db('transactions')
    .select('sender as address')
    .limit(process.env.BATCH_COLLECT_ADDRESS)
    .whereNotIn(['sender'], db.select('address').from('addresses'))

    const addresses = recipient.concat(sender)

    addresses.map(async (v) => {

      // Timeout
      setTimeout(async () => {

        // Check
        const getAddress = await db('addresses')
        .count('* as count')
        .where('address', v.address)

        if(getAddress[0].length === 0 ) {
          // Get balancess
          const balances = await axios.get('https://' + process.env.NODE_IP + '/addresses/balance/details/' + v.address)

          // Store
          await db('addresses').insert({
            address: v.address,
            regular: balances.data.regular / process.env.ATOMIC,
            generating: balances.data.generating / process.env.ATOMIC,
            available: balances.data.available / process.env.ATOMIC,
            effective: balances.data.effective / process.env.ATOMIC,
          })

          console.log('[Address] [' + v.address + '] collected')
        }
      }, process.env.TIMEOUT)
    })
  }
  catch(err) {
  }
}