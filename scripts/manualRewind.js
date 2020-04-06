// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.
'use strict'

require('dotenv').config('../')

const rewindChain = require('./rewindChain')

rewindChain(process.argv[2])
