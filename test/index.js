'use strict';

var EventEmitter = require('events').EventEmitter;
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var GoodInflux = require('..');
var Hapi = require('hapi');

var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;
var internals = {
    createServer: function (handler) {
        var server = new Hapi.Server('127.0.0.1', 0);

        server.route({
            method: 'POST',
            path: '/db/good/series',
            handler: handler
        });

        return server;
    }
};


it('throws an error without new', function (done) {

    expect(function () {
        var reporter = GoodInflux('http://www.github.com');
    }).to.throw('GoodInflux must be created with new');

    done();
});


it('throws an error when missing host', function (done) {

    expect(function () {
        var reporter = new GoodInflux();
    }).to.throw('host must be a string');

    done();
});


it('throws an error when missing username', function (done) {

    expect(function () {
        var reporter = new GoodInflux('http://www.github.com');
    }).to.throw('username must be a string');

    expect(function () {
        var reporter = new GoodInflux('http://www.github.com', { username: {} });
    }).to.throw('username must be a string');

    done();
});


it('throws an error when missing password', function (done) {

    expect(function () {
        var reporter = new GoodInflux('http://www.github.com', { username: '' });
    }).to.throw('password must be a string');

    done();
});

it('expects credentials in the host', function (done) {
    expect(function () {
        var reporter = new GoodInflux('http://user:pass@www.github.com');
    }).to.not.throw();

    done();
});


it('honors the threshold setting and sends the events in a batch', function (done) {
    var ee, requests, server, reporter;

    ee = new EventEmitter();
    requests = 0;
    server = internals.createServer(function handler(req, reply) {
        reply('ok');

        expect(req.payload.length).to.equal(1);
        expect(req.payload[0].name).to.equal('log');

        expect(req.payload[0].columns).to.exist;
        expect(req.payload[0].columns.length).to.equal(5);

        expect(req.payload[0].points).to.exist;
        expect(req.payload[0].points.length).to.equal(5);

        expect(req.payload[0].points[0].length).to.equal(5);
        expect(req.payload[0].points[0][1]).to.equal('this is data for item ' + (requests * 5));

        requests += 1;
        if (requests === 2) {
            done();
        }
    });

    server.start(function () {

        reporter = new GoodInflux(server.info.uri, {
            threshold: 5,
            username: 'foo',
            password: 'bar',
            events: {
                log: '*'
            }
        });

        reporter.start(ee, function (err) {
            expect(err).to.not.exist;

            for (var i = 0; i < 10; ++i) {
                ee.emit('report', 'log', {
                    event: 'log',
                    timestamp: Date.now(),
                    data: 'this is data for item ' + i
                });
            }
        });
    });
});


it('sends each event individually if threshold is 0', function (done) {
    var ee, requests, server, reporter;

    ee = new EventEmitter();
    requests = 0;
    server = internals.createServer(function handler(req, reply) {
        reply('ok');

        expect(req.payload.length).to.equal(1);
        expect(req.payload[0].name).to.equal('log');

        expect(req.payload[0].columns).to.exist;
        expect(req.payload[0].columns.length).to.equal(5);

        expect(req.payload[0].points).to.exist;
        expect(req.payload[0].points.length).to.equal(1);

        expect(req.payload[0].points[0].length).to.equal(5);
        expect(req.payload[0].points[0][1]).to.equal('this is data for item ' + requests);

        requests += 1;
        if (requests === 10) {
            done();
        }
    });

    server.start(function () {
        reporter = new GoodInflux(server.info.uri, {
            threshold: 0,
            username: 'foo',
            password: 'bar',
            events: {
                log: '*'
            }
        });

        reporter.start(ee, function (err) {
            expect(err).to.not.exist;

            for (var i = 0; i < 10; ++i) {
                ee.emit('report', 'log', {
                    event: 'log',
                    timestamp: Date.now(),
                    data: 'this is data for item ' + i
                });
            }
        });
    });
});


it('sends the remaining events when stopped', function (done) {
    var ee, requests, server, reporter;

    ee = new EventEmitter();
    requests = 0;
    server = internals.createServer(function handler(req, reply) {
        reply('ok');

        expect(req.payload.length).to.equal(1);
        expect(req.payload[0].name).to.equal('log');

        expect(req.payload[0].columns).to.exist;
        expect(req.payload[0].columns.length).to.equal(5);

        expect(req.payload[0].points).to.exist;
        expect(req.payload[0].points.length).to.equal(5);

        expect(req.payload[0].points[0].length).to.equal(5);
        expect(req.payload[0].points[0][1]).to.equal('this is data for item ' + requests);

        done();
    });

    server.start(function () {
        reporter = new GoodInflux(server.info.uri, {
            threshold: 6,
            username: 'foo',
            password: 'bar',
            events: {
                log: '*'
            }
        });

        reporter.start(ee, function (err) {
            expect(err).to.not.exist;

            for (var i = 0; i < 5; ++i) {
                ee.emit('report', 'log', {
                    event: 'log',
                    timestamp: Date.now(),
                    data: 'this is data for item ' + i
                });
            }

            reporter.stop();
        });
    });
});