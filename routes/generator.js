// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.
'use strict'

const express = require('express')
const router = express.Router()
const db = require('../utils/utils').knex
const moment = require('moment')

// Get generators stats (all time)
router.get('/all', async function(req, res, next) {
  try {

      const generators = await db('blocks')
      .leftJoin('addresses', 'blocks.generator', 'addresses.address')
      .select('blocks.generator', 'addresses.effective as pool', 'addresses.label', 'addresses.url')
      .count('blocks.index as blocks')
      .sum('blocks.fee as earnings')
      .where('blocks.confirmed', true)
      .groupBy('blocks.generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +(generator.blocks/total).toFixed(2) || 0
      })

      res.json(generators)

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Get generators stats (day)
router.get('/all/day', async function(req, res, next) {
  try {

      const range = [moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')]

      const generators = await db('blocks')
      .leftJoin('addresses', 'blocks.generator', 'addresses.address')
      .select('blocks.generator', 'addresses.effective as pool', 'addresses.label', 'addresses.url')
      .count('blocks.index as blocks')
      .sum('blocks.fee as earnings')
      .where('blocks.confirmed', true)
      .whereBetween('blocks.datetime', range)
      .groupBy('blocks.generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +((generator.blocks/total) * 100).toFixed(2) || 0
      })

      res.json(generators)
  } catch (err) {
    next(err)
  }
})


// Get generators stats (week)
router.get('/all/week', async function(req, res, next) {
  try {

      const generators = await db('blocks')
      .leftJoin('addresses', 'blocks.generator', 'addresses.address')
      .select('blocks.generator', 'addresses.effective as pool', 'addresses.label', 'addresses.url')
      .count('blocks.index as blocks')
      .sum('blocks.fee as earnings')
      .where('blocks.confirmed', true)
      .whereBetween('blocks.datetime', [moment().subtract(1, 'week').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
      .groupBy('blocks.generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +((generator.blocks/total) * 100).toFixed(2) || 0
      })

      res.json(generators)
  } catch (err) {
    next(err)
  }
})



// Get generators stats (month)
router.get('/all/month', async function(req, res, next) {
  try {

      const generators = await db('blocks')
      .leftJoin('addresses', 'blocks.generator', 'addresses.address')
      .select('blocks.generator', 'addresses.effective as pool', 'addresses.label', 'addresses.url')
      .count('blocks.index as blocks')
      .sum('blocks.fee as earnings')
      .where('blocks.confirmed', true)
      .whereBetween('blocks.datetime', [moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
      .groupBy('blocks.generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +((generator.blocks/total) * 100).toFixed(2) || 0
      })

      res.json(generators)
  } catch (err) {
    next(err)
  }
})


// Get generators stats (month)
router.get('/all/year', async function(req, res, next) {
  try {

      const generators = await db('blocks')
      .leftJoin('addresses', 'blocks.generator', 'addresses.address')
      .select('blocks.generator', 'addresses.effective as pool', 'addresses.label', 'addresses.url')
      .count('blocks.index as blocks')
      .sum('blocks.fee as earnings')
      .where('blocks.confirmed', true)
      .whereBetween('blocks.datetime', [moment().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')])
      .groupBy('blocks.generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +((generator.blocks/total) * 100).toFixed(2) || 0
      })

      res.json(generators)
  } catch (err) {
    next(err)
  }
})

// Get generators (all time)
router.get('/unconfirmed/all', async function(req, res, next) {
  try {

      const generators = await db('blocks')
      .select('generator')
      .count('index as blocks')
      .sum('fee as earnings')
      .where('confirmed', false)
      .groupBy('generator')
      .orderBy('blocks', 'desc')

      let total = generators.reduce((blocks, generator, index, generators) => {
        return blocks += generator.blocks
      }, 0)

      generators.forEach(generator => {
        generator.share = +((generator.blocks/total) * 100).toFixed(2) || 0
      })

      res.json(generators)

  } catch (err) {
    next(err)
  }
})

module.exports = router
