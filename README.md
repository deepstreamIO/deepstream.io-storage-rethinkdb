# deepstream.io-storage-rethinkdb [![npm version](https://badge.fury.io/js/deepstream.io-storage-rethinkdb.svg)](http://badge.fury.io/js/deepstream.io-storage-rethinkdb)

[deepstream](http://deepstream.io) storage connector for [rethinkdb](http://rethinkdb.com/)

This connector uses [the npm rethinkdb package](https://www.npmjs.com/package/rethinkdb). Please have a look there for detailed options.

##Configuration Options
```javascript
{
	//The host that RethinkDb is listening on
	host: 'localhost',

	//The port that RethinkDb is listening on
	port: 28015,

	//(Optional) Authentication key for RethinkDb
	authKey: 'someString',

	//(Optional, defaults to 'deepstream')
	database: 'someDb',

	//(Optional, defaults to 'deepstream_records')
	defaultTable: 'someTable',

	/* (Optional) A character that's used as part of the
	* record names to split it into a tabel and an id part, e.g.
	* 
	* books/dream-of-the-red-chamber
	*
	* would create a table called 'books' and store the record under the name
	* 'dream-of-the-red-chamber'
	*/
	splitChar: '/'
}
```

##Basic Setup
```javascript
var Deepstream = require( 'deepstream.io' ),
    RethinkDBStorageConnector = require( 'deepstream.io-storage-rethinkdb' ),
    server = new Deepstream();

server.set( 'storage', new RethinkDBStorageConnector( { 
  port: 5672, 
  host: 'localhost' 
}));

server.start();
```

