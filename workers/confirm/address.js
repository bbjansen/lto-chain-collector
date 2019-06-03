// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const axios = require('axios')
const moment = require('moment')

module.exports = function () {

  setInterval(function() { 
    scanAddress()
  }, process.env.INTERVAL_SCAN_ADDRESS)

  // Takes all known addresses from the DB and checks for the latest
  // balance by pinging the node.

  async function scanAddress() {
    try {

      // Grab all addresses that have no been updated in 10 the last
      // 10 minutes

      const addresses = await db('addresses')
      .select('address')
      .whereRaw('updated < NOW() - INTERVAL 10 MINUTE')
      .select()
      .limit(process.env.BATCH_SCAN_ADDRESS)
      
      addresses.map(async (a) => {

        // Timeout
        setTimeout(async () => {
          // Get address current balance
          const balances = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/addresses/balance/details/' + a.address)

          await db('addresses').update({
            regular: balances.data.regular / 100000000,
            generating: balances.data.generating / 100000000,
            available: balances.data.available / 100000000,
            effective: balances.data.effective / 100000000,
            updated: moment().format('YYYY-MM-DD HH:mm:ss')
          })
          .where('address', a.address)

          console.log('[Address] [' + a.address + '] updated') 
        }, process.env.TIMEOUT)
      })
    }
    catch(err) {
      console.log(err)
    }
  }
}