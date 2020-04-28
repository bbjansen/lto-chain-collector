# LTO Cache Collector
> Maintain an entire copy of the LTO public blockchain plus more in an off-chain database.

## Requirements
- Node.js v8+
- [knex.js]('https://knexjs.org) supported database (MySQL tested only)
- [RabbitMQ](https://www.rabbitmq.com/) 3.6+ with Erlang 20+
- [RabbitMQ Delayed Message Exchange Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange)

## Architecture
![Architecture](/assets/architecture.png?raw=true "Architecture")

1. The block collector scrapes blocks from the public blockchain at a defined interval in batches of up to 99 blocks.
2. The collected block(s) get queued where they get processed at a 1:1 ratio in chronological order.
3. Block `n` is processed by the key block consumer which stores the block into the database.
4. Block `n-1` is processed simultaneously by the micro block consumer which stores all transactions belonging to the block into the database.
5. Block `n-100` is processed by the verify block consumer which validates the blocks signature.
6. Incase the signature mismatches, the block collector rewinds (think of a database reroll) to the last healthy block and continuous.


## Bootstrap
1. Setup a database
2. Setup .env (see example below)
3. Run ``npm run start``

### Tips for faster Bootsrap
- set `VERIFY_CACHE=0`
- set `UPDATE_ADDRESS=0` if you are not interested in address balances and creation dates
- `COLLECTOR_INTERVAL` can be lowered at the start, but not recommended after block 50,000
Consider using pm2 to keep the collector running and enabling RabbitMQ Dashboard to have an overview on the queues.

## .env example
```
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASS=
DB_NAME=

RABBITMQ_HOST=localhost
RABBITMQ_USER=
RABBITMQ_PASS=

NODE_ADDRESS=nodes.lto.network

COLLECTOR_INTERVAL=30000
VERIFY_CACHE=1
VERIFY_INTERVAL=3000000
UPDATE_ADDRESS=1
TIMEOUT=10000
ATOMIC_NUMBER=100000000
```
*if `nodes.lto.network` is unavailable try `node.lto.cloud`
