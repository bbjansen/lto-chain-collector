// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')
const db = require('../utils/utils').knex

purgeBlocks(process.argv[2])

async function purgeBlocks(start) {
    try {

        const blocks = await db('blocks')
        .select('index')
        .where('index', '>=', start)

        blocks.map(async (b) => {

            await db('blocks')
            .where('index', b.index)
            .del()

            await db('consensus')
            .where('index', b.index)
            .del()

            await db('features')
            .where('index', b.index)
            .del()

            const txns = await db('transactions')
            .select('id')
            .where('block', b.index)

            txns.map(async (t) => {
                await db('proofs')
                .where('tid', t.id)
                .del()
    
                await db('anchors')
                .where('tid', t.id)
                .del()
    
                await db('transfers')
                .where('tid', t.id)
                .del()
            })

            await db('transactions')
            .where('block', b.index)
            .del()

        })

        console.log('[Purged] Block ' + start + ' - ' + (start + blocks.length))

    }
    catch(err) {
        console.log(err)
    }
}
