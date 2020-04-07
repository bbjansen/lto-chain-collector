// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

const amqp = require('amqplib')

const connect = (url = 'amqp://' + process.env.RABBITMQ_USER + ':' + process.env.RABBITMQ_PASS + '@' + process.env.RABBITMQ_HOST) => {
  return new Promise((resolve, reject) => {
    amqp.connect(url)
      .then(conn => resolve(conn))
      .catch(err => reject(err))
  })
}

const createChannel = conn => {
  return new Promise((resolve, reject) => {
    conn.createChannel()
      .then(channel => resolve(channel))
      .catch(err => reject(err))
  })
}

const assertQueue = (channel, queueName) => {
  return new Promise((resolve, reject) => {
    channel.assertQueue(queueName, { durable: true })
      .then(asserted => resolve(channel))
      .catch(err => reject(err))
  })
}

const assertExchange = (channel, exchangeName, exchangeType, args) => {
  return new Promise((resolve, reject) => {
    channel.assertExchange(exchangeName, exchangeType, { args })
      .then(asserted => resolve(channel))
      .catch(err => reject(err))
  })
}

const bindQueue = (channel, queueName, exchangeName, routingKey) => {
  return new Promise((resolve, reject) => {
    channel.bindQueue(queueName, exchangeName, routingKey)
      .then(binded => resolve(channel))
      .catch(err => reject(err))
  })
}

const deleteQueue = (channel, queueName) => {
  return new Promise((resolve, reject) => {
    channel.deleteQueue(queueName)
      .then(binded => resolve(channel))
      .catch(err => reject(err))
  })
}


const purgeQueue = (channel, queueName) => {
  return new Promise((resolve, reject) => {
    channel.purgeQueue(queueName)
      .then(binded => resolve(channel))
      .catch(err => reject(err))
  })
}


const sendToQueue = (channel, queueName, buffer) => {
  return new Promise((resolve, reject) => {
    channel.sendToQueue(queueName, buffer)
      .then(binded => resolve(channel))
      .catch(err => reject(err))
  })
}


const publish = (channel, exchangeName, routingKey, buffer) => {
  return new Promise((resolve, reject) => {
    channel.publish(exchangeName, routingKey, buffer)
      .then(binded => resolve(channel))
      .catch(err => reject(err))
  })
}


const connection = async (queueName = 'msg.*') => {
  var conn = await connect()
  var channel = await createChannel(conn)
  var assertedChannelToQueue = await assertQueue(channel, queueName)
  return channel
}

module.exports = connection
