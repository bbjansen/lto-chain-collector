// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const db = require('../utils').knex

// Create 'blocks' table if it does not exist
db.schema.hasTable('blocks').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('blocks', function (table) {
      table.integer('index').unique().notNullable()
      table.string('reference').notNullable()
      table.string('generator').notNullable()
      table.string('signature').notNullable()
      table.integer('size').notNullable()
      table.integer('count').notNullable()
      table.decimal('fee', [15, 9]).notNullable()
      table.integer('version').notNullable()
      table.bigInteger('timestamp').notNullable()
      table.datetime('datetime')
      table.boolean('confirmed').defaultTo(false)
    })
  }
})


// Create 'consensus' table if it does not exist
db.schema.hasTable('consensus').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('consensus', function (table) {
      table.integer('index').unique().notNullable()
      table.integer('target').notNullable()
      table.string('signature').notNullable()
    })
  }
})


// Create 'features' table if it does not exist
db.schema.hasTable('features').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('features', function (table) {
      table.increments('id').primary()
      table.integer('index').notNullable()
      table.integer('feature').notNullable()
    })
  }
})


// Create 'transactions' table if it does not exist
db.schema.hasTable('transactions').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('transactions', function (table) {
      table.string('id').unique().primary().notNullable()
      table.integer('type').notNullable()
      table.integer('block').notNullable()
      table.string('recipient')
      table.string('sender')
      table.string('senderPublicKey')
      table.decimal('amount', [15, 9])
      table.decimal('fee', [15, 9]).notNullable()
      table.string('signature')
      table.string('attachment')
      table.bigInteger('timestamp').notNullable()
      table.datetime('datetime')
      table.integer('version')
      table.string('leaseId')
      table.boolean('confirmed').defaultTo(false)
    })
  }
})


// Create 'transfers' table if it does not exist
db.schema.hasTable('transfers').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('transfers', function (table) {
      table.increments('id').primary()
      table.string('tid').notNullable()
      table.string('recipient').notNullable()
      table.decimal('amount', [15, 9]).notNullable()
    })
  }
})


// Create 'proofs' table if it does not exist
db.schema.hasTable('proofs').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('proofs', function (table) {
      table.increments('id').primary()
      table.string('tid').notNullable()
      table.string('proof').notNullable()
    })
  }
})


// Create 'anchors' table if it does not exist
db.schema.hasTable('anchors').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('anchors', function (table) {
      table.increments('id').primary().notNullable()
      table.string('tid').notNullable()
      table.string('anchor').notNullable()
    })
  }
})


// Create 'addresses' table if it does not exist
db.schema.hasTable('addresses').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('addresses', function (table) {
      table.string('address').unique().primary().notNullable()
      table.string('label')
      table.string('url')
      table.decimal('regular', [15, 9]).notNullable()
      table.decimal('generating', [15, 9]).notNullable()
      table.decimal('available', [15, 9]).notNullable()
      table.decimal('effective', [15, 9]).notNullable()
      table.datetime('updated').defaultTo(db.fn.now())
    })
  }
})

// Create 'peers' table if it does not exist
db.schema.hasTable('peers').then(function (exists) {
  if (!exists) {
    return db.schema.createTable('peers', function (table) {
      table.string('address').unique().primary()
      table.string('declared').notNullable()
      table.string('peerName').notNullable()
      table.integer('nonce').notNullable()
      table.string('appName').notNullable()
      table.string('version').notNullable()
      table.string('country')
      table.decimal('lat', [10, 8])
      table.decimal('lng', [11, 8])
      table.string('generator')
      table.string('port').defaultTo(false)
      table.string('api').defaultTo(false)
      table.string('uptime').defaultTo('------------------------')
      table.datetime('created').defaultTo(db.fn.now()).notNullable()
      table.datetime('updated').defaultTo(db.fn.now()).notNullable()
    })
  }
})