// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const rabbitMQ = require('./utils/rabbitmq')

// Setup DB if not exist
require('./utils/db/schema')

// Initialize Workers
init()

// rabbitMQ workers
async function init () {
  const blockQueue = await rabbitMQ('blockQueue')
  const peerQueue = await rabbitMQ('peerQueue')
  const txQueue = await rabbitMQ('txQueue')
  const confirmQueue = await rabbitMQ('confirmQueue')

  require('./workers/collect/block')(blockQueue, confirmQueue)
  //require('./workers/collect/address')()
  require('./workers/collect/peer')(peerQueue)

  require('./workers/process/block')(blockQueue, txQueue)
  require('./workers/process/tx')(txQueue)
  require('./workers/process/peer')(peerQueue)

  require('./workers/confirm/block')(confirmQueue)
}