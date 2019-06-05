// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const axios = require('axios')
const moment = require('moment')
const UUID = require('uuid/v4')

// Consumes the address queue to check and update balances
module.exports = function (addressQueue) {
  addressQueue.consume('addressQueue', updateAddress)

  async function updateAddress (msg) {
    try {
      const secs = msg.content.toString().split('.').length - 1
      const address = JSON.parse(msg.content.toString())

      // Get Balance
      const balances = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/addresses/balance/details/' + address, {
        timeout: process.env.TIMEOUT
      })

      // Update address
      await db('addresses').update({
        regular: balances.data.regular / 100000000,
        generating: balances.data.generating / 100000000,
        available: balances.data.available / 100000000,
        effective: balances.data.effective / 100000000,
        updated: moment().format('YYYY-MM-DD HH:mm:ss')
      })
        .where('address', address)

      // Send back to queue
      addressQueue.publish('delayed', 'address', new Buffer(JSON.stringify(address)), {
        correlationId: UUID(),
        headers: { 'x-delay': 1000 * 60 * 10 }
      })

      // Ack
      addressQueue.ack(msg)

      console.log('[Address] [' + address + '] updated' + ' (' + secs + ')')
    } catch (err) {
      console.error(err)
    }
  }
}
