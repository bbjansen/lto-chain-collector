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
      
        const keyBlock = await require('../libs/rabbitmq')('keyBlock')
        const microBlock = await require('../libs/rabbitmq')('microBlock')
        const verifyBlock = await require('../libs/rabbitmq')('verifyBlock')
        const processAddress = await require('../libs/rabbitmq')('processAddress')

        // Delete Queues
        await keyBlock.deleteQueue('keyBlock')
        await microBlock.deleteQueue('microBlock')
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
        await keyBlock.assertQueue('keyBlock')
        await microBlock.assertQueue('microBlock')
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