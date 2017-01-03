'use strict';

const Os = require('os');
const Series = require('./series');
const Stringify = require('json-stringify-safe');

const internals = {

    /**
     * Map the provided eventData to a series and points
     * @param name the name of the series
     * @param spec the spec mapping column name to data source value
     * @param eventData the actual data source from which we're looking up values
     * @param out the object where mapped data is written
     */
    map: function map(name, spec, eventData, out) {
        let columns, i, len, column, value, line;

        line = {
            event: name,
            fields: [],
            timestamp: null
        };

        columns = Object.keys(spec);

        for (i = 0, len = columns.length; i < len; i++) {
            column = columns[i];
            value = spec[column];
            value = (typeof value === 'function') ? value(eventData) : eventData[value];

            if (column === 'time') {
                line.timestamp = value;
            } else {
                if(typeof value === 'object') {
                  Object.keys(value).forEach(function(k) {
                    let v = value[k];
                    let field = formatField(column + k, v);
                    if(field) {
                        line.fields.push(field);
                    }
                  });
                } else {
                  let field = formatField(column, value);
                  if(field) {
                      line.fields.push(field);
                  }
                }
            }
        }
        out.push(line);
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
            let keys, spec, i, len, key;

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

function formatField(k, v) {
    const value = Stringify(v);
    return value === undefined ? '' : k + '=' + value;
}

function formatLines(lines) {
    return lines.map(formatLine).join('\n');
}

function formatLine(line) {
    return line.event + ' ' + line.fields.join(',') + ' ' + line.timestamp;
}

exports.prepare = function map(arr) {
    let lines, i, len, eventData, mapper;

    lines = [];
    for (i = 0, len = arr.length; i < len; i++) {
        eventData = arr[i];
        mapper = internals.series[eventData.event] || internals.series['*'];
        mapper(eventData, lines);
    }
    return formatLines(lines);
};
