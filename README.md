# LTO Cache Collector
> Stores and maintains a full copy of the public LTO chain in an off-chain database cache for quicker writing and reading.

## Requirements
- Node.js v8+
- [knex.js]('https://knexjs.org) supported database.
- [Rabbit MQ](https://www.rabbitmq.com/) 3.6+ with Erlang 20+
- [Rabbit MQ Delayed Message Exchange Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange)
- [LTO Chain Cache API](https://github.com/bbjansen/lto-cache-api)


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

NODE_NAME=lto.cloud
NODE_ADDRESS=https://node.endpoint
NODE_IP=0.0.0.0
NODE_PORT=6869

COLLECTOR=10000
COLLECTOR_INTERVAL=1
VERIFY_CACHE=1
VERIFY_INTERVAL=3000000
UPDATE_ADDRESS=1
TIMEOUT=10000
ATOMIC_NUMBER=100000000
```
