// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

const db = require('../../libs').knex

// Create 'blocks' table if it does not exist
db.schema.hasTable('blocks').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `blocks` created')

    return db.schema.createTable('blocks', function (table) {
      table.integer('index').primary().notNullable()
      table.string('reference').nullable()
      table.string('generator').nullable()
      table.string('signature').nullable()
      table.integer('size').nullable()
      table.integer('count').nullable()
      table.decimal('fee', [15, 9]).nullable(0)
      table.integer('version').nullable()
      table.bigInteger('timestamp').nullable()
      table.boolean('verified').defaultTo(false)
    })
  }
})

// Create 'consensus' table if it does not exist
db.schema.hasTable('consensus').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `consensus` created')

    return db.schema.createTable('consensus', function (table) {
      table.integer('index').primary().notNullable()
      table.integer('target').notNullable()
      table.string('signature').notNullable()
    })
  }
})

// Create 'features' table if it does not exist
db.schema.hasTable('features').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `features` created')

    return db.schema.createTable('features', function (table) {
      table.integer('index').primary().notNullable()
      table.json('features').notNullable()
    })
  }
})

// Create 'transactions' table if it does not exist
db.schema.hasTable('transactions').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `transactions` created')

    return db.schema.createTable('transactions', function (table) {
      table.string('id').primary().notNullable()
      table.integer('type').notNullable()
      table.integer('block').notNullable()
      table.string('recipient')
      table.string('sender')
      table.string('senderPublicKey')
      table.decimal('amount', [15, 9]).defaultTo(0)
      table.decimal('fee', [15, 9]).defaultTo(0)
      table.string('signature')
      table.string('attachment')
      table.bigInteger('timestamp').notNullable()
      table.integer('version')
      table.string('leaseId')
      table.boolean('verified').defaultTo(false)
    })
  }
})

// Create 'transfers' table if it does not exist
db.schema.hasTable('transfers').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `transfers` created')

    return db.schema.createTable('transfers', function (table) {
      table.increments('id').primary()
      table.string('tid').notNullable()
      table.string('recipient').notNullable()
      table.decimal('amount', [15, 9]).defaultTo(0)
    })
  }
})

// Create 'proofs' table if it does not exist
db.schema.hasTable('proofs').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `proofs` created')

    return db.schema.createTable('proofs', function (table) {
      table.string('tid').primary().notNullable()
      table.json('proofs').notNullable()
    })
  }
})

// Create 'anchors' table if it does not exist
db.schema.hasTable('anchors').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `anchors` created')

    return db.schema.createTable('anchors', function (table) {
      table.string('tid').primary().notNullable()
      table.json('anchors').notNullable()
    })
  }
})

// Create 'addresses' table if it does not exist
db.schema.hasTable('addresses').then(function (exists) {
  if (!exists) {
    console.info('[DB] Table `addresses` created')

    return db.schema.createTable('addresses', function (table) {
      table.string('address').primary().notNullable()
      table.string('label')
      table.string('url')
      table.decimal('regular', [15, 9]).defaultTo(0)
      table.decimal('generating', [15, 9]).defaultTo(0)
      table.decimal('available', [15, 9]).defaultTo(0)
      table.decimal('effective', [15, 9]).defaultTo(0)
      table.bigInteger('timestamp').notNullable()
    })
  }
})
