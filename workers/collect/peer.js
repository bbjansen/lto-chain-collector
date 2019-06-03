// Copyright (c) 2018-2019, BB Jansen
//
// Please see the included LICENSE file for more information.

'use strict'
const db = require('../../utils/utils').knex
const cron = require('node-cron')
const axios = require('axios')
const UUID = require('uuid/v4')

// Takes all connected to peers from the node API and 
// the stored known peers, and filter any overlap.
// Send each peer in the new list to queue.

module.exports = function (peerQueue) {

  // Collect peers every hour 
  cron.schedule('0 * * * *', () => {
    collectPeers()
  })

  async function collectPeers() {
    try {

      // Get all node peers
      const getPeers = await axios.get('https://' + (process.env.NODE_ADDRESS || process.env.NODE.IP + ':' + process.env.NODE_PORT) + '/peers/connected', {
        timeout: process.env.TIMEOUT
      })

      // Get all logged peers
      const knownPeers = await db('peers')
      .select('address', 'declared as declaredAddress', 'peerName', 'nonce as peerNonce', 'appName as applicationName', 'version as applicationVersion')

      // Filter new peers
      const filteredPeers =  getPeers.data.peers.filter(x => !knownPeers.includes(x));

      // combine newPeers with filteredPeers
      let peers = getPeers.data.peers.concat(filteredPeers)
     
      // push self
      peers.push({
        address: '/' + process.env.NODE_IP + ':' + (process.env.NODE_PORT - 1),
        declaredAddress: '/' + process.env.NODE_IP + ':' + (process.env.NODE_PORT - 1),
        peerName: process.env.NODE_NAME,
        peerNonce: 0,
        applicationName: 'ltoL',
        applicationVersion: '1.0.3'
      })

      // Add each peer to the queue for processing
      peers.forEach(peer => {
        peerQueue.sendToQueue('peerQueue', new Buffer(JSON.stringify(peer)), {
          correlationId: UUID()
        })
      })
    }
    catch(err) {
      console.log('[Peer]: ' + err.toString())
    }
  }
}