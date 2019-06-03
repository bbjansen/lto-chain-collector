# LTO Chain Cache
This node.js project caches the LTO network chain and stores it into a [knex.js]('https://knexjs.org) supported database.

## Requirements
- Node.js v8+
- Knex.js supported database (pg, sqlite3, mysql, mysql2, oracle, mssql)

## .env example

```
APP_PORT=8012

DB_HOST=localhost
DB_PORT=3306
DB_USER=user
DB_PASS=pass
DB_NAME=db

RABBITMQ_HOST=localhost
RABBITMQ_USER=user
RABBITMQ_PASS=pass

(NODE_ADDRESS || NODE.IP + ':' + NODE_PORT)=192.168.1.1

COLLECT_BLOCKS=10000
INTERVAL_COLLECT_ADDRESS=30000
INTERVAL_SCAN_ADDRESS=60000

```