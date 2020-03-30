// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../utils/utils').knex
const axios = require('axios')
const moment = require('moment')

// Consumes the address queue to check and update balances
module.exports = function (addressQueue) {
  addressQueue.consume('addressQueue', updateAddress)

  async function updateAddress (msg) {
    try {
      const address = JSON.parse(msg.content.toString())

      // Get Balance
      const balances = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/addresses/balance/details/' + address, {
        timeout: process.env.TIMEOUT
      })

      // Check if address exist
      const checkAddress = await db('addresses')
        .count('* as count')
        .where('address', address)

      if (checkAddress[0].count === 0) {

        // insert
        await db('addresses').insert({
          address: address,
          regular: balances.data.regular / 100000000,
          generating: balances.data.generating / 100000000,
          available: balances.data.available / 100000000,
          effective: balances.data.effective / 100000000
        })
      }  
      else {
        // update
        await db('addresses').update({
          regular: balances.data.regular / 100000000,
          generating: balances.data.generating / 100000000,
          available: balances.data.available / 100000000,
          effective: balances.data.effective / 100000000,
          updated: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .where('address', address)
      }

      // Ack
      addressQueue.ack(msg)

      console.log('[Address] [' + address + '] processed')
    } catch (err) {
      console.error('[Address] ' + err.toString())
    }
  }
}
