// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

// Setup scheduler
const cron = require('node-cron');

// Setup logger
require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
      stamp: 'green',
      label: 'white',
  }
})

// Setup database tables
require('./utils/db/schema');

// Initialize 

(async () => {
  try {
    
    // Let's create a bunch of queues shall we?
    const Blocks = await require('./libs/rabbitmq')('blocks')
    const Transactions = await require('./libs/rabbitmq')('transactions')
    const Verifier = await require('./libs/rabbitmq')('verify')
    const Addresses = await require('./libs/rabbitmq')('addresses')

    // Setup delayed message support for the verify queue. 
    Verifier.assertExchange('delayed', 'x-delayed-message', {
      autoDelete: false,
      durable: true,
      passive: true,
      arguments: { 'x-delayed-type': 'direct' }
    })
  
    // Bind 'verify' queue to 'delayed' exchange via a route named 'block'.
    Verifier.bindQueue('verify', 'delayed', 'block')


    // Setup a cron job that will loop on a defined interval. COLLECTOR_INTERVAL
    // is defined in ms and converted to seconds here.

    const Collector = cron.schedule('*/' + (+process.env.COLLECTOR_INTERVAL / 1000) + ' * * * * *', () =>  {
      require('./scripts/collect')(Blocks, Verifier, Transactions, Addresses)
    })


    // Are you ready? Produce!
    Collector.start()

    // Yes! Consume!
    require('./workers/block')(Blocks)
    require('./workers/transaction')(Transactions, Addresses)
    require('./workers/address')(Addresses)
    require('./workers/verify')(Verifier, Collector, Blocks, Transactions, Addresses)

  }
  catch(err) {
    console.error(err.toString())
  }
})()