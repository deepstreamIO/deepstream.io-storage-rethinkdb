/* global describe, expect, it, jasmine */
'use strict'

const expect = require('chai').expect
const {
    Subject,
    pipe
} = require('rxjs')

const {
    take
} = require('rxjs/operators')

const CacheConnector = require('../src/connector')
const connectionParams = require('./connection-params')

describe('It can recover from a lost connection', () => {
    var cacheConnector

    const data = {
        _d: {
            firstname: 'Wolfram'
        }
    }

    it('creates the cacheConnector', (done) => {
        const cp = Object.assign({}, connectionParams);
        cp.reconnectCount = 3
        cp.reconnectTimeout = 1000
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
        }).then(cacheConnector.set('someValue', data, (error) => {
            expect(error.msg).to.equal("Connection is closed.")
            setTimeout(() => cacheConnector.set('someValue', data, (error) => {
                expect(error).to.equal(null)
                done()
            }), 1500)
        }))
    }).timeout(3000)

    it('shuts down connection then trying to read', (done) => {
        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(cacheConnector.get('someValue', (error) => {
            expect(error.msg).to.equal("Connection is closed.")
            setTimeout(() => cacheConnector.get('someValue', (error, value) => {
                expect(error).to.equal(null)
                expect(value).to.deep.equal(data)
                done()
            }), 1500)
        }))
    }).timeout(3000)

    it('shuts down connection then trying to delete', (done) => {
        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(cacheConnector.delete('someValue', (error) => {
            expect(error.msg).to.equal("Connection is closed.")
            setTimeout(() => cacheConnector.delete('someValue', (err) => {
                expect(err).to.equal(null)

                cacheConnector.get('someValue', (e, value) => {
                    expect(e).to.equal(null)
                    expect(value).to.equal(null)
                    done()
                })
            }), 1500)
        }))
    }).timeout(3000)

    // it('shuts down connection then trying to write', (done) => {
    //     let x = () => {
    //         cacheConnector.set('someValue', {
    //             _d: {
    //                 firstname: 'Wolfram'
    //             }
    //         }, (error) => {
    //             setTimeout(x, 1000)
    //             console.log(error)
    //         })
    //     }

    //     x()
    // }).timeout(0)

    it('should not reconnect if there is no reconnect count defined', (done) => {
        // The original connectionParams has no reconnectCount
        let cc = new CacheConnector(connectionParams)
        cc.on('ready', () => {
            cc._connection._connection.close({
                noreplyWait: true
            }).then(() => {
                cc.set('someValue', data, (error) => {
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
                cc.set('someValue', data, (error) => {
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
                cc.set('someValue', data, (error) => {
                    expect(error.msg).to.equal("Connection is closed.")
                    setTimeout(() => cc.set('someValue', data, (error) => {
                        expect(error).to.equal(null)
                        done()
                    }), 2500)
                })
            })
        })
    }).timeout(3000)

    it('should handle parallel operations as well', (done) => {
        let subj$ = new Subject()
        subj$.pipe(take(4)).subscribe(undefined, undefined, done)

        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(() => {
            cacheConnector.get('someValue', (error) => {
                expect(error.msg).to.equal("Connection is closed.")
                subj$.next()
            })
            cacheConnector.set('someValue', data, (error) => {
                expect(error.msg).to.equal("Connection is closed.")
                subj$.next()
            })

            setTimeout(() => {
                cacheConnector.get('someValue', (error) => {
                    expect(error).to.equal(null)
                    subj$.next()
                })
                cacheConnector.set('someValue', data, (error) => {
                    expect(error).to.equal(null)
                    subj$.next()
                })
            }, 1500)
        })
    }).timeout(3000)

    it('should be be able to reconnect multiple times', (done) => {
        let subj$ = new Subject()
        subj$.pipe(take(4)).subscribe(undefined, undefined, done)

        cacheConnector._connection._connection.close({
            noreplyWait: true
        }).then(() => {
            cacheConnector.get('someValue', (error) => {
                expect(error.msg).to.equal("Connection is closed.")
                subj$.next()
            })

            setTimeout(() => {
                cacheConnector.get('someValue', (error) => {
                    expect(error).to.equal(null)
                    subj$.next()

                    cacheConnector._connection._connection.close({
                            noreplyWait: true
                        })
                        .then(() => {
                            cacheConnector.get('someValue', (error) => {
                                expect(error.msg).to.equal("Connection is closed.")
                                subj$.next()
                            })

                            setTimeout(() => {
                                cacheConnector.get('someValue', (error) => {
                                    expect(error).to.equal(null)
                                    subj$.next()
                                })
                            }, 1500)
                        })
                })
            }, 1500)
        })
    }).timeout(4000)
})