// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const axios = require('axios')
const moment = require('moment')

// Consumes the address queue to check and update balances
module.exports = function (addressQueue) {

  addressQueue.consume('addressQueue', updateAddress)

  async function updateAddress (msg) {

    // Handles db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {
      const address = JSON.parse(msg.content.toString())

      // Get Balance
      const balances = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/addresses/balance/details/' + address, {
        timeout: +process.env.TIMEOUT
      })

      // Check if address exist
      const checkAddress = await txn('addresses')
        .count('* as count')
        .where('address', address)

      if (checkAddress[0].count === 0) {

        // insert
        await txn('addresses').insert({
          address: address,
          regular: balances.data.regular / +process.env.ATOMIC_NUMBER,
          generating: balances.data.generating / +process.env.ATOMIC_NUMBER,
          available: balances.data.available / +process.env.ATOMIC_NUMBER,
          effective: balances.data.effective / +process.env.ATOMIC_NUMBER
        })
      }  
      else {
        // update
        await txn('addresses').update({
          regular: balances.data.regular / +process.env.ATOMIC_NUMBER,
          generating: balances.data.generating / +process.env.ATOMIC_NUMBER,
          available: balances.data.available / +process.env.ATOMIC_NUMBER,
          effective: balances.data.effective / +process.env.ATOMIC_NUMBER,
          updated: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .where('address', address)
      }

      // Commit transaction and acknowledge message
      await txn.commit()
      await addressQueue.ack(msg)

    } catch (err) {
      // roll back transaction and drop from queue on failure
      await txn.rollback()
      await addressQueue.reject(msg)
      console.error('[Address] ' + err.toString())
    }
  }
}
