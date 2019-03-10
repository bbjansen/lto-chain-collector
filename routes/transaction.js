// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex

// Get transactions by block index
router.get('/block/:index', async function(req, res, next) {
  try {
  
      const getTx = await db('transactions')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .where('block', req.params.index)

      res.status(200).json(getTx)
  
  } catch (err) {
    res.status(400).json(null)
  }
})


// Get by sender stats (all time)
router.get('/sender/all', async function(req, res, next) {
  try {
  
    const getAddresses = await db('transactions')
    .leftJoin('addresses', 'transactions.sender', 'addresses.address')
    .select('addresses.address')
    .count('transactions.id as transactions')
    .where('transactions.confirmed', true)
    .groupBy('addresses.address')
    .orderBy('transactions', 'desc')


    let total = getAddresses.reduce((transactions, address, index, getAddresses) => {
      return transactions += address.transactions
    }, 0)

    getAddresses.forEach(address => {
      address.share = (address.transactions/total).toFixed(5) || 0
    })

      res.status(200).json(getAddresses)
  
  } catch (err) {
    console.log(err)
    res.status(400).json(null)
  }
})


// Get by recipient stats (all time)
router.get('/recipient/all', async function(req, res, next) {
  try {
  
    const getAddresses = await db('transactions')
    .leftJoin('addresses', 'transactions.recipient', 'addresses.address')
    .select('addresses.address')
    .count('transactions.id as transactions')
    .where('transactions.confirmed', true)
    .whereNotNull('transactions.recipient')
    .groupBy('addresses.address')
    .orderBy('transactions', 'desc')


    let total = getAddresses.reduce((transactions, address, index, addregetAddressessses) => {
      return transactions += address.transactions
    }, 0)

    getAddresses.forEach(address => {
      address.share = (address.transactions/total).toFixed(5) || 0
    })

      res.status(200).json(getAddresses)
  
  } catch (err) {
    console.log(err)
    res.status(400).json(null)
  }
})


// Get transactions by address
router.get('/address/:address', async function(req, res, next) {
  try {
  
      const getSender = await db('transactions')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .where('sender', req.params.address)

      const getRecipient = await db('transactions')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .where('recipient', req.params.address)

      const tx = getSender.concat(getRecipient)

      res.status(200).json(tx)
  
  } catch (err) {
    res.status(400).json(null)
  }
})

// Get unconfirmed transactions
router.get('/unconfirmed', async function(req, res, next) {
  try {
      const getTx = await db('transactions')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .where('confirmed', false)
      .orderBy('datetime', 'desc')

      res.status(200).json(getTx)

  } catch (err) {
    res.status(400).json(null)
  }
})


// Get transaction by id
router.get('/:id', async function(req, res, next) {
  try {

      const getTx = await db('transactions')
      .select(db.raw('*, date_format(datetime,"%Y-%m-%d %h:%i:%s") as datetime'))
      .where('id', req.params.id)

      // Mass Tx
      if(getTx[0].type === 11) {
        const proofs = await db('proofs')
        .select('proof')
        .where('tid', req.params.id)

        getTx.push({proofs: proofs})

        const transfers = await db('transfers')
        .select('recipient', 'amount')
        .where('tid', req.params.id)

        getTx.push({transfers: transfers})
      }

      // Anchor Tx
      if(getTx[0].type === 15) {
        const proofs = await db('proofs')
        .select('proof')
        .where('tid', req.params.id)

        getTx.push({proofs: proofs})

        const anchors = await db('anchors')
        .select('anchor')
        .where('tid', req.params.id)
        
        getTx.push({anchors: anchors})
      }

      // Lease Tx
      if(getTx[0].type === 8) {

        const canceled = await db('transactions')
        .select()
        .where('leaseId', req.params.id)

        if(canceled.length >= 1) {
          getTx[0].status = 'canceled'
        }
      }

      // Cancel Lease Tx
      if(getTx[0].type === 9) {

      }

      res.status(200).json(getTx) 

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})
module.exports = router
