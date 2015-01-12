/* global describe, expect, it, jasmine */
var CacheConnector = require( '../src/cache-connector' ),
	EventEmitter = require( 'events' ).EventEmitter,
	settings = { port: 6379, host: 'localhost' },
	MESSAGE_TIME = 20;

describe( 'the message connector has the correct structure', function(){
	var cacheConnector;
	it( 'throws an error if required connection parameters are missing', function(){
		expect(function(){ new CacheConnector( 'gibberish' ); }).toThrow();
	});
	
	it( 'creates the cacheConnector', function( done ){
		cacheConnector = new CacheConnector( settings );
		expect( cacheConnector.isReady ).toBe( false );
		cacheConnector.on( 'ready', done );
	});
	
	it( 'implements the cache/storage connector interface', function() {
	    expect( typeof cacheConnector.name ).toBe( 'string' );
	    expect( typeof cacheConnector.version ).toBe( 'string' );
	    expect( typeof cacheConnector.get ).toBe( 'function' );
	    expect( typeof cacheConnector.set ).toBe( 'function' );
	    expect( typeof cacheConnector.delete ).toBe( 'function' );
	    expect( cacheConnector instanceof EventEmitter ).toBe( true );
	});
	
	it( 'retrieves a non existing value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toBe( null );
			done();
		});
	});
	
	it( 'sets a value', function( done ){
		cacheConnector.set( 'someValue', { firstname: 'Wolfram' }, function( error ){
			expect( error ).toBe( null );
			done();
		});
	});
	
	it( 'retrieves an existing value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toEqual( { firstname: 'Wolfram' } );
			done();
		});
	});
	
	it( 'deletes a value', function( done ){
		cacheConnector.delete( 'someValue', function( error ){
			expect( error ).toBe( null );
			done();
		});
	});
	
	it( 'Can\'t retrieve a deleted value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toBe( null );
			done();
		});
	});
});