const expect = require('chai').expect
const StorageConnector = require( '../src/connector' )
const connectionParams = require( './connection-params' )
const rethinkdb = require( 'rethinkdb' )
const settings = {
  port: connectionParams.port,
  host: connectionParams.host,
  splitChar: '/',
  defaultTable: 'dsTestDefault',
  database: 'deepstream_storage_provider_test'
}
var storageConnector

describe( 'Is able to insert a larger number of values in quick succession', () => {

  it( 'creates the storageConnector', ( done ) => {
    storageConnector = new StorageConnector( settings )
    expect( storageConnector.isReady ).to.equal( false )
    storageConnector.on( 'ready', done )
    storageConnector.on( 'error', ( error ) => {
      console.log( error )
    })
  })

  it( 'inserts 20 values in quick succession', ( done ) => {

    var expected = 20
    var completed = 0

    var callback = ( err ) =>  {
      completed++
      expect( err ).to.equal( null )

      if( expected === completed ) {
        done()
      }
    }

    expect(() => {
      for( var i = 0; i < expected; i++ ) {
        storageConnector.set( 'quickInsertTestTable/key' + i, { _d: { testVal: i } }, callback )
      }
    }).not.to.throw()
    expect( storageConnector._tableManager._eventEmitter.listeners( 'quickInsertTestTable' ).length ).to.equal( 20 )
  })

  it( 'does not have leftover listeners', () => {
    expect( storageConnector._tableManager._eventEmitter.listeners( 'quickInsertTestTable' ).length ).to.equal( 0 )
  })

  it( 'deletes dsTestA', ( done ) => {
    const conn = storageConnector._connection.get()
    rethinkdb.tableDrop( 'quickInsertTestTable' ).run(conn, () => { done() } )
  })
})

