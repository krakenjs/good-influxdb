'use strict';

var Code = require('code');
var EventEmitter = require('events').EventEmitter;
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var GoodInflux = require('..');
var Hapi = require('hapi');

var describe = lab.describe;
var it = lab.it;
var internals = {
    createServer: function (handler) {
        var server = new Hapi.Server('127.0.0.1', 0);

        server.route({
            method: 'POST',
            path: '/write',
            handler: handler
        });

        return server;
    }
};


describe('arguments', function () {

    it('throws an error without new', function (done) {

        Code.expect(function () {
            var reporter = GoodInflux('http://www.github.com');
        }).to.throw('GoodInflux must be created with new');

        done();
    });


    it('throws an error when missing host', function (done) {

        Code.expect(function () {
            var reporter = new GoodInflux();
        }).to.throw('host must be a string');

        done();
    });


    it('allows credentials in the host', function (done) {

        Code.expect(function () {
            var reporter = new GoodInflux('http://user:pass@www.github.com');
        }).to.not.throw();

        done();
    });


    it('throws an error on invalid username', function (done) {

        Code.expect(function () {
            var reporter = new GoodInflux('http://www.github.com');
        }).to.throw('username must be a string');

        Code.expect(function () {
            var reporter = new GoodInflux('http://www.github.com', { username: 42 });
        }).to.throw('username must be a string');

        done();
    });


    it('throws an error on invalid password', function (done) {

        Code.expect(function () {
            var reporter = new GoodInflux('http://www.github.com', { username: '' });
        }).to.throw('password must be a string');

        Code.expect(function () {
            var reporter = new GoodInflux('http://www.github.com', { username: '', password: 42 });
        }).to.throw('password must be a string');

        done();
    });

});


describe('credentials', function () {

    it('extracts username and password', function (done) {
        var reporter, settings;

        reporter = new GoodInflux('http://user:pass@github.com');
        settings = reporter._settings;

        Code.expect(settings.username).to.not.exist;
        Code.expect(settings.password).to.not.exist;
        Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');

        done();
    });


    it('overrides username and password with host auth', function (done) {
        var reporter, settings;

        reporter = new GoodInflux('http://user:pass@github.com', { username: 'foo', password: 'bar' });
        settings = reporter._settings;

        Code.expect(settings.username).to.not.exist;
        Code.expect(settings.password).to.not.exist;
        Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');

        done();
    });


    it('allows username and password config options', function (done) {
        var reporter, settings;

        reporter = new GoodInflux('http://github.com', { username: 'user', password: 'pass' });
        settings = reporter._settings;

        Code.expect(settings.username).to.not.exist;
        Code.expect(settings.password).to.not.exist;
        Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');

        done();
    });

});



describe('report', function () {

    it('honors the threshold setting and sends the events in a batch', function (done) {
        var ee, requests, server, reporter;

        ee = new EventEmitter();
        requests = 0;
        server = internals.createServer(function handler(req, reply) {

            if (req.payload && req.payload[0]) {
                var line = req.payload.toString('utf8').split('\n')[0].split(' ');
                var eventName = line[0];
                var columns = line[1];
                var points = columns.split(',');
                var timestamp = line[2];
            }

            reply('ok');

            Code.expect(eventName).to.equal('log');

            Code.expect(columns).to.exist;
            Code.expect(columns.length).to.equal(10);

            Code.expect(points).to.exist;
            Code.expect(points.length).to.equal(1);

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
                Code.expect(err).to.not.exist;

                for (var i = 0; i < 10; ++i) {
                    ee.emit('report', 'log', {
                        event: 'log',
                        time: Date.now(),
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
            if (req.payload && req.payload[0]) {
                var line = req.payload.toString('utf8').split('\n')[0].split(' ');
                var eventName = line[0];
                var columns = line[1];
                var points = columns.split(',');
            }

            reply('ok');

            Code.expect(eventName).to.equal('log');

            Code.expect(columns).to.exist;
            Code.expect(columns.length).to.equal(10);

            Code.expect(points).to.exist;
            Code.expect(points.length).to.equal(1);

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
                Code.expect(err).to.not.exist;

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


    // TODO: Support ANY event
    it('recognizes misc events', function (done) {
        var ee, requests, server, reporter;

        ee = new EventEmitter();
        requests = 0;
        server = internals.createServer(function handler(req, reply) {
            if (req.payload && req.payload[0]) {
                var line = req.payload.toString('utf8').split('\n')[0].split(' ');
                var eventName = line[0];
                var columns = line[1];
                var points = columns.split(',');
            }

            reply('ok');

            if (requests % 2) {

                Code.expect(line.length).to.not.equal(1);

                Code.expect(columns).to.exist;
                Code.expect(columns.length).to.not.equal(1);

                Code.expect(points).to.exist;

                Code.expect(points.length).to.not.equal(1);

            } else {

                Code.expect(line.length).to.not.equal(1);

                Code.expect(columns).to.exist;
                Code.expect(columns.length).to.equal(10);

                Code.expect(points).to.exist;
                Code.expect(points.length).to.equal(1);
            }

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
                    log: '*',
                    foo: '*'
                }
            });

            reporter.start(ee, function (err) {
                Code.expect(err).to.not.exist;

                for (var i = 0; i < 10; ++i) {
                    if (i % 2) {

                        if (i === 1) {
                            ee.emit('report', 'foo', {
                                event: 'foo',
                                timestamp: Date.now(),
                                data: 'bar',
                                object: { foo: 'bar' },
                                when: new Date(),
                                labels: ['a', 'b', 'c']
                            });
                        } else {
                            ee.emit('report', 'foo', {
                                event: 'foo',
                                data: 'bar',
                                object: { foo: 'bar' },
                                when: new Date(),
                                labels: ['a', 'b', 'c']
                            });
                        }

                    } else {
                        ee.emit('report', 'log', {
                            event: 'log',
                            timestamp: Date.now(),
                            data: 'this is data for item ' + i
                        });
                    }
                }
            });
        });
    });


    it('maps request, ops, log, and error events', function (done) {
        var ee, events, requests, server, reporter;

        ee = new EventEmitter();
        events = [
            {
                payload: {
                    event: 'request',
                    timestamp: Date.now(),
                    id: '',
                    instance: '',
                    labels: [],
                    method: 'GET',
                    path: '/foo',
                    query: '',
                    responseTime: 100,
                    statusCode: 200,
                    pid: 1234
                },
                validate: function (payload) {
                    var idx;
                    if (payload && payload[0]) {
                        var line = payload.toString('utf8').split('\n')[0].split(' ');
                        var eventName = line[0];
                        var columns = line[1];
                    }

                    idx = columns.indexOf('remoteIp');

                    Code.expect(payload.length).to.not.equal(1);
                    Code.expect(eventName).to.equal(this.payload.event);
                    Code.expect(idx).to.not.equal(-1);
                }
            },
            {
                payload: {
                    event: 'request',
                    timestamp: Date.now(),
                    id: '',
                    instance: '',
                    labels: [],
                    method: 'GET',
                    path: '/foo',
                    query: '',
                    source: {
                        remoteAddress: '127.0.0.1'
                    },
                    responseTime: 100,
                    statusCode: 200,
                    pid: 1234
                },
                validate: function (payload) {
                    var idx;

                    if (payload && payload[0]) {
                        var line = payload.toString('utf8').split('\n')[0].split(' ');
                        var eventName = line[0];
                        var columns = line[1];
                    }

                    idx = columns.indexOf('remoteIp');

                    Code.expect(eventName).to.equal(this.payload.event);
                    Code.expect(idx).to.not.equal(-1);
                }
            },
            {
                payload: {
                    event: 'ops',
                    timestamp: Date.now(),
                    host: 'localhost',
                    os: {
                        load: [1,2,3],
                        mem: {
                            total: 2,
                            free: 1
                        },
                        uptime: 123
                    },
                    proc: {
                        uptime: 123,
                        mem: {
                            rss: 1,
                            heapTotal: 2,
                            headpUsed: 1
                        },
                        delay: 123
                    },
                    load: [1,2,3],
                    pid: 1234
                },
                validate: function (payload) {
                    if (payload && payload[0]) {
                        var line = payload.toString('utf8').split('\n')[0].split(' ');
                    }

                    Code.expect(line.length).to.not.equal(1);
                }
            },
            {
                payload: {
                    event: 'log',
                    timestamp: Date.now(),
                    tags: [],
                    data: 'Hello, world.',
                    pid: 1234
                },
                validate: function (payload) {
                    if (payload && payload[0]) {
                        var line = payload.toString('utf8').split('\n')[0].split(' ');
                    }

                    Code.expect(line[0]).to.equal(this.payload.event);
                }
            },
            {
                payload: {
                    event: 'error',
                    timestamp: Date.now(),
                    url: 'http://localhost:8000/foo',
                    method: 'GET',
                    message: 'Error',
                    stack: 'stack',
                    pid: 1234
                },
                validate: function (payload) {
                    if (payload && payload[0]) {
                        var line = payload.toString('utf8').split('\n')[0].split(' ');
                        var eventName = line[0];
                        var columns = line[1];
                        var timestamp = line[2];
                    }

                    Code.expect(line.length).to.not.equal(1);
                    Code.expect(eventName).to.equal(this.payload.event);
                }
            }
        ];
        requests = 0;
        server = internals.createServer(function handler(req, reply) {
            var event;

            reply('ok');

            event = events[requests];

            Code.expect(req.payload).to.exist;
            event.validate(req.payload);

            requests += 1;
            if (requests === 4) {
                done();
            }
        });

        server.start(function () {
            reporter = new GoodInflux(server.info.uri, {
                threshold: 0,
                username: 'foo',
                password: 'bar',
                events: {
                    request: '*',
                    ops: '*',
                    log: '*',
                    error: '*'
                }
            });

            reporter.start(ee, function (err) {
                var request;

                Code.expect(err).to.not.exist;

                for (var i = 0; i < events.length; ++i) {
                    request = events[i];
                    ee.emit('report', request.payload.event, request.payload);
                }
            });
        });
    });

});


describe('stop()', function () {

    it('sends the remaining events when called', function (done) {
        var ee, requests, server, reporter;

        ee = new EventEmitter();
        requests = 0;
        server = internals.createServer(function handler(req, reply) {
            if (req.payload && req.payload[0]) {
                var line = req.payload.toString('utf8').split('\n')[0].split(' ');
                var eventName = line[0];
                var columns = line[1];
                var points = columns.split(',');
                var timestamp = line[2];
            }

            reply('ok');

            Code.expect(line.length).to.not.equal(1);

            Code.expect(columns).to.exist;

            Code.expect(points).to.exist;

            Code.expect(points[0].length).to.not.equal(1);

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
                Code.expect(err).to.not.exist;

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

});



