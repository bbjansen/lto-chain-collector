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
  },
  extend: {
    debug: 5,
    fatal: 0,
  },
  include: ['debug', 'log', 'info', 'warn', 'error', 'fatal'],
  level: 'debug',
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
  const peerQueue = await rabbitMQ('peerQueue')

  // Create delayed message exchange
  addressQueue.assertExchange('delayed', 'x-delayed-message', {
    autoDelete: false,
    durable: true,
    passive: true,
    arguments: { 'x-delayed-type': 'direct' }
  })

  // Bind queues with delayed message exchange
  confirmQueue.bindQueue('confirmQueue', 'delayed', 'block')
  addressQueue.bindQueue('addressQueue', 'delayed', 'address')

  // Load producers and workers
  require('./workers/collect/block')(blockQueue, confirmQueue)
  require('./workers/collect/address')(addressQueue)
  require('./workers/collect/peer')(peerQueue)

  require('./workers/process/block')(blockQueue, txQueue)
  require('./workers/process/tx')(txQueue)
  require('./workers/process/peer')(peerQueue)

  require('./workers/confirm/block')(confirmQueue)
  require('./workers/confirm/address')(addressQueue)
}
