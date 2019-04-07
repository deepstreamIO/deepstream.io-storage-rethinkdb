const expect = require('chai').expect
const CacheConnector = require( '../src/connector' )
const EventEmitter = require( 'events' ).EventEmitter
const connectionParams = require( './connection-params' )

describe( 'the message connector has the correct structure', () =>  {
  var cacheConnector

  it( 'throws an error if required connection parameters are missing', () => {
    expect(() => { new CacheConnector( 'gibberish' ) }).to.throw()
  })

  it( 'creates the cacheConnector', ( done ) => {
    cacheConnector = new CacheConnector( {
      host: connectionParams.host,
      port: connectionParams.port,
      database: connectionParams.database + 2,
      primaryKey: 'own-primary-key'
    } )
    expect( cacheConnector.isReady ).to.equal( false )
    cacheConnector.on( 'ready', done )
    cacheConnector.on( 'error', ( error ) => {
      console.log( error )
    })
  })

  it( 'implements the cache/storage connector interface', () =>  {
    expect( typeof cacheConnector.name ).to.equal( 'string' )
    expect( typeof cacheConnector.version ).to.equal( 'string' )
    expect( typeof cacheConnector.get ).to.equal( 'function' )
    expect( typeof cacheConnector.set ).to.equal( 'function' )
    expect( typeof cacheConnector.delete ).to.equal( 'function' )
    expect( cacheConnector instanceof EventEmitter ).to.equal( true )
  })

  it( 'retrieves a non existing value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.equal( null )
      done()
    })
  })

  it( 'sets a value', ( done ) => {
    cacheConnector.set( 'someValue', { _d: { firstname: 'Wolfram' } }, ( error ) => {
      expect( error ).to.equal( null )
      done()
    })
  })

  it( 'retrieves an existing value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.deep.equal( { _d: { firstname: 'Wolfram' } } )
      done()
    })
  })

  it( 'updates an existing value', ( done ) => {
    cacheConnector.set( 'someValue', { _d: { firstname: 'Egon' } }, ( error ) => {
      expect( error ).to.equal( null )
      done()
    })
  })

  it( 'retrieves the updated value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.deep.equal( { _d : { firstname: 'Egon' } } )
      done()
    })
  })

  it( 'deletes a value', ( done ) => {
    cacheConnector.delete( 'someValue', ( error ) => {
      expect( error ).to.equal( null )
      done()
    })
  })

  it( 'Can\'t retrieve a deleted value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.equal( null )
      done()
    })
  })
})
