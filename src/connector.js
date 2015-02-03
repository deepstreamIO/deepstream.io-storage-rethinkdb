var events = require( 'events' ),
	util = require( 'util' ),
	rethinkdb = require( 'rethinkdb' ),
	Connection = require( './connection' ),
	Insertion = require( './insertion' ),
	pckg = require( '../package.json' ),
	PRIMARY_KEY = 'ds_id';

/**
 * Connects deepstream to a rethinkdb. RethinksDB is a great fit for deepstream due to its realtime capabilities.
 *
 * Similar to other storage connectors (e.g. MongoDB), this connector supports saving records to multiple tables.
 * In order to do this, specify a splitChar, e.g. '/' and use it in your record names. Naming your record
 *
 * user/i4vcg5j1-16n1qrnziuog
 *
 * for instance will create a user table and store it in it. This will allow for more sophisticated queries as
 * well as speed up read operations since there are less entries to look through
 *
 * @param {Object} options rethinkdb driver options. See rethinkdb.com/api/javascript/#connect
 * 
 * e.g.
 * 
 * { 
 *	   host: 'localhost',
 *	   port: 28015,
 *	   db: 'marvel',
 *	   authKey: 'hunter2' 
 *     database: 'deepstream', 
 *	   defaultTable: 'deepstream_records',
 *	   splitChar: '/'
 * }
 *
 * Please note the three additional, optional keys:
 * 
 * database 	specifies which database to use. Defaults to 'deepstream'
 * defaultTable specifies which table records will be stored in that don't specify a table. Defaults to deepstream_records
 * splitChar 	specifies a character that separates the record's id from the table it should be stored in. defaults to null
 * 
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
 * Writes a value to the database.
 *
 * @param {String}   key
 * @param {Object}   value
 * @param {Function} callback Will be called with null for successful set operations or with an error message string
 *
 * @public
 * @returns {void}
 */
Connector.prototype.set = function( key, value, callback ) {
	new Insertion( this._getParams( key ), value, callback, this._connection );
};

/**
 * Retrieves a value from the cache
 *
 * @param {String}   key
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @public
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
 * @public
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

/**
 * Callback for established connections
 *
 * @param   {Error} error
 *
 * @private
 * @returns {void}
 */
Connector.prototype._onConnection = function( error ) {
	if( error ) {
		this.emit( 'error', error );
	}
	else {
		this.isReady = true;
		this.emit( 'ready' );
	}
};

/**
 * Parses the provided record name and returns an object
 * containing a table name and a record name
 *
 * @param   {String} key the name of the record
 *
 * @private
 * @returns {Object} params
 */
Connector.prototype._getParams = function( key ) {
	var parts = key.split( this._splitChar );
	
	if( parts.length === 2 ) {
		return { table: parts[ 0 ], id: parts[ 1 ] };
	} else {
		return { table: this._defaultTable, id: key };
	}
};

/**
 * Makes sure that the options object contains all mandatory
 * settings
 *
 * @param   {Object} options
 *
 * @private
 * @returns {void}
 */
Connector.prototype._checkOptions = function( options ) {
	if( typeof options.host !== 'string' ) {
		throw new Error( 'Missing option host' );
	}
	if( typeof options.port !== 'number' ) {
		throw new Error( 'Missing option port' );
	}
};

module.exports = Connector;