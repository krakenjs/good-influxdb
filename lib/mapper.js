'use strict';

var Os = require('os');
var Series = require('./series');
var Stringify = require('json-stringify-safe');


var internals = {

    /**
     * Map the provided eventData to a series and points
     * @param name the name of the series
     * @param spec the spec mapping column name to data source value
     * @param eventData the actual data source from which we're looking up values
     * @param out the object where mapped data is written
     */
    map: function map(name, spec, eventData, out) {
        var columns, values, i, len, column, value;

        columns = Object.keys(spec);
        values = [];

        for (i = 0, len = columns.length; i < len; i++) {
            column = columns[i];
            value = spec[column];
            value = (typeof value === 'function') ? value(eventData) : eventData[value];

            switch (typeof value) {
                case 'string':
                case 'boolean':
                case 'number':
                    // ignore
                    break;

                case 'object':
                    if (Array.isArray(value)) {
                        value = String(value);
                    } else if (value instanceof Date) {
                        value = String(value);
                    } else {
                        value = Stringify(value);
                    }
                    break;
            }

            values[i] = value;
        }

        if (!out.hasOwnProperty(name)) {
            out[name] = {
                name: name,
                columns: columns,
                points: []
            };
        }
        out[name].points.push(values);
    },

    series: {
        ops: function ops(eventData, out) {
            internals.map('process', Series.PROCESS, eventData, out);
            internals.map('os', Series.OS, eventData, out);
        },

        log: function log(eventData, out) {
            internals.map(eventData.event, Series.LOG, eventData, out);
        },

        request: function request(eventData, out) {
            internals.map(eventData.event, Series.REQUEST, eventData, out);
        },

        error: function error(eventData, out) {
            internals.map(eventData.event, Series.ERROR, eventData, out);
        },

        '*': function all(eventData, out) {
            var keys, spec, i, len, key;

            // Generate custom spec, setting some defaults.
            keys = Object.keys(eventData);
            spec = {
                time: function (eventData) {
                    return eventData.timestamp || Date.now();
                },
                host: Os.hostname,
                pid: function () {
                    return process.pid;
                }
            };

            for (i = 0, len = keys.length; i < len; i++) {
                key = keys[i];
                if (key !== 'timestamp') {
                    // Timestamp is a special case, so we opt out here in favor of
                    // the `time` handler above.
                    spec[key] = key;
                }
            }

            internals.map(eventData.event, spec, eventData, out);
        }
    }

};


exports.prepare = function map(arr) {
    var points, i, len, eventData, mapper;

    points = {};

    for (i = 0, len = arr.length; i < len; i++) {
        eventData = arr[i];
        mapper = internals.series[eventData.event] || internals.series['*'];
        mapper(eventData, points);
    }

    return Object.keys(points).map(function (key) {
        return points[key];
    });
};
