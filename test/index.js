'use strict';

const Code = require('@hapi/code');
const Stream = require('stream');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();
const GoodInflux = require('..');
const Hapi = require('@hapi/hapi');

const describe = lab.describe;
const it = lab.it;
const internals = {
    createServer: function (handler) {
        const server = new Hapi.Server({
          host: 'localhost',
          port: 0
        });

        server.route({
            method: 'POST',
            path: '/write',
            handler: handler
        });

        return server;
    },
    readStream() {
        const result = new Stream.Readable({ objectMode: true });
        result._read = () => {};
        return result;
    }
};


describe('arguments', () => {

  it('throws an error without new', () => {
    let error = "Class constructor GoodInflux cannot be invoked without 'new'";
    if (process.versions['node'].substring(0, 1) == '4' || process.versions['node'].substring(0, 1) == '5') {
      error = "Class constructors cannot be invoked without 'new'";
    }

    Code.expect(() => {
      const reporter = GoodInflux('http://www.github.com');
    }).to.throw(error);

  });


  it('throws an error when missing host', () => {

    Code.expect(() => {
      const reporter = new GoodInflux();
    }).to.throw('host must be a string');
  });


  it('allows credentials in the host', () => {

    Code.expect(() => {
      const reporter = new GoodInflux('http://user:pass@www.github.com');
    }).to.not.throw();
  });

});

describe('settings', () => {

  it('defaults to ms precision', () => {
    const reporter = new GoodInflux('localhost');
    const settings = reporter._settings;

    Code.expect(settings.precision).to.equal('ms');
  });

  it('sets to nanosecond precision', () => {
    const reporter = new GoodInflux('localhost', { precision: 'n' });
    const settings = reporter._settings;

    Code.expect(settings.precision).to.equal('n');
  });

  it('sets to hours precision', () => {
      const reporter = new GoodInflux('localhost', { precision: 'h' });
      const settings = reporter._settings;

      Code.expect(settings.precision).to.equal('h');
  });

});


describe('credentials', () => {

  it('extracts username and password', () => {
    const reporter = new GoodInflux('http://user:pass@github.com');
    const settings = reporter._settings;

    Code.expect(settings.username).to.not.exist;
    Code.expect(settings.password).to.not.exist;
    Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');
  });


  it('overrides username and password with host auth', () => {
    const reporter = new GoodInflux('http://user:pass@github.com', { username: 'foo', password: 'bar' });
    const settings = reporter._settings;

    Code.expect(settings.username).to.not.exist;
    Code.expect(settings.password).to.not.exist;
    Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');
  });


  it('allows username and password config options', () => {
    const reporter = new GoodInflux('http://github.com', { username: 'user', password: 'pass' });
    const settings = reporter._settings;

    Code.expect(settings.username).to.not.exist;
    Code.expect(settings.password).to.not.exist;
    Code.expect(settings.headers.Authorization).to.equal('Basic dXNlcjpwYXNz');
  });

});



describe('report', () => {

  it('honors the threshold setting and sends the events in a batch', () => {
    const stream = internals.readStream();
    const requests = 0;
    const server = internals.createServer(function handler(req, reply) {

      if (req.payload && req.payload[0]) {
        const line = req.payload.toString('utf8').split('\n')[0].split(' ');
        const eventName = line[0];
        const columns = line[1];
        const points = columns.split(',');
        const timestamp = line[2];
      }

      reply('ok');
      
      Code.expect(eventName).to.equal('log');
      
      Code.expect(columns).to.exist;
      Code.expect(columns.length).to.equal(10);
      
      Code.expect(points).to.exist;
      Code.expect(points.length).to.equal(1);
      
      requests += 1;
    });

    server.start(() => {
      const reporter = new GoodInflux(server.info.uri, {
        threshold: 5,
        username: 'foo',
        password: 'bar',
        events: {
          log: '*'
        }
      });
      
      stream.pipe(reporter);
      
      for (let i = 0; i < 10; ++i) {
        
        stream.emit('report', 'log', {
          event: 'log',
          time: Date.now(),
          data: 'this is data for item ' + i
        });
      }
    });
  });


  it('sends each event individually if threshold is 0', () => {
    const stream = internals.readStream();
    const requests = 0;
    const server = internals.createServer(function handler(req, reply) {
      if (req.payload && req.payload[0]) {
        const line = req.payload.toString('utf8').split('\n')[0].split(' ');
        const eventName = line[0];
        const columns = line[1];
        const points = columns.split(',');
      }

      reply('ok');

      Code.expect(eventName).to.equal('log');

      Code.expect(columns).to.exist;
      Code.expect(columns.length).to.equal(10);

      Code.expect(points).to.exist;
      Code.expect(points.length).to.equal(1);

      
    });

    server.start(() => {
      const reporter = new GoodInflux(server.info.uri, {
        threshold: 0,
        username: 'foo',
        password: 'bar',
        events: {
          log: '*'
        }
      });
      
      stream.pipe(reporter);
      
      for (var i = 0; i < 10; ++i) {
        stream.emit('report', 'log', {
          event: 'log',
          time: Date.now(),
          data: 'this is data for item ' + i
        });
      }
    });
  });


  // TODO: Support ANY event
  it('recognizes misc events', () => {
    const stream = internals.readStream();
    const requests = 0;
    const server = internals.createServer(function handler(req, reply) {
      if (req.payload && req.payload[0]) {
        const line = req.payload.toString('utf8').split('\n')[0].split(' ');
        const eventName = line[0];
        const columns = line[1];
        const points = columns.split(',');
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
    });
    
    server.start(() => {
      const reporter = new GoodInflux(server.info.uri, {
        threshold: 0,
        username: 'foo',
        password: 'bar',
        events: {
          log: '*',
          foo: '*'
        }
      });
      
      stream.pipe(reporter);
      
      for (var i = 0; i < 10; ++i) {
        if (i % 2) {
          if (i === 1) {
            stream.emit('report', 'foo', {
              event: 'foo',
              timestamp: Date.now(),
              data: 'bar',
              object: { foo: 'bar' },
              when: new Date(),
              labels: ['a', 'b', 'c']
            });
          } else {
            stream.emit('report', 'foo', {
              event: 'foo',
              data: 'bar',
              object: { foo: 'bar' },
              when: new Date(),
              labels: ['a', 'b', 'c']
            });
          }
        } else {
          stream.emit('report', 'log', {
            event: 'log',
            timestamp: Date.now(),
            data: 'this is data for item ' + i
          });
        }
      }
    });
  });
  

  it('maps request, ops, log, and error events', () => {
        const stream = internals.readStream();
        const events = [
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
                    if (payload && payload[0]) {
                        const line = payload.toString('utf8').split('\n')[0].split(' ');
                        const eventName = line[0];
                        const columns = line[1];
                    }

                    const idx = columns.indexOf('remoteIp');

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
                    if (payload && payload[0]) {
                        const line = payload.toString('utf8').split('\n')[0].split(' ');
                        const eventName = line[0];
                        const columns = line[1];
                    }

                    const idx = columns.indexOf('remoteIp');

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
                        const line = payload.toString('utf8').split('\n')[0].split(' ');
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
                        const line = payload.toString('utf8').split('\n')[0].split(' ');
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
                        const line = payload.toString('utf8').split('\n')[0].split(' ');
                        const eventName = line[0];
                        const columns = line[1];
                        const timestamp = line[2];
                    }

                    Code.expect(line.length).to.not.equal(1);
                    Code.expect(eventName).to.equal(this.payload.event);
                }
            }
        ];
        const requests = 0;
        const server = internals.createServer(function handler(req, reply) {
            reply('ok');

            const event = events[requests];

            Code.expect(req.payload).to.exist;
            event.validate(req.payload);

            requests += 1;
        });

        server.start(() => {
            const reporter = new GoodInflux(server.info.uri, {
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

            stream.pipe(reporter);

            for (var i = 0; i < events.length; ++i) {
                const request = events[i];
                stream.emit('report', request.payload.event, request.payload);
            }
        });
    });

});


describe('stop()', () => {

    it('sends the remaining events when called', () => {
        const stream = internals.readStream();
        const requests = 0;
        const server = internals.createServer(function handler(req, reply) {
            if (req.payload && req.payload[0]) {
                const line = req.payload.toString('utf8').split('\n')[0].split(' ');
                const eventName = line[0];
                const columns = line[1];
                const points = columns.split(',');
                const timestamp = line[2];
            }

            reply('ok');

            Code.expect(line.length).to.not.equal(1);
            Code.expect(columns).to.exist;
            Code.expect(points).to.exist;
            Code.expect(points[0].length).to.not.equal(1);
        });

        server.start(() => {
            const reporter = new GoodInflux(server.info.uri, {
                threshold: 6,
                username: 'foo',
                password: 'bar',
                events: {
                    log: '*'
                }
            });

            stream.pipe(reporter);

            for (var i = 0; i < 5; ++i) {
                stream.emit('report', 'log', {
                    event: 'log',
                    timestamp: Date.now(),
                    data: 'this is data for item ' + i
                });
            }
        });
    });

});
