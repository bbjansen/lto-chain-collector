// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

const promisify = (fn) => new Promise((resolve, reject) => fn(resolve))

module.exports = promisify