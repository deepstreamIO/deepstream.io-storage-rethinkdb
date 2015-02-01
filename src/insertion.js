var rethinkdb = require( 'rethinkdb' ),
	PRIMARY_KEY = 'ds_id';

var Insertion = function( params, value, callback, connection ) {
	
	this._params = params;
	this._value = value;
	this._value[ PRIMARY_KEY ] = this._params.id;
	this._callback = callback;
	this._connection = connection;
	this._tableOptions = { primaryKey: PRIMARY_KEY, durability: 'soft' };
	
	this._start();
};

Insertion.prototype._start = function() {
	if( this._connection.hasTable( this._params.table ) ) {
		this._insert();
	} else {
		this._createTable();
	}
};

Insertion.prototype._insert = function() {
	rethinkdb
		.table( this._params.table )
		.insert( this._value )
		.run( this._connection.get(), this._onComplete.bind( this ) );
};

Insertion.prototype._onComplete = function( error ) {
	this._callback( error );
	this._destroy();
};

Insertion.prototype._createTable = function() {
	rethinkdb
		.tableCreate( this._params.table, this._tableOptions )
		.run( this._connection.get(), this._onTableCreated.bind( this ) );
};

Insertion.prototype._onTableCreated = function( error ) {
	if( error ) {
		if( this._isTableExistsError( error ) ) {
			this._connection.refreshTables();
			this._insert();
		} else {
			this._callback( error );
			this._destroy();
		}
	} else {
		this._insert();
	}
};

Insertion.prototype._isTableExistsError = function( error ) {
	return error.msg.indexOf( 'already exists' ) !== -1;
};

Insertion.prototype._destroy = function() {
	this._params = null;
	this._value = null;
	this._callback = null;
	this._connection = null;
};

module.exports = Insertion;