// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')

const db = require('../libs').knex;

//
// WARNING
//

// This script is for development purposes only.
// It will NUKE EVERTYTHING
// Drops database and all queues and makes fresh ones

// You have been warning.

(async () => {
    try {
      
        const Blocks = await require('../libs/rabbitmq')('blocks')
        const Transactions = await require('../libs/rabbitmq')('transactions')
        const Verify = await require('../libs/rabbitmq')('verify')
        const Addresses = await require('../libs/rabbitmq')('addresses')

        // Delete Queues
        await Addresses.deleteQueue('addresses')
        await Blocks.deleteQueue('blocks')
        await Transactions.deleteQueue('transactions')
        await Verify.deleteQueue('verify')

        // Drop all tables
        await db.schema.dropTableIfExists('blocks')
        await db.schema.dropTableIfExists('consensus')
        await db.schema.dropTableIfExists('features')
        await db.schema.dropTableIfExists('transactions')
        await db.schema.dropTableIfExists('transfers')
        await db.schema.dropTableIfExists('proofs')
        await db.schema.dropTableIfExists('anchors')
        await db.schema.dropTableIfExists('addresses')

        // Setup queues
        await Addresses.assertQueue('addresses')
        await Blocks.assertQueue('blocks')
        await Transactions.assertQueue('transactions')
        await Verify.assertQueue('verify')

        // Setup database tables
        require('../utils/db/schema');

        console.info('[DB] dropped')
    }
    catch(err) {
      console.error(err.toString())
    }
})()