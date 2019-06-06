// Copyright (c) 2018-2019, BB Jansen
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
  const confirmQueue = await rabbitMQ('confirmQueue')
  const addressQueue = await rabbitMQ('addressQueue')

  // Create delayed message exchange
  confirmQueue.assertExchange('delayed', 'x-delayed-message', {
    autoDelete: false,
    durable: true,
    passive: true,
    arguments: { 'x-delayed-type': 'direct' }
  })

  // Bind queues with delayed message exchange
  confirmQueue.bindQueue('confirmQueue', 'delayed', 'block')

  // Load producers and workers
  require('./workers/collectBlock')(blockQueue, confirmQueue, txQueue, addressQueue)
  require('./workers/processBlock')(blockQueue)
  require('./workers/processTx')(txQueue, addressQueue)
  require('./workers/updateAddress')(addressQueue)
  require('./workers/verifyBlock')(confirmQueue)
}
