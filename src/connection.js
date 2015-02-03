var rethinkdb = require( 'rethinkdb' );

/**
 * This class provides a wrapper around the rethinkdb connection. It creates
 * the database - if it doesn't exist - and maintains a cache of all available
 * tables to decrease lookup times for write operations
 *
 * @param {Object}   options  {database: <String>} + RethinkDB connect options (http://rethinkdb.com/api/javascript/#connect)
 * @param {Function} callback function that will be called once the conenctions has been established and the database had been created
 *
 * @constructor
 */
var Connection = function( options, callback ) {
	this._options = options;
	this._callback = callback;
	this._connection = null;
	this._tables = [];
	this._database = options.database || 'deepstream';
	rethinkdb.connect( options, this._fn( this._onConnection ) );
};

/**
 * Returns the underlying rethinkdb connection
 *
 * @public
 * @returns {RethinkDB Connection} connection
 */
Connection.prototype.get = function() {
	return this._connection;	
};

/**
 * Checks if a specific table name exists. The list of tables is retrieved
 * on initialisation and can be updated at runtime using refreshTables
 *
 * @param   {String}  table the name of the table
 *
 * @public
 * @returns {Boolean} hasTable
 */
Connection.prototype.hasTable = function( table ) {
	return this._tables.indexOf( table ) !== -1;
};

/**
 * Called whenever the list of tables has gotten out of sync. E.g. after
 * receiving a "table exists"
 *
 * @public
 * @returns {void}
 */
Connection.prototype.refreshTables = function() {
	rethinkdb
		.tableList()
		.run( this._connection )
		.bind( this )
		.then( function( tables ){ this._tables = tables; });
};

/**
 * Callback for established connections. Retrieves the list
 * of available databases
 *
 * @param   {RethinkDB Connection} connection
 *
 * @private
 * @returns {void}
 */
Connection.prototype._onConnection = function( connection ) {
	this._connection = connection;
	rethinkdb.dbList().run( connection, this._fn( this._onDbList ) );
};

/**
 * Callback for retrieved database lists. Will check if the deepstream
 * database exists and - if not - create it.
 *
 * @param   {Array} dbList 	A list of all available databases
 *
 * @private
 * @returns {void}
 */
Connection.prototype._onDbList = function( dbList ) {
	if( dbList.indexOf( this._database ) === -1 ) {
		rethinkdb.dbCreate( this._database ).run( this._connection, this._fn( this._onDb ) );
	} else {
		this._onDb();
	}
};

/**
 * Callback once the database becomes available, either as a result of a create operation
 * or because it already existed.
 *
 * Will retrieve a list of tables from the database
 *
 * @private
 * @returns {void}
 */
Connection.prototype._onDb = function() {
	this._connection.use( this._database );
	rethinkdb.tableList().run( this._connection, this._fn( this._onTableList ) );
};

/**
 * Callback for retrieved table lists. This marks the final step
 * in establishing a connection
 *
 * @param   {Array} tableList   A list of tablenames
 *
 * @private
 * @returns {void}
 */
Connection.prototype._onTableList = function( tableList ) {
	this._tables = tableList;
	this._callback( null );
};

/**
 * Utility method. Wraps a function into another function
 * that has the right context and handles errors. Gets around
 * the endless if( error !== null ) {...}
 *
 * @param   {Function} fn 
 *
 * @private
 * @returns {Function}
 */
Connection.prototype._fn = function( fn ) {
	return function( error, result ) {
		if( error ) {
			this._callback( error );
		} else {
			fn.call( this, result );
		}
	}.bind( this );
};

module.exports = Connection;