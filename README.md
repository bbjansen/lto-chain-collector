# LTO Chain Cache
This node.js project caches the LTO network chain and stores it into a [knex.js]('https://knexjs.org) supported database. It comes with an API endpoint that allows you to query the database.

## Requirements
- Node.js v8+
- Knex.js supported database (pg, sqlite3, mysql, mysql2, oracle, mssql)
- NGINX / Apache

## API Routes
- `/block/`
- `/consensus/`
- `/feature/`
- `/proof/`
- `/transaction/`
- `/transfer/`
- `/anchor/`
- `/lease/`
- `/generator/`
- `/address/`
- `/peer/`
- `/stats/`

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


NODE_IP=192.168.1.1

ATOMIC=100000000
TIMEOUT=2000
```