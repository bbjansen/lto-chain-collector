// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../utils/utils').knex
const axios = require('axios')
const geoip = require('geoip-lite')
const moment = require('moment')
const portscanner = require('portscanner')


setInterval(function() { 
  collectPeers()
}, process.env.INTERVAL_COLLECT_PEERS)

// Takes all connected to peers from the node API and geoip
// locate them and checks for its address and if the API is
// open. If the address has already been logged, it updates
// the data.


collectPeers()

async function collectPeers() {
  try {

    // Get Peers
    const getPeers = await axios.get('https://' + process.env.NODE_IP + '/peers/connected', {
      timeout: 10000
    })

    const knownPeers = await db('peers')
    .select()

    // Add known peers to scan
    knownPeers.forEach(p => {
      getPeers.data.peers.push({
        address: '/' + p.address,
        declaredAddress:  '/' + p.address || null,
        peerName: p.peerName || null,
        peerNonce: p.peerNonce || null,
        applicationName: p.appName || null,
        applicationVersion: p.version || null,
      })
    })

    // Add self
    getPeers.data.peers.push({
      address: '/' + process.env.NODE_ADDRESS,
      declaredAddress:  '/' + process.env.NODE_ADDRESS,
      peerName: process.env.NODE_NAME,
      peerNonce: 0,
      applicationName: 'ltoL',
      applicationVersion: '1.0.3'
    })

    getPeers.data.peers.map(async (p) => {
      // Timeout
      setTimeout(async () => {

        // Format address
        const addressArray = p.address.split('/').pop().split(':')
        const ip = addressArray[0]
        const p2pPort = addressArray[1]
        const apiPort = +addressArray[1] + 1
        const p2pAddress = ip + ':' + p2pPort
        const apiAddress = ip + ':' + apiPort
    
        // Look up if peer has been detected before
        const getPeer = await db('peers')
        .count('* as count')
        .where('address', p2pAddress)

        // New peer
        if(getPeer[0].count === 0) {

          // Insert peer
          await db('peers').insert({
            address: p2pAddress,
            declared: p.declaredAddress,
            peerName: p.peerName,
            nonce: p.peerNonce,
            appName: p.applicationName,
            version: p.applicationVersion
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
              port: port === 'open' ? port = true : port = false
            })
            .where('address', p2pAddress)
          })
          .catch(err => {

            // Log Port + downtime
            return db('peers').update({
              port: false,
              uptime: db.raw('CONCAT(?, uptime)', ['-'])
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


          console.log('[Peer] [' + p2pAddress + '] added.')
        } // update node
        else if(getPeer[0].count === 1) {

          // Check uptime lengths, only allow 24 (one per hour)
          const getUptime = await db('peers')
          .select('uptime')
          .where('address', p2pAddress)
          .limit(1)

          if(getUptime[0].uptime.length === 24) {
            // update shortened uptime
            await db('peers').update({
              uptime: getUptime[0].uptime.substring(0, +getUptime[0].uptime.length - 1)
            })
            .where('address', p2pAddress)
          }

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
              uptime: db.raw('CONCAT(?, uptime)', ['|'])
            })
            .where('address', p2pAddress)
          })
          .catch(err => {

            // Log Port + downtime
            return db('peers').update({
              port: false,
              uptime: db.raw('CONCAT(?, uptime)', ['-'])
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
            declared: p.declaredAddress,
            peerName: p.peerName,
            nonce: p.peerNonce,
            appName: p.applicationName,
            version: p.applicationVersion,
            updated: moment().format('YYYY-MM-DD HH:mm:ss')
          })
          .where('address', p2pAddress)

          console.log('[Peer] [' + p2pAddress + '] updated.')
        }
      }, process.env.TIMEOUT)
    })
  }
  catch(err) {
    

  }
}