var rethinkdb = require( 'rethinkdb' );

var Connection = function( options, callback ) {
	this._options = options;
	this._callback = callback;
	this._connection = null;
	this._tables = [];
	this._database = options.database || 'deepstream';
	rethinkdb.connect( options, this._fn( this._onConnection ) );
};

Connection.prototype.get = function() {
	return this._connection;	
};

Connection.prototype.hasTable = function( table ) {
	return this._tables.indexOf( table ) !== -1;
};

Connection.prototype.refreshTables = function() {
	rethinkdb
		.tableList()
		.run( this._connection )
		.bind( this )
		.then( function( tables ){ this._tables = tables; });
};

Connection.prototype._onConnection = function( connection ) {
	this._connection = connection;
	rethinkdb.dbList().run( connection, this._fn( this._onDbList ) );
};

Connection.prototype._onDbList = function( dbList ) {
	if( dbList.indexOf( this._database ) === -1 ) {
		rethinkdb.dbCreate( this._database ).run( this._connection, this._fn( this._onDb ) );
	} else {
		this._onDb();
	}
};

Connection.prototype._onDb = function() {
	this._connection.use( this._database );
	rethinkdb.tableList().run( this._connection, this._fn( this._onTableList ) );
};

Connection.prototype._onTableList = function( tableList ) {
	this._tables = tableList;
	this._callback( null );
};

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