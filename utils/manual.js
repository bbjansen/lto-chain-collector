// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

// The second arguement should be a valid block index to the rewind script.

// eg: node scripts/manualRewind.js 124000 this will prune all blocks and 
// transactions, including its metadata from the database that is equal or
// greater than block 124000.


// Do not even think about using this function to rewind tens of thousands,
// let alone hundreds of thousands of blocks. Preferably should only be used 
// for less than 500 blocks.

// You have been warning

require('dotenv').config('../')
require('../scripts/rewind')(process.argv[2])