good-influxdb
=============

A [`good-reporter`](https://github.com/hapijs/good-reporter) for use with [InfluxDB](http://influxdb.com/). Each event type
corresponds to an InfluxDB series as described below.

### Series


#### request

 time | id | method | status | duration | path | labels | host | pid 
------|----|--------|--------|----------|------|--------|------|-----

Each request is recorded as a point in the `request` data series. The request series can then be broken down into sub-series via [continuous queries](http://influxdb.com/docs/v0.8/api/continuous_queries.html). For example, to get requests per process per host you can run
```
select * from "request" into request.[host].[pid]
```

Once that query is complete, InfluxDB will dynamically create series for each new `host` and `pid combination recorded.


#### error
Responses that result in 500 are logged as errors with the following columns.

 time | url | method | message | stack | host | pid 
------|-----|--------|---------|-------|------|-----



#### os
 time | cpu1m | cpu5m | cpu15m | totalmem | freemem | uptime | host | pid 
------|-------|-------|--------|----------|---------|--------|------|-----



#### process
 time | memory | rss | heapTotal | heapUsed | delay | uptime | host | pid 
------|--------|-----|-----------|----------|-------|--------|------|-----



#### log

 time | data | tags | host | pid 
------|------|------|------|-----


