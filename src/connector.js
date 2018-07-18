"use strict"

const crypto = require('crypto')
const EventEmitter = require('events').EventEmitter
const rethinkdb = require('rethinkdb')
const Connection = require('./connection')
const TableManager = require('./table-manager')
const dataTransform = require('./transform-data')
const pckg = require('../package.json')
const PRIMARY_KEY = require('./primary-key')

class Connector extends EventEmitter {

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
     *     host: 'localhost',
     *     port: 28015,
     *     authKey: 'someString'
     *     database: 'deepstream',
     *     defaultTable: 'deepstream_records',
     *     splitChar: '/'
     * }
     *
     * Please note the three additional, optional keys:
     *
     * database   specifies which database to use. Defaults to 'deepstream'
     * defaultTable specifies which table records will be stored in that don't specify a table. Defaults to deepstream_records
     * splitChar   specifies a character that separates the record's id from the table it should be stored in. defaults to null
     *
     * @constructor
     */
    constructor(options) {
        super()
        this.isReady = false
        this.name = pckg.name
        this.version = pckg.version
        this._checkOptions(options)
        this._options = options
        this._connection = new Connection(options, this._onConnection.bind(this))
        this._reconnectCount = this._connection.reconnectCount
        this._tableManager = new TableManager(this._connection)
        this._defaultTable = options.defaultTable || 'deepstream_records'
        this._splitChar = options.splitChar || null
        this._tableMatch = this._splitChar ?
            new RegExp('^(\\w+)' + this._escapeRegExp(this._splitChar)) :
            null
        this._primaryKey = options.primaryKey || PRIMARY_KEY
    }

    /**
     * Writes a value to the database. If the specified table doesn't exist yet, it will be created
     * before the write is excecuted. If a table creation is already in progress, create table will
     * only add the method to its array of callbacks
     *
     * @param {String}   key
     * @param {Object}   value
     * @param {Function} callback Will be called with null for successful set operations or with an error message string
     *
     * @public
     * @returns {void}
     */
    set(key, value, callback) {
        const params = this._getParams(key)
        const entry = dataTransform.transformValueForStorage(value)
        const insert = this._insert.bind(this, params, entry, callback)

        if (this._tableManager.hasTable(params.table)) {
            insert()
        } else {
            this._tableManager.createTable(params.table, this._primaryKey, insert)
        }
    }

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
    get(key, callback) {
        const params = this._getParams(key)

        if (this._tableManager.hasTable(params.table)) {
            rethinkdb.table(params.table).get(params.id).run(this._connection.connection, (error, entry) => {
                if (entry) {
                    delete entry[this._primaryKey]
                    delete entry.__key // in case is set
                    entry = dataTransform.transformValueFromStorage(entry)
                }
                this._errorHandler(callback, this.get, arguments)(error, entry);
            })
        } else {
            callback(null, null)
        }
    }

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
    delete(key, callback) {
        const params = this._getParams(key)

        if (this._tableManager.hasTable(params.table)) {
            rethinkdb.table(params.table).get(params.id).delete().run(this._connection.connection, callback);
        } else {
            callback(new Error('Table \'' + params.table + '\' does not exist'));
        }
    }

    /**
     * Callback for established connections
     *
     * @param   {Error} error
     *
     * @private
     * @returns {void}
     */
    _onConnection(error) {
        if (error) {
            this.emit('error', error);
        } else {
            this._tableManager.refreshTables(() => {
                this.isReady = true
                this.emit('ready')
            });
        }
    }

    /**
     * Parses the provided record name and returns an object
     * containing a table name and a record name
     *
     * @param   {String} key the name of the record
     *
     * @private
     * @returns {Object} params
     */
    _getParams(key) {
        const table = key.match(this._tableMatch)
        var params = {
            table: this._defaultTable,
            id: key
        }

        if (table) {
            params.table = table[1]
            params.id = key.substr(table[1].length + 1)
        }

        // rethink can't have a key > 127 bytes; hash key and store alongside
        if (params.id.length > 127) {
            params.fullKey = params.id;
            params.id = crypto.createHash('sha256').update(params.id).digest('hex');
        }

        return params
    }

    /**
     * Augments a value with a primary key and writes it to the database
     *
     * @param   {Object} params Map in the format { table: String, id: String }
     * @param   {Object} value The value that will be written
     * @param   {Function} callback called with error or null
     *
     * @private
     * @returns {void}
     */
    _insert(params, value, callback) {
        value[this._primaryKey] = params.id
        if (params.fullKey) {
            value.__key = params.fullKey
        }

        rethinkdb
            .table(params.table)
            .insert(value, {
                returnChanges: false,
                conflict: 'replace'
            })
            .run(this._connection.connection, this._errorHandler(callback, this._insert, arguments))
    }

    /**
     * Makes sure that the options object contains all mandatory
     * settings
     *
     * @param   {Object} options
     *
     * @private
     * @returns {void}
     */
    _checkOptions(options) {
        if (typeof options.host !== 'string') {
            throw new Error('Missing option host')
        }
        if (isNaN(options.port)) {
            throw new Error('Missing option port')
        }
    }

    /**
     * Escapes user input for use in a regular expression
     *
     * @param   {String} string the user input
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
     * @copyright public domain
     *
     * @private
     * @returns {String} escaped user input
     */
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
    }

    /**
     * Handle reconnection: checks if the error is for lost connection, if so, it reconnects for te configured times.
     *
     * @param   {Function} callback The "normal" user callback that must be passed with/without error
     * @param   {Function} fv The method of this class to be retried
     * @param   {Array} args The argument array of fv
     *
     * @private
     * @returns {void}
     */
    _errorHandler(callback, fv, args) {
        return (error, entry) => {
            // If there is NO error, then we can safely reset the reconnect count to the original value
            if (!error) {
                this._reconnectCount = this._connection.reconnectCount
            }

            if (error && (error.msg === 'Connection is closed.' || error.msg.match(/Could not connect to/)) && !!this._reconnectCount) {
                console.log("Lost rethinkdb connection, will reconnect...", error)
                setTimeout(() => {
                    return this._connection.reconnect()
                        .then(() => {
                            this._reconnectCount--
                                fv.apply(this, args)
                        })
                        .catch(err => fv.apply(this, args))
                }, this._connection.reconnectTimeout)
            } else {
                callback(error, entry);
            }
        }
    }
}

module.exports = Connector;