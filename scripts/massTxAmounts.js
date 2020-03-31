// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')
const db = require('../utils/utils').knex

calculateAmounts()

async function calculateAmounts () {
  try {
    // Select Mass Tx and calculate sum
    const txns = await txn('transactions')
      .leftJoin('transfers', 'transactions.id', 'transfers.tid')
      .select('transactions.id')
      .sum('transfers.amount as sum')
      .where('type', 11)
      .groupBy('transactions.id')

    // Update with amount
    for (let t of txns) {
      await txn('transactions')
        .update({
          amount: tx.sum || 0
        })
        .where('id', tx.id)
      console.log('[Tx] [' + tx.id + '] updated with an amount of ' + tx.sum + '.')
    }
  } catch (err) {
    console.error(err)
  }
}
