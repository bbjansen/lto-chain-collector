// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const cron = require('node-cron')

// Takes all recipient and sender addresses in recorded transactions
// and stores them in the addresses table so we can track it
module.exports = function () {

  // Collect address every hour 
  cron.schedule('0 * * * *', () => {
    collectAddress()
  })

  async function collectAddress() {
    try {

      // Get all recorded recipients that are not present in the address table
      const recipient = await db('transactions')
      .select('recipient as address')
      .whereNotIn(['recipient'], db.select('address').from('addresses'))
      .whereNotNull('recipient')
      .groupBy('recipient')
      
      // Get all recorded sender that are not present in the address table
      const sender = await db('transactions')
      .select('sender as address')
      .whereNotIn(['sender'], db.select('address').from('addresses'))
      .whereNotNull('sender')
      .groupBy('recipient')

      // Symmetric difference
      const addresses = recipient
      .filter(x => !sender.includes(x))
      .concat(sender.filter(x => !recipient.includes(x)));

      // Store
      addresses.map(async (v) => {
        await db('addresses').insert({
          address: v.address
        })

        console.log('[Address] [' + v.address + '] collected')
      })
    }
    catch(err) {
      console.log('[Address]: ' + err.toString())
    }
  }
}