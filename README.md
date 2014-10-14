good-influxdb
=============

A [`good-reporter`](https://github.com/hapijs/good-reporter) for use with [InfluxDB](http://influxdb.com/).

### Series

#### Requests

##### `request`

`time`, `id`, `method`, `status`, `duration`, `path`, `host`, `pid`

##### `request.{label}`

`time`, `id`, `method`, `status`, `duration`, `path`, `host`, `pid`


#### Errors

##### `error`

`time`, `url`, `method`, `message`, `stack`, `host`, `pid`


#### Ops

##### `ops.os`

`time`, `cpu1m`, `cpu5m`, `cpu15m`, `totalmem`, `freemem`, `uptime`, `host`, `pid`

##### `ops.process`

`time`, `memory`, `rss`, `heapTotal`, `heapUsed`, `delay`, `uptime`, `host`, `pid`


#### Logs

##### `log`

`time`, `data`, `host`, `pid`

##### `log.{tag}`

`time`, `data`, `host`, `pid`