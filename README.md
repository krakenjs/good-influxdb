good-influxdb
=============

A [`good-reporter`](https://github.com/hapijs/good-reporter) for use with [InfluxDB](http://influxdb.com/). Each event type
corresponds to an InfluxDB series as described below.

### Series


##### `request`
Each request is recorded as a point in a `request` data series with the following columns:

 time | id | method | status | duration | path | labels | host | pid 
------|----|--------|--------|----------|------|--------|------|-----


##### `error`
Responses that result in 500 are logged as errors with the following columns.

 time | url | method | message | stack | host | pid 
------|-----|--------|---------|-------|------|-----



##### `os`
 time | cpu1m | cpu5m | cpu15m | totalmem | freemem | uptime | host | pid 
------|-------|-------|--------|----------|---------|--------|------|-----



##### `process`
 time | memory | rss | heapTotal | heapUsed | delay | uptime | host | pid 
------|--------|-----|-----------|----------|-------|--------|------|-----



##### `log`

 time | data | tags | host | pid 
------|------|------|------|-----


