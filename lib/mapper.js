'use strict';

var Os = require('os');


exports.prepare = function map(arr) {
    var points, i, len, eventData, mapper;

    points = {};

    for (i = 0, len = arr.length; i < len; i++) {
        eventData = arr[i];
        mapper = exports[eventData.event];
        if (typeof mapper === 'function') {
            mapper(eventData, points);
        }
    }

    return Object.keys(points).map(function (key) {
        return points[key];
    });
};


exports.ops = function ops(eventData, out) {
    var name;

    name = eventData.event + '.' + Os.hostname() + ':' + eventData.pid;

    if (!out.hasOwnProperty(name)) {
        out[name] = {
            name: name,
            columns: [ 'time', 'delay', 'memory', 'uptime', 'host', 'pid' ],
            points: []
        };
    }

    out[name].points.push([
        eventData.timestamp,
        eventData.proc.delay,
        Math.round(eventData.proc.mem.rss / (1024 * 1024)),
        eventData.proc.uptime,
        Os.hostname(),
        eventData.pid
    ]);
};


exports.log = function log(eventData, out) {
    var i, len;

    function record(name, eventData, out) {
        if (!out.hasOwnProperty(name)) {
            out[name] = {
                name: name,
                columns: ['time', 'data', 'host', 'pid'],
                points: []
            };
        }

        out[name].points.push([
            eventData.timestamp,
            eventData.data,
            Os.hostname(),
            eventData.pid
        ]);
    }

    if (eventData.tags.length) {
        for (i = 0, len = eventData.tags.length; i < len; i++) {
            record(eventData.event + '.' + eventData.tags[i], eventData, out);
        }
    } else {
        record(eventData.event, eventData, out);
    }
};


exports.request = function request(eventData, out) {
    var name = eventData.event;

    if (!out.hasOwnProperty(name)) {
        out[name] = {
            name: name,
            columns: [ 'time', 'id', 'method', 'status', 'duration', 'path', 'host', 'pid' ],
            points: []
        };
    }

    out[name].points.push([
        eventData.timestamp,
        eventData.id,
        eventData.method,
        eventData.statusCode,
        eventData.responseTime,
        eventData.path,
        Os.hostname(),
        eventData.pid
    ]);
};


exports.error = function error(eventData, out) {
    var name = eventData.event;

    if (!out.hasOwnProperty(name)) {
        out[name] = {
            name: name,
            columns: [ 'time', 'url', 'method', 'message', 'stack', 'host', 'pid' ],
            points: []
        };
    }

    out[name].points.push([
        eventData.timestamp,
        eventData.url,
        eventData.method,
        eventData.message,
        eventData.stack,
        Os.hostname(),
        eventData.pid
    ]);
};
