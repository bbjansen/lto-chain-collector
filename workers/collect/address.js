// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const cron = require('node-cron')
const UUID = require('uuid/v4')

// Takes all recipient and sender addresses in recorded transactions
// and stores them in the addresses table so we can track it
module.exports = function (addressQueue) {

  // Collect address every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    collectAddress()
  })

  async function collectAddress () {
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
        .groupBy('sender')

      // Combine and remove duplicates
      let addresses = recipient.concat(sender)
      addresses = [...new Set(addresses)]

      addresses.map(async (v) => {
        // Store address
        await db('addresses').insert({
          address: v.address
        })

        // Send address to queue with a 10 minute delay
        // Requires rabbitMQ delay message plugin
        addressQueue.publish('delayed', 'address', new Buffer(JSON.stringify(v.address)), {
          correlationId: UUID(),
          headers: { 'x-delay': 1000 * 60 * 10 }
        })

        console.log('[Address] [' + v.address + '] collected')
      })
    } catch (err) {
      console.error('[Address]: ' + err.toString())
    }
  }
}
