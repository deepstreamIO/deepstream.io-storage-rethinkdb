"use strict"
var events = require('events');

const rethinkdb = require('rethinkdb')

class Connection {

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
    constructor(options, callback) {
        this._options = options
        this._callback = callback
        this._connection = null
        this._database = options.database || 'deepstream'
        options.db = this._database
        rethinkdb.connect(options, this._fn(this._onConnection))
        console.log("CONNECTION ESTABLISED")
    }

    /**
     * Returns the underlying rethinkdb connection
     *
     * @public
     * @returns {RethinkDB Connection} connection
     */
    get connection() {
        return this._connection
    }

    /**
     * Returns the configured number of maximum reconnections
     *
     * @public
     * @returns {Number} number of max. reconnections
     */
    get reconnectCount() {
        return this._options.reconnectCount || 0;
    }

    /**
     * Returns the configured timeouts between two reconnect attempts in ms. Default value: 2000 ms
     *
     * @public
     * @returns {Number} the timeout in ms
     */
    get reconnectTimeout() {
        return this._options.reconnectTimeout >= 0 ? this._options.reconnectTimeout : 2000;
    }

    /**
     * When connection is lost try to reconnect. Reconnection during first/initialization stage is not handled!
     * So, it does not recreate tables, etc.
     *
     *
     * @public
     * @returns {RethinkDB Connection} connection as promise
     */
    reconnect() {
        if (this.reconnectCount)
            return rethinkdb.connect(this._options).then(conn => this._connection = conn)
    }

    /**
     * Callback for established connections. Retrieves the list
     * of available databases
     *
     * @param   {RethinkDB Connection} connection
     *
     * @private
     * @returns {void}
     */
    _onConnection(connection) {
        this._connection = connection
        rethinkdb.dbList().run(connection, this._fn(this._onDbList))
    }

    /**
     * Callback for retrieved database lists. Will check if the deepstream
     * database exists and - if not - create it.
     *
     * @param   {Array} dbList   A list of all available databases
     *
     * @private
     * @returns {void}
     */
    _onDbList(dbList) {
        if (dbList.indexOf(this._database) === -1) {
            rethinkdb.dbCreate(this._database).run(this._connection, this._fn(this._onDb))
        } else {
            this._onDb()
        }
    }

    /**
     * Callback once the database becomes available, either as a result of a create operation
     * or because it already existed.
     *
     * Will retrieve a list of tables from the database
     *
     * @private
     * @returns {void}
     */
    _onDb() {
        this._connection.use(this._database)
        this._callback(null)
    }

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
    _fn(fn) {
        return function(error, result) {
            if (error) {
                this._callback(error)
            } else {
                fn.call(this, result)
            }
        }.bind(this)
    }
}

module.exports = Connection