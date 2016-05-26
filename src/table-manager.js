"use strict"

var EventEmitter = require( 'events' ).EventEmitter,
  rethinkdb = require( 'rethinkdb' )

class TableManager extends EventEmitter {

  constructor( connection ) {
    super()
    this._connection = connection
    this._tables = []
    this._eventEmitter = new EventEmitter()
    this._eventEmitter.setMaxListeners( 0 )
  }

  /**
   * Creates the table if it doesn't exist yet
   *
   * @private
   * @returns {void}
   */
  createTable( table, primary_key, callback ) {
    this._eventEmitter.once( table, callback )

    if( this._eventEmitter.listeners( table ).length === 1 ) {
      rethinkdb
        .tableCreate( table, { primaryKey: primary_key, durability: 'soft' } )
        .run( this._connection.get(), this._onTableCreated.bind( this, table ) )
    }
  }

  /**
   * Checks if a specific table name exists. The list of tables is retrieved
   * on initialisation and can be updated at runtime using refreshTables
   *
   * @param   {String}  table the name of the table
   *
   * @public
   * @returns {Boolean} hasTable
   */
  hasTable( table ) {
    return this._tables.indexOf( table ) !== -1
  }

  /**
   * Called whenever the list of tables has gotten out of sync. E.g. after
   * receiving a "table exists"
   *
   * @public
   * @returns {void}
   */
  refreshTables( callback ) {
    rethinkdb
      .tableList()
      .run( this._connection.get() )
      .bind( this )
      .then( function( tables ) {
        this._tables = tables

        if( callback ) {
          callback()
        }
      })
  }

  /**
   * Callback for tableCreate. If an error is received and it is a "table already exists"
   * error, tell the connection to refresh its table-cache, otherwise propagate the error
   *
   * If everything worked, insert the entry
   *
   * @private
   * @returns {void}
   */
  _onTableCreated( table, error ) {
    this.refreshTables()

    if( error && this._isTableExistsError( error ) === false ) {
      this._eventEmitter.emit( table, error )
    } else {
      this._eventEmitter.emit( table, null )
    }
  }

  /**
   * If tableCreate is called for an existing table, rethinkdb returns a
   * RqlRuntimeError. This error unfortunately doesn't come with a code or constant to check
   * its type, so this method tries to parse its error message instead
   *
   * @private
   * @returns {void}
   */
  _isTableExistsError( error ) {
    return error.msg.indexOf( 'already exists' ) !== -1
  }
}

module.exports = TableManager