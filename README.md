# deepstream.io-storage-rethinkdb
[![Coverage Status](https://coveralls.io/repos/github/deepstreamIO/deepstream.io-storage-rethinkdb/badge.svg?branch=master)](https://coveralls.io/github/deepstreamIO/deepstream.io-storage-rethinkdb?branch=master)
[![npm](https://img.shields.io/npm/v/deepstream.io-storage-rethinkdb.svg)](https://www.npmjs.com/package/deepstream.io-storage-rethinkdb)
[![Dependency Status](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb.svg)](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb)
[![devDependency Status](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb/dev-status.svg)](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb#info=devDependencies)
[![devDependency Status](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb/dev-status.svg)](https://david-dm.org/deepstreamIO/deepstream.io-storage-rethinkdb#info=devDependencies)

[Deepstream](http://deepstream.io) storage connector for [RethinkDB](http://rethinkdb.com/)

This connector uses [the npm rethinkdb package](https://www.npmjs.com/package/rethinkdb). Please have a look there for detailed options.

**Warning**: This plugin will automatically create a table, if it doesn't exist yet. But be aware, in case you create a table manually, use "ds_id" as the primary key. Otherwise the plugin won't be able to find your records. 

## Configuration Options
```yaml
plugins:
  storage:
    name: rethinkdb
    options:
      host: ${RETHINKDB_HOST}
      port: ${RETHINKDB_PORT}
      database: 'someDb'
      defaultTable: 'someTable'
      splitChar: '/'
```

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

## Basic Setup
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

