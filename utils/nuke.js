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
      
        const storeBlock = await require('../libs/rabbitmq')('storeBlock')
        const processBlock = await require('../libs/rabbitmq')('processBlock')
        const verifyBlock = await require('../libs/rabbitmq')('verifyBlock')
        const processAddress = await require('../libs/rabbitmq')('processAddress')

        // Delete Queues
        await storeBlock.deleteQueue('storeBlock')
        await processBlock.deleteQueue('processBlock')
        await verifyBlock.deleteQueue('verifyBlock')
        await processAddress.deleteQueue('processAddress')

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
        await storeBlock.assertQueue('storeBlock')
        await processBlock.assertQueue('processBlock')
        await verifyBlock.assertQueue('verifyBlock')
        await processAddress.assertQueue('processAddress')

        // Setup database tables
        require('../utils/db/schema');

        console.info('[DB] dropped')
    }
    catch(err) {
      console.error(err.toString())
    }
})()