/* global describe, expect, it, jasmine */
var CacheConnector = require( '../src/connector' ),
	rethinkdb = require( 'rethinkdb' ),
	EventEmitter = require( 'events' ).EventEmitter,
	connectionParams = require( './connection-params' ),
	settings = { port: connectionParams.port, host: connectionParams.host, splitChar: '/', defaultTable: 'dsTestDefault' },
	MESSAGE_TIME = 20;

describe( 'it distributes records between multiple tables', function(){
	var cacheConnector,
		conn;
	
	it( 'creates the cacheConnector', function( done ){
		cacheConnector = new CacheConnector( settings );
		expect( cacheConnector.isReady ).toBe( false );
		cacheConnector.on( 'ready', done );
		cacheConnector.on( 'error', function( error ){
			console.log( error );
		});
	});
	
	it( 'deletes dsTestA', function( done ){
		conn = cacheConnector._connection.get();
		rethinkdb.tableDrop( 'dsTestA' ).run(conn, function(){ done(); });
	});
	
	it( 'deletes dsTestB', function( done ){
		rethinkdb.tableDrop( 'dsTestB' ).run(conn, function(){ done(); } );
	});	
	
	it( 'deletes dsTestB', function( done ){
		rethinkdb.tableDrop( 'dsTestDefault' ).run(conn, function(){ done(); } );
	});
	
	it( 'resets the table cache', function(done) {
		cacheConnector._tableManager.refreshTables();
		setTimeout( done, 50 );
	});
	
	it( 'doesn\'t have dsTestA or dsTestB', function( done ){
		rethinkdb.tableList().run(conn, function( err, tableList ){
			expect( err ).toBe( null );
			expect( tableList.indexOf( 'dsTestA' ) ).toBe( -1 );
			expect( tableList.indexOf( 'dsTestB' ) ).toBe( -1 );
			expect( tableList.indexOf( 'dsTestDefault' ) ).toBe( -1 );
			done();
		});
	});
	
	it( 'sets a value for tableA', function(done) {
		cacheConnector.set( 'dsTestA/valueA', { isIn: 'tableA' }, done );
	});
	
	it( 'has created tableA', function(done) {
		rethinkdb.tableList().run(conn, function( err, tableList ){
			expect( err ).toBe( null );
			expect( tableList.indexOf( 'dsTestA' ) ).not.toBe( -1 );
			done();
		});
	});
	
	it( 'has written the record to tableA', function(done) {
		rethinkdb
			.table( 'dsTestA' )
			.run( conn )
			.then(function( cursor ){
				return cursor.toArray();
			})
			.then(function( entries ){
				expect( entries.length ).toBe( 1 );
				expect( entries ).toEqual( [ { ds_id: 'valueA', isIn: 'tableA' } ] );
				done();
			});
	});
	
	it( 'sets a value for tableB', function(done) {
		cacheConnector.set( 'dsTestB/valueB', { isIn: 'tableB' }, done );
	});
	
	it( 'has created tableB', function(done) {
		rethinkdb.tableList().run(conn, function( err, tableList ){
			expect( err ).toBe( null );
			expect( tableList.indexOf( 'dsTestB' ) ).not.toBe( -1 );
			done();
		});
	});
	
	it( 'has written the record to tableA', function(done) {
		rethinkdb
			.table( 'dsTestB' )
			.run( conn )
			.then(function( cursor ){
				return cursor.toArray();
			})
			.then(function( entries ){
				expect( entries.length ).toBe( 1 );
				expect( entries ).toEqual( [ { ds_id: 'valueB', isIn: 'tableB' } ] );
				done();
			});
	});
	
	it( 'sets a value without a table', function(done) {
		cacheConnector.set( 'someValue', { isIn: 'default' }, done );
	});
	
	it( 'has created the defaultTable', function(done) {
		rethinkdb.tableList().run(conn, function( err, tableList ){
			expect( err ).toBe( null );
			expect( tableList.indexOf( 'dsTestDefault' ) ).not.toBe( -1 );
			done();
		});
	});
	
	it( 'has written the record to tableA', function(done) {
		rethinkdb
			.table( 'dsTestDefault' )
			.run( conn )
			.then(function( cursor ){
				return cursor.toArray();
			})
			.then(function( entries ){
				expect( entries.length ).toBe( 1 );
				expect( entries ).toEqual( [ { ds_id: 'someValue', isIn: 'default' } ] );
				done();
			});
	});


	it( 'creates and immediatly updates a value for a new table', function( done ){
		var firstInsertionComplete = false;

		cacheConnector.set( 'dsTestC/someTest', { state: 'A' }, function( error ){
			expect( firstInsertionComplete ).toBe( false );
			expect( error ).toBe( null );
			firstInsertionComplete = true;
		});

		cacheConnector.set( 'dsTestC/someTest', { state: 'B' }, function( error ){
			expect( firstInsertionComplete ).toBe( true );
			expect( error ).toBe( null );

			cacheConnector.get( 'dsTestC/someTest', function( error, value ){
				expect( error ).toBe( null );
				expect( value ).toEqual({ state: 'B' });
				done();
			});
		});
	});
});