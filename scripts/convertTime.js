// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')
const db = require('../utils/utils').knex
const moment = require('moment')

setInterval(function() { 
    convertTime()
  }, 3000)
  
async function convertTime() {
    try {

        const blocks = await db('blocks')
        .select('index', 'timestamp')
        .whereNull('datetime')
        .limit(1000)

        blocks.map(async (b) => {

            const convert = moment(b.timestamp).format('YYYY-MM-DD HH:mm:ss')

            await db('blocks')
            .update({
                datetime: convert
            })
            .where('index', b.index)

            console.log('[Block] [' + b.index + '] converted')
        })

        const transactions = await db('transactions')
        .select('id', 'timestamp')
        .whereNull('datetime')
        .limit(1000)

        transactions.map(async (t) => {

            const convert = moment(t.timestamp).format('YYYY-MM-DD HH:mm:ss')

            await db('transactions')
            .update({
                datetime: convert
            })
            .where('id', t.id)

            console.log('[Tx] [' + t.id + '] converted')
        })

    }
    catch(err) {
        console.log(err)
    }
}
