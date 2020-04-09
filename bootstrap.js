// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

// Setup scheduler
const scheduler = require('node-cron');

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
    const storeBlock = await require('./libs/rabbitmq')('storeBlock')
    const processBlock = await require('./libs/rabbitmq')('processBlock')
    const verifyBlock = await require('./libs/rabbitmq')('verifyBlock')
    const processAddress = await require('./libs/rabbitmq')('processAddress')

    // Setup delayed message support for the `verifyBlock` queue. 
    verifyBlock.assertExchange('delayed', 'x-delayed-message', {
      autoDelete: false,
      durable: true,
      passive: true,
      arguments: { 'x-delayed-type': 'direct' }
    })
  
    // Bind `verifyBlock` queue to 'delayed' exchange via a route named 'block'.
    verifyBlock.bindQueue('verifyBlock', 'delayed', 'block')


    // Schedule a job that will loop on a specified interval set with COLLECTOR_INTERVAL
    // COLLECTOR_INTERVAL is defined in ms so lets convert it to seconds.
    const Collector = scheduler.schedule('*/' + (+process.env.COLLECTOR_INTERVAL / 1000) + ' * * * * *', () =>  {
      require('./scripts/collect')(storeBlock)
    })


    // Are you ready? Produce!
    Collector.start()

    // Yes! Consume!
    require('./workers/block/store')(storeBlock, processBlock)
    require('./workers/block/process')(processBlock, verifyBlock, processAddress)
    require('./workers/block/verify')(verifyBlock, Collector, storeBlock, processBlock, processAddress)
    require('./workers/address/process')(processAddress)

  }
  catch(err) {
    console.error(err.toString())
  }
})()