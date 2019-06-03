// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'

const db = require('../../utils/utils').knex
const axios = require('axios')
const geoip = require('geoip-lite')
const moment = require('moment')
const portscanner = require('portscanner')

// Consumes all items in peer queue
module.exports = function (peerQueue) {
  peerQueue.consume('peerQueue', processPeer)

  async function processPeer (msg) {
      try {
          const secs = msg.content.toString().split('.').length - 1
          const peer = JSON.parse(msg.content.toString())

          // Format address
          const addressArray = peer.address.split('/').pop().split(':')
          const ip = addressArray[0]
          const p2pPort = addressArray[1]
          const apiPort = +addressArray[1] + 1
          const p2pAddress = ip + ':' + p2pPort
          const apiAddress = ip + ':' + apiPort
      
          // Look up if peer has been detected before
          const getPeer = await db('peers')
          .count('* as count')
          .where('address', p2pAddress)
          .limit(1)

          // New peer
          if(getPeer[0].count === 0) {

            // Insert peer
            await db('peers').insert({
              address: p2pAddress,
              declared: peer.declaredAddress,
              peerName: peer.peerName,
              nonce: peer.peerNonce,
              appName: peer.applicationName,
              version: peer.applicationVersion
            }) 

            // Log Geo
            const geo = geoip.lookup(ip)

            if(geo && geo.length >= 1) {
              return db('peers').update({
                api: false,
                country: geo.country || null,
                lat: geo.ll[0] || null,
                lng: geo.ll[1] || null,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            }         

            // Scan port and log uptime
            portscanner.checkPortStatus(p2pPort, ip)
            .then(port => {

              // Log Port + uptime
              return db('peers').update({
                port: port === 'open' ? port = true : port = false,
                uptime: db.raw('CONCAT(?, CONCAT(LEFT(uptime, CHAR_LENGTH(uptime) -1), ""))', ["|"])
              })
              .where('address', p2pAddress)
            })
            .catch(err => {

              // Log Port + downtime
              return db('peers').update({
                port: false,
                uptime: db.raw('CONCAT(?, CONCAT(LEFT(uptime, CHAR_LENGTH(uptime) -1), ""))', ["-"])
              })
              .where('address', p2pAddress)
            })


            // Scan API port
            portscanner.checkPortStatus(apiPort, ip)
            .then(api => {
          
              // Log API
              return db('peers').update({
                api: api === 'open' ? api = true : api = false,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            })
            .catch(err => {

              // Log API
              return db('peers').update({
                api: false,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            })


            // Log Address
            axios.get('http://' + apiAddress + '/addresses', {
              timeout: 10000
            })
            .then(address => {
              return db('peers').update({
                generator: address.data[0],
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            })
            .catch(err => {
            })


            console.log('[Peer] [' + p2pAddress + '] added.' + ' (' + secs + ')')
          } // update node
          else if(getPeer[0].count === 1) {

            // Log Geo
            const geo = geoip.lookup(ip)

            if(geo && geo.length >= 1) {
              return db('peers').update({
                api: false,
                country: geo.country || null,
                lat: geo.ll[0] || null,
                lng: geo.ll[1] || null,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            }

            // Scan port and log uptime
            portscanner.checkPortStatus(p2pPort, ip)
            .then(port => {

              // Log Port + uptime
              return db('peers').update({
                port: port === 'open' ? port = true : port = false,
                uptime: db.raw('CONCAT(?, CONCAT(LEFT(uptime, CHAR_LENGTH(uptime) -1), ""))', ["|"])
              })
              .where('address', p2pAddress)
            })
            .catch(err => {

              // Log Port + downtime
              return db('peers').update({
                port: false,
                uptime: db.raw('CONCAT(?, CONCAT(LEFT(uptime, CHAR_LENGTH(uptime) -1), ""))', ["-"])
              })
              .where('address', p2pAddress)
            })

            // Scan API port
            portscanner.checkPortStatus(apiPort, ip)
            .then(api => {    

              // Log API
              return db('peers').update({
                api: api === 'open' ? api = true : api = false,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            })
            .catch(err => {

              // Log API
              return db('peers').update({
                api: false,
                updated: moment().format('YYYY-MM-DD HH:mm:ss')
              })
              .where('address', p2pAddress)
            })

            // Update
            await db('peers').update({
              declared: peer.declaredAddress,
              peerName: peer.peerName,
              nonce: peer.peerNonce,
              appName: peer.applicationName,
              version: peer.applicationVersion,
              updated: moment().format('YYYY-MM-DD HH:mm:ss')
            })
            .where('address', p2pAddress)

            console.log('[Peer] [' + p2pAddress + '] updated.' + ' (' + secs + ')')
          }

          // Acknowledge
          await peerQueue.ack(msg)
        
      }
      catch (err) {
          // Acknowledge the job, to avoid it going back to the queue - read message at start
          // processPeer.ack(msg)
          console.log('[Peer]: ' + err.toString())
      }
  }
}
