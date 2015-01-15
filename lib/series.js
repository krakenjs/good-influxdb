'use strict';

var Os = require('os');
var Url = require('url');
var compile = require('fastpath');


var internals = {
    /**
     * Generate a mapping function for the provided key.
     * @param key the key to look up in the provided data.
     * @returns {Function}
     */
    find: function find(key) {
        var fn = compile(key).evaluate;
        return function (eventData) {
            return fn(eventData)[0];
        };
    }
};


module.exports = {

    ERROR: {
        time: 'timestamp',
        url: function (eventData) {
            return Url.format(eventData.url);
        },
        method: 'method',
        message: 'message',
        stack: 'stack',
        host: Os.hostname,
        pid: 'pid'
    },

    PROCESS: {
        time: 'timestamp',
        memory: function (eventData) {
            return Math.round(eventData.proc.mem.rss / (1024 * 1024));
        },
        rss: internals.find('proc.mem.rss'),
        heapTotal: internals.find('proc.mem.heapTotal'),
        heapUsed: internals.find('proc.mem.heapUsed'),
        uptime: internals.find('proc.uptime'),
        delay: internals.find('proc.delay'),
        host: Os.hostname,
        pid: 'pid'
    },

    OS: {
        time: 'timestamp',
        cpu1m: internals.find('os.load[0]'),
        cpu5m: internals.find('os.load[1]'),
        cpu15m: internals.find('os.load[2]'),
        totalmem: internals.find('os.mem.total'),
        freemem: internals.find('os.mem.free'),
        uptime: internals.find('os.uptime'),
        host: Os.hostname,
        pid: 'pid'
    },

    REQUEST: {
        time: 'timestamp',
        id: 'id',
        method: 'method',
        status: 'statusCode',
        duration: 'responseTime',
        path: 'path',
        labels: function (eventData) {
            return String(eventData.labels);
        },
        host: Os.hostname,
        pid: 'pid',
        remoteIp: internals.find('source.remoteAddress')
    },

    LOG: {
        time: 'timestamp',
        data: 'data',
        tags: function (eventData) {
            return String(eventData.tags);
        },
        host: Os.hostname,
        pid: 'pid'
    }
};
