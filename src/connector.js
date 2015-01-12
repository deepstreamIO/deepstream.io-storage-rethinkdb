var events = require( 'events' ),
	util = require( 'util' ),
	pckg = require( '../package.json' );

/**
 * A template that can be forked to create cache or storage connectors
 * for [deepstream](http://deepstream.io)
 *
 * Cache connectors are classes that connect deepstream to an in-memory cache, e.g. Redis, Memcached,
 * IronCache or Amazon's elastic cache
 *
 * Storage connectors are classes that connect deepstream to a database, e.g. MongoDB, CouchDB, Cassandra or
 * Amazon's DynamoDB. They can also be used with relational databases, but deepstream's data-structures (blocks
 * of JSON, identified by a key) lends itself very well to object/document based databases.
 *
 * Whats this class used for?
 *
 * Both cache and storage connectors expose the same interface and offer similar functionality,
 * yet their role is a little bit different.
 *
 * Deepstream servers don't hold any data themselves. This allows the individual servers to remain
 * stateless and to go down / fail over without causing any data-loss, but it also allows for 
 * the data to be distributed across multiple nodes.
 *
 * Whenever deepstream has to store something, its written to the cache in a blocking fashion, but written to
 * storage in a non blocking way. (Well, its NodeJS, so it's not really 'blocking', but the next callback for
 * this particular update won't be processed until the cache operation is complete)
 *
 * Similarly, whenever an entry needs to be retrieved, deepstream looks for it in the cache first and in storage
 * second. This means that the cache needs to be very fast - and fortunately most caches are. Both Redis and Memcached
 * have proven to be able to return queries within the same millisecond.
 *
 * So why have this distinction between cache and storage at all? Because they complement each other quite well:
 *
 * - Caches need to make a relatively small amount of data accessible at very high speeds. They achieve that by storing
 * 	 the data in memory, rather than on disk (although some, e.g. Redis, write to disk as well). This means that
 * 	 all data is lost when the process exists. Caches also usually don't offer support for elaborate querying.
 *
 * - Databases (storage) offer long-term storage of larger amounts of data and allow for more elaborate ways of querying.
 *   (full-text search, SQL etc.)
 * 
 * Some considerations when implementing a cache/storage connector
 *
 * - this.isReady starts as false. Once the connection to the cache / storage is established, emit a 'ready' event and set
 *   it to true
 *
 * - Whenever a generic error occurs (e.g. an error that's not directly related to a get, set or delete operation, raise
 *   an error event and send the error message as a parameter, e.g. this.emit( 'error', 'connection lost' ); )
 *
 * - whenever an error occurs as part of a get, set or delete operation, pass it to the callback as the first argument,
 *   otherwise pass null
 *
 * - values for set() will be serializable JavaScript objects and are expected to be returned by get as such. It's
 *   therefor up to this class to handle serialisation / de-serialisation, e.g. as JSON or message-pack. Some
 *   systems (e.g. MongoDB) however can also handle raw JSON directly
 *
 * 
 * @param {Object} options Any options the connector needs to connect to the cache/db and to configure it.
 *
 * @constructor
 */
var Connector = function( options ) {
	this.isReady = false;
	this.name = pckg.name;
	this.version = pckg.version;
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
	
};

module.exports = Connector;