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

Once that query is complete, InfluxDB will dynamically create series for each new `host` and `pid` combination recorded.


#### error


 time | url | method | message | stack | host | pid 
------|-----|--------|---------|-------|------|-----

Responses that result in 500 status code are logged as errors. Each error contains the error message and stacktrace, in addition to the url and HTTP method pertaiing to the failed request.


#### os
 time | cpu1m | cpu5m | cpu15m | totalmem | freemem | uptime | host | pid 
------|-------|-------|--------|----------|---------|--------|------|-----

OS-level details are also recorded, including the columns above.
NOTE: Currently there is no deduping of data, therefore if multiple processes are running on the same host, duplicate OS data will be recorded to Influx.


#### process
 time | memory | rss | heapTotal | heapUsed | delay | uptime | host | pid 
------|--------|-----|-----------|----------|-------|--------|------|-----

process-leve details, including the event loop delay, are recorded into a `process` series.


#### log

 time | data | tags | host | pid 
------|------|------|------|-----

Server logs, including tags are also recorded as points in the `log` series.

