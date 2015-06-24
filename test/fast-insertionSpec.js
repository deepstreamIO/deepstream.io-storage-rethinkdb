/* global describe, expect, it, jasmine */
var StorageConnector = require( '../src/connector' ),
	connectionParams = require( './connection-params' ),
	rethinkdb = require( 'rethinkdb' ),
	settings = { port: connectionParams.port, host: connectionParams.host, splitChar: '/', defaultTable: 'dsTestDefault' },
	MESSAGE_TIME = 50;

describe( 'Is able to insert a larger number of values in quick succession', function(){
	var storageConnector,
		conn;
	
	it( 'creates the storageConnector', function( done ){
		storageConnector = new StorageConnector( settings );
		expect( storageConnector.isReady ).toBe( false );
		storageConnector.on( 'ready', done );
		storageConnector.on( 'error', function( error ){
			console.log( error );
		});
	});
	
    it( 'inserts 20 values in quick succession', function( done ){
        var expected = 20;
        var completed = 0;
        
        var callback = function( err ) {
            completed++;
            expect( err ).toBe( null );
            
            if( expected === completed ) {
                done();
            }
        };
        
        expect(function(){
             for( var i = 0; i < expected; i++ ) {
                storageConnector.set( 'quickInsertTestTable/key' + i, { testVal: i }, callback );
            }
        }).not.toThrow();
        expect( storageConnector._tableManager._eventEmitter.listeners( 'quickInsertTestTable' ).length ).toBe( 20 );
    });
    
    it( 'does not have leftover listeners', function(){
        expect( storageConnector._tableManager._eventEmitter.listeners( 'quickInsertTestTable' ).length ).toBe( 0 );
    });
    
    it( 'deletes dsTestA', function( done ){
		conn = storageConnector._connection.get();
		rethinkdb.tableDrop( 'quickInsertTestTable' ).run(conn, function(){ done(); });
	});
});

