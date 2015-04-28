var rethinkdb = require( 'rethinkdb' ),
	PRIMARY_KEY = 'ds_id';

/**
 * This class represents a single write operation to rethinkdb. The complexity comes
 * from the optional table creation. The workflow goes as follows:
 *
 * If the table the entry should be stored in exists
 * 		write the entry
 * else
 * 		create the table
 * 		write the entry
 *
 * 		if createTable complains that the table exists
 * 			tell the connection to update its table list
 *
 * @param {Object}   params     Map with {table: <String>, id: <String>}
 * @param {Object}   value      The value to be written
 * @param {Function} callback   The method that will be called once the insertion is complete
 * @param {Connection}  connection The rethinkdb connection wrapper
 *
 * @constructor
 */
var Insertion = function( params, value, callback, connection ) {
	this._params = params;
	this._value = value;
	this._value[ PRIMARY_KEY ] = this._params.id;
	this._callback = callback;
	this._connection = connection;
	this._tableOptions = { primaryKey: PRIMARY_KEY, durability: 'soft' };
	
	this._start();
};

/**
 * Kicks the insertion off. Checks the cached list of tables and creates
 * the table if needed
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._start = function() {
	if( this._connection.hasTable( this._params.table ) ) {
		this._insert();
	} else {
		this._createTable();
	}
};

/**
 * Writes value to the table in rethinkdb
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._insert = function() {
	rethinkdb
		.table( this._params.table )
		.insert( this._value )
		.run( this._connection.get(), this._onComplete.bind( this ) );
};

/**
 * Callback for succesfull insertions
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._onComplete = function( error ) {
	this._callback( error );
	this._destroy();
};

/**
 * Creates the table if it doesn't exist yet
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._createTable = function() {
	rethinkdb
		.tableCreate( this._params.table, this._tableOptions )
		.run( this._connection.get(), this._onTableCreated.bind( this ) );
};

/**
 * Callback for tableCreate. If an error is received and it is a "table already exists"
 * error, tell the connection to refresh its table-cache, otherwise propagate the error
 *
 * If everything worked, insert the entry
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._onTableCreated = function( error ) {
	if( error && this._isTableExistsError( error ) === false ) {
		this._callback( error );
		this._destroy();
	} else {
		this._connection.refreshTables();
		this._insert();
	}
};

/**
 * If tableCreate is called for an existing table, rethinkdb returns a
 * RqlRuntimeError. This error unfortunately doesn't come with a code or constant to check
 * its type, so this method tries to parse its error message instead
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._isTableExistsError = function( error ) {
	return error.msg.indexOf( 'already exists' ) !== -1;
};

/*
 * Destoys the instance after the insertion completed
 *
 * @private
 * @returns {void}
 */
Insertion.prototype._destroy = function() {
	this._params = null;
	this._value = null;
	this._callback = null;
	this._connection = null;
};

module.exports = Insertion;