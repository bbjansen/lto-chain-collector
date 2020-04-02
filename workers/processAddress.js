// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const promisify = require('../utils/utils').promisify
const db = require('../utils/utils').knex
const axios = require('axios')
const moment = require('moment')

// Processes all addreses it receives from the producer
// collectBlocks.js - If the address is new, it gets added.
// If the address exists, it gets updated.

module.exports = async function (addressQueue) {
  try {

    // Consume one message at a time for optimum speed,
    // stability and data integrity.

    addressQueue.prefetch(1)
    addressQueue.consume('addressQueue', processAddress)
  }
  catch (err) {

    console.error('[Address]: ' + err.toString())
  }

  async function processAddress (msg) {

    // Parse message content
    const address = JSON.parse(msg.content.toString())

    // Start db transaction
    const txn = await promisify(db.transaction.bind(db))

    try {

      // Get Balance
      const balances = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE_IP + ':' + process.env.NODE_PORT) + '/addresses/balance/details/' + address, {
        timeout: +process.env.TIMEOUT
      })

      // Check if address exist
      const checkAddress = await txn('addresses')
        .count('* as count')
        .where('address', address)

      let message

      if (checkAddress[0].count === 0) {

        // insert
        await txn('addresses').insert({
          address: address,
          regular: balances.data.regular / +process.env.ATOMIC_NUMBER,
          generating: balances.data.generating / +process.env.ATOMIC_NUMBER,
          available: balances.data.available / +process.env.ATOMIC_NUMBER,
          effective: balances.data.effective / +process.env.ATOMIC_NUMBER
        })
      
      
        message = 'collected'
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

        message = 'processed'
      }

      // Commit db transaction
      await txn.commit()

      // Aknowledge message
      await addressQueue.ack(msg)

      console.log('[Address] [' + address + '] ' + message)
    } catch (err) {

      // Rollback db transaction
      await txn.rollback()

      // Send message back to the queue for a retry
      await addressQueue.nack(msg)

      console.error('[Address] [' + address + '] ' + err.toString())
    }
  }
}
