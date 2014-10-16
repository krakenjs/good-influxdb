'use strict';

var Url = require('url');
var Util = require('util');
var Hoek = require('hoek');
var Wreck = require('wreck');
var GoodReporter = require('good-reporter');
var Stringify = require('json-stringify-safe');
var Mapper = require('./mapper');


var internals = {
    defaults: {
        database: 'good',
        username: undefined,
        password: undefined,
        threshold: 25,
        headers: {
            'Content-Type': 'application/json'
        }
    }
};


module.exports = internals.GoodInflux = function GoodInflux(host, options) {
    Hoek.assert(this instanceof internals.GoodInflux, 'GoodInflux must be created with new');
    Hoek.assert(typeof host === 'string', 'host must be a string');

    var settings, username, password, url, auth;

    settings = Hoek.clone(options || {});
    settings = Hoek.applyToDefaults(internals.defaults, settings);

    // Extract credentials from settings.
    username = settings.username;
    password = settings.password;

    // Try to parse credentials from url. (Overrides options.)
    url = Url.parse(host, true);
    if (typeof url.auth === 'string') {
        auth = url.auth.split(':');
        username = auth[0];
        password = auth[1];
        url.auth = null;
    }

    // Update settings
    settings.host = url.format();
    settings.username = undefined;
    settings.password = undefined;

    url.pathname = Util.format('/db/%s/series', settings.database);
    settings.url = url.format();

    Hoek.assert(typeof username === 'string', 'username must be a string');
    Hoek.assert(typeof password === 'string', 'password must be a string');

    settings.headers.Authorization = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

    GoodReporter.call(this, settings);
};


Hoek.inherits(internals.GoodInflux, GoodReporter);



internals.GoodInflux.prototype.start = function (emitter, callback) {
    emitter.on('report', this._handleEvent.bind(this));
    callback();
};


internals.GoodInflux.prototype.stop = function () {
    this._flush();
};


internals.GoodInflux.prototype._report = function (event, eventData) {
    this._eventQueue.push(eventData);

    if (this._eventQueue.length >= this._settings.threshold) {
        this._flush();
    }
};


internals.GoodInflux.prototype._flush = function () {
    var events, points;

    events = this._eventQueue.splice(0);
    points = Mapper.prepare(events);

    this._sendMessage(points);
};


internals.GoodInflux.prototype._sendMessage = function (points) {

    Wreck.request('post', this._settings.url, { headers: this._settings.headers, payload: Stringify(points) });

};
