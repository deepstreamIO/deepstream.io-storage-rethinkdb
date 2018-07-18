/* global describe, expect, it, jasmine */
'use strict'

const expect = require('chai').expect

const CacheConnector = require('../src/connector')
const connectionParams = require('./connection-params')

describe('It can recover from a lost connection', () => {
    var cacheConnector
    it('creates the cacheConnector', (done) => {
        const cp = Object.assign({}, connectionParams);
        cp.reconnectCount = 1
        cp.reconnectTimeout = 100
        cacheConnector = new CacheConnector(cp)
        expect(cacheConnector.isReady).to.equal(false)
        cacheConnector.on('ready', done)
        cacheConnector.on('error', (error) => {
            console.log(error)
        })
    })

    it('shuts down connection then trying to write', (done) => {
        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(() => {
            cacheConnector.set('someValue', {
                _d: {
                    firstname: 'Wolfram'
                }
            }, (error) => {
                expect(error).to.equal(null)
                done()
            })
        })
    })

    it('shuts down connection then trying to read', (done) => {
        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(() => {
            cacheConnector.get('someValue', (error, value) => {
                expect(error).to.equal(null)
                expect(value).to.deep.equal({
                    _d: {
                        firstname: 'Wolfram'
                    }
                })
                done()
            })
        })
    })

    it('shuts down connection then trying to delete', (done) => {
        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(() => {
            cacheConnector.get('someValue', (error, value) => {
                cacheConnector.delete('someValue', (error) => {
                    expect(error).to.equal(null)

                    cacheConnector.get('someValue', (error, value) => {
                        expect(error).to.equal(null)
                        expect(value).to.equal(null)
                        done()
                    })
                })
            })
        })
    })

    it('should not reconnect if there is no reconnect count defined', (done) => {
        // The original connectionParams has no reconnectCount
        let cc = new CacheConnector(connectionParams)
        cc.on('ready', () => {
            cc._connection._connection.close({
                noreplyWait: true
            }).then(() => {
                cc.set('someValue', {
                    _d: {
                        firstname: 'Wolfram'
                    }
                }, (error) => {
                    expect(error.msg).to.equal('Connection is closed.')
                    done()
                })
            })
        })
    })

    it('should not report error if the desired reconnection exceeded', (done) => {
        const cp = Object.assign({}, connectionParams);
        cp.reconnectCount = 0
        let cc = new CacheConnector(cp)
        cc.on('ready', () => {
            cc._connection._connection.close({
                noreplyWait: true
            }).then(() => {
                cc.set('someValue', {
                    _d: {
                        firstname: 'Wolfram'
                    }
                }, (error) => {
                    expect(error.msg).to.equal('Connection is closed.')
                    done()
                })
            })
        })
    })

    it('should handle the default timeout', (done) => {
        const cp = Object.assign({}, connectionParams);
        cp.reconnectCount = 1
        let cc = new CacheConnector(cp)
        cc.on('ready', () => {
            cc._connection._connection.close({
                noreplyWait: true
            }).then(() => {
                cc.set('someValue', {
                    _d: {
                        firstname: 'Wolfram'
                    }
                }, (error) => {
                    expect(error).to.equal(null)
                    done()
                })
            })
        })
    }).timeout(3000)
})