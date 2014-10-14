'use strict';

var Url = require('url');
var Util = require('util');
var Hoek = require('hoek');
var Wreck = require('wreck');
var GoodReporter = require('good-reporter');
var Stringify = require('json-stringify-safe');
var Mapper = require('./mapper');


var defaults;

defaults = {
    database: 'good',
    threshold: 25
};


function GoodInflux(host, options) {
    Hoek.assert(this.constructor === GoodInflux, 'GoodInflux must be created with new');
    Hoek.assert(typeof host === 'string', 'host must be a string');

    var settings = Hoek.clone(options);
    settings = Hoek.applyToDefaults(defaults, settings);
    settings.host = host;

    GoodReporter.call(this, settings);
}

Hoek.inherits(GoodInflux, GoodReporter);
module.exports = GoodInflux;


GoodInflux.prototype.start = function (emitter, callback) {
    emitter.on('report', this._handleEvent.bind(this));
    callback();
};


GoodInflux.prototype.stop = function () {
    this._flush();
};


GoodInflux.prototype._report = function (event, eventData) {
    this._eventQueue.push(eventData);

    if (this._eventQueue.length >= this._settings.threshold) {
        this._flush();
    }
};


GoodInflux.prototype._flush = function () {
    var events, points;
    events = this._eventQueue.splice(0);
    points = Mapper.prepare(events);
    this._sendMessage(points);
};


GoodInflux.prototype._sendMessage = function (points) {
    var url, auth, headers;

    url = Url.parse(this._settings.host, true);
    url.pathname = Util.format('/db/%s/series', this._settings.database);

    if (typeof url.auth === 'string') {
        auth = url.auth.split(':');
        url.auth = undefined;
        headers = {
            Authorization: 'Basic ' + new Buffer(auth[0] + ':' + auth[1]).toString('base64'),
            'Content-Type': 'application/json'
        };
    }

    Wreck.request('post', url.format(), { headers: headers, payload: Stringify(points) });
};