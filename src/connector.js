var events = require( 'events' ),
	util = require( 'util' ),
	rethinkdb = require( 'rethinkdb' ),
	Connection = require( './connection' ),
	pckg = require( '../package.json' ),
	PRIMARY_KEY = 'ds_id';

/*
 * @param {Object} options rethinkdb driver options. See http://www.rethinkdb.com/api/javascript/
 * 
 * e.g.
 * 
 * { 
 *	host: 'localhost',
 *	port: 28015,
 *	db: 'marvel',
 *	authKey: 'hunter2' 
 *
 *	// Optional database
 * database: <String>,
 *    // Optional: Collections for items without a splitChar or if no splitChar is specified. Defaults to 'deepstream_records'
 	 defaultTable: <String>,
 	 
 	 // Optional: A char that seperates the collection name from the document id. Defaults to null
 	 splitChar: <String>
 	 
   }
 * @constructor
 */
var Connector = function( options ) {
	this.isReady = false;
	this.name = pckg.name;
	this.version = pckg.version;
	this._checkOptions( options );
	this._options = options;
	this._connection = new Connection( options, this._onConnection.bind( this ) );
	this._defaultTable = options.defaultTable || 'deepstream_records';
	this._splitChar = options.splitChar || null;
};

util.inherits( Connector, events.EventEmitter );

/**
 * Writes a value to the cache.
 *
 * @param {String}   key
 * @param {Object}   value
 * @param {Function} callback Should be called with null for successful set operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.set = function( key, value, callback ) {
	var params = this._getParams( key ),
		tableOptions = { primaryKey: PRIMARY_KEY, durability: 'soft' },
		insert = function() {
			rethinkdb.table( params.table ).insert( value ).run( this._connection.get(), callback );
		}.bind( this );
	
	value[ PRIMARY_KEY ] = params.id;
	
	if( this._connection.hasTable( params.table ) ) {
		insert();
	} else {
		rethinkdb.tableCreate( params.table, tableOptions ).run( this._connection.get(), function( error ){
			if( error ) {
				if( error.msg.indexOf( 'already exists' ) === -1 ) {
					callback( error );
				} else {
					this._connection.refreshTables();
					insert();
				}
			} else {
				insert();
			}
		});
	}
};

/**
 * Retrieves a value from the cache
 *
 * @param {String}   key
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.get = function( key, callback ) {
	var params = this._getParams( key );
	
	if( this._connection.hasTable( params.table ) ) {
		rethinkdb.table( params.table ).get( params.id ).run( this._connection.get(), function( error, entry ){
			if( entry ) {
				delete entry[ PRIMARY_KEY ];
			}
			callback( error, entry );
		});
	} else {
		callback( null, null );
	}
};

/**
 * Deletes an entry from the cache.
 *
 * @param   {String}   key
 * @param   {Function} callback Will be called with null for successful deletions or with
 *                     an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.delete = function( key, callback ) {
	var params = this._getParams( key );
	
	if( this._connection.hasTable( params.table ) ) {
		rethinkdb.table( params.table ).get( params.id ).delete().run( this._connection.get(), callback );
	} else {
		callback( new Error( 'Table \'' + params.table + '\' does not exist' ) );
	}
};

Connector.prototype._onConnection = function( error ) {
	if( error ) {
		this.emit( 'error', error );
	}
	else {
		this.isReady = true;
		this.emit( 'ready' );
	}
};

Connector.prototype._getParams = function( key ) {
	var parts = key.split( this._splitChar );
	
	if( parts.length === 2 ) {
		return { table: parts[ 0 ], id: parts[ 1 ] };
	} else {
		return { table: this._defaultTable, id: key };
	}
};

Connector.prototype._checkOptions = function( options ) {
	if( typeof options.host !== 'string' ) {
		throw new Error( 'Missing option host' );
	}
	if( typeof options.port !== 'number' ) {
		throw new Error( 'Missing option port' );
	}
};

module.exports = Connector;