// Copyright (c) 2018, Fexra
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../utils/utils').knex
const axios = require('axios')
const geoip = require('geoip-lite')
const moment = require('moment'
)
setInterval(function() { 
  collectPeers()
}, process.env.INTERVAL_COLLECT_PEERS)

// Takes all connected to peers from the node API and geoip
// locate them and checks for its address and if the API is
// open. If the address has already been logged, it updates
// the data.

async function collectPeers() {
  try {

    //Insert self

    const getPeers = await axios.get('https://' + process.env.NODE_IP + '/peers/connected')

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
  
        // Geo
        const geo = geoip.lookup(ip)
  
        // Look up if peer has been detected before
        const getPeer = await db('peers')
        .count('* as count')
        .where('address', p2pAddress)

        // New peer
        if(getPeer[0].count <= 0) {


          try {
            const getAddress = await axios.get('http://' + apiAddress + '/addresses', {
              timeout: process.env.TIMEOUT
            })

            // Node is public!
            await db('peers').insert({
              address: p2pAddress,
              declared: p.declaredAddress,
              peerName: p.peerName,
              nonce: p.peerNonce,
              appName: p.applicationName,
              version: p.applicationVersion,
              country: geo.country,
              lat: geo.ll[0] || null,
              lng: geo.ll[1] || null,
              generator: getAddress.data[0],
              public: true,
              uptime: '|-----------------------'
            }) 

          } catch(err) {
            // Node is closed!
            await db('peers').insert({
              address: p2pAddress,
              declared: p.declaredAddress,
              peerName: p.peerName,
              nonce: p.peerNonce,
              appName: p.applicationName,
              version: p.applicationVersion,
              country: geo.country,
              lat: geo.ll[0] || null,
              lng: geo.ll[1] || null,
              public: false,
              uptime: '------------------------'
            })
          }

          console.log('[Peer] [' + p2pAddress + '] added.')
        } // update node
        else if(getPeer[0].count >= 1) {

          // Check uptime lengths, only allow 24 (one per hour)
          const getUptime = await db('peers')
          .select('uptime')
          .where('address', p2pAddress)
          .limit(1)

          if(getUptime[0].uptime.length >= 24) {
            // update shortened uptime
            await db('peers').update({
              uptime: getUptime[0].uptime.substring(0, +getUptime[0].uptime.length - 1)
            })
            .where('address', p2pAddress)
          }

          // Ping node and update data
          try {
            const getAddress = await axios.get('http://' + apiAddress + '/addresses', {
              timeout: process.env.TIMEOUT
            })

            // Node is public!
            await db('peers').update({
              declared: p.declaredAddress,
              peerName: p.peerName,
              nonce: p.peerNonce,
              appName: p.applicationName,
              version: p.applicationVersion,
              country: geo.country,
              lat: geo.ll[0] || null,
              lng: geo.ll[1] || null,
              generator: getAddress.data[0],
              public: true,
              uptime: db.raw('CONCAT(?, uptime)', ['|']),
              updated: moment().format('YYYY-MM-DD HH:mm:ss')
            })
            .where('address', p2pAddress)
          }
          catch(err) {
            // Node is closed!
            await db('peers').update({
              declared: p.declaredAddress,
              peerName: p.peerName,
              nonce: p.peerNonce,
              appName: p.applicationName,
              version: p.applicationVersion,
              country: geo.country,
              lat: geo.ll[0] || null,
              lng: geo.ll[1] || null,
              public: false,
              uptime: db.raw('CONCAT(?, uptime)', ['-']),
              updated: moment().format('YYYY-MM-DD HH:mm:ss')
            })
            .where('address', p2pAddress)
          }

          console.log('[Peer] [' + p2pAddress + '] updated.')
        }
      }, process.env.TIMEOUT)
    })
  }
  catch(err) {
    console.log(err)
  }
}