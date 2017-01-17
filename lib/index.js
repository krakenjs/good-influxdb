'use strict';

const Url = require('url');
const Util = require('util');
const Hoek = require('hoek');
const Wreck = require('wreck');
const Mapper = require('./mapper');
const Stream = require('stream');

const internals = {
    defaults: {
        database: 'good',
        username: undefined,
        password: undefined,
        threshold: 25,
        headers: {
            'Content-Type': 'application/octet-stream'
        },
        precision: 'ms' // default to milliseconds
    }
};

class GoodInflux extends Stream.Writable {
    constructor(host, config) {
        Hoek.assert(typeof host === 'string', 'host must be a string');

        super({ objectMode: true, decodeStrings: false });

        config = config || {};
        const url = Url.parse(host, true);
        const settings = Object.assign({}, internals.defaults, config);

        // Try to parse credentials from url. (Overrides options.)
        if (typeof url.auth === 'string') {
            let auth
            auth = url.auth.split(':');
            settings.username = auth[0];
            settings.password = auth[1];
            url.auth = null;
        }

        url.pathname = '/write';
        settings.url = Url.format(url) + Util.format('?db=%s', settings.database) + Util.format('&precision=%s', settings.precision);
        settings.headers.Authorization = 'Basic ' + new Buffer(settings.username + ':' + settings.password).toString('base64');

        this._endpoint = settings.endpoint;
        this._settings = settings;
        this._data = [];

        this.once('finish', () => {
            this._flush(function() {});
        });
    }
    _write(data, encoding, callback) {
        this._data.push(data);

        if (this._data.length >= this._settings.threshold) {
            this._flush((err) => {
                if(err) {
                  return callback(err);
                }
                return callback();
            });
        }
        else {
            setImmediate(callback);
        }
    }
    _flush(callback) {
        let events, lines;

        events = this._data.splice(0);

        lines = Mapper.prepare(events);

        this._sendMessages(lines, () => {
          this._data = [];
          callback();
        });
    }
    _sendMessages(lines, callback) {
        Wreck.post(this._settings.url, { headers: this._settings.headers, payload: lines }, callback);
    }
}

module.exports = GoodInflux;
