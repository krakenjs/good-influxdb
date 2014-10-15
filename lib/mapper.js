'use strict';

var Series = require('./series');


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
            values[i] = (typeof value === 'function') ? value(eventData) : eventData[value];
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
        }
    }

};


exports.prepare = function map(arr) {
    var points, i, len, eventData, mapper;

    points = {};

    for (i = 0, len = arr.length; i < len; i++) {
        eventData = arr[i];
        mapper = internals.series[eventData.event];
        if (typeof mapper === 'function') {
            mapper(eventData, points);
        }
    }

    return Object.keys(points).map(function (key) {
        return points[key];
    });
};