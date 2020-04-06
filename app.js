// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const rabbitMQ = require('./utils/rabbitmq')

// Setup logger
require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
      stamp: 'green',
      label: 'white',
  }
})

// Setup DB if not exist
require('./utils/db/schema')

// Initialize Workers
init()

async function init () {
  
  // Create Queues
  const blockQueue = await rabbitMQ('blockQueue')
  const txQueue = await rabbitMQ('txQueue')
  const verifyQueue = await rabbitMQ('verifyQueue')
  const addressQueue = await rabbitMQ('addressQueue')

  // Create delayed message exchange
  verifyQueue.assertExchange('delayed', 'x-delayed-message', {
    autoDelete: false,
    durable: true,
    passive: true,
    arguments: { 'x-delayed-type': 'direct' }
  })

  // Bind queues with delayed message exchange
  verifyQueue.bindQueue('verifyQueue', 'delayed', 'block')


  // Load scripts 
  const rewindChain = require('./scripts/rewindChain')

  // Load producers and workers
  require('./workers/collectBlock')(blockQueue, verifyQueue, txQueue, addressQueue)
  require('./workers/processBlock')(blockQueue)
  require('./workers/processTx')(txQueue, addressQueue)
  require('./workers/processAddress')(addressQueue)
  require('./workers/verifyBlock')(verifyQueue, txQueue, rewindChain)
}
