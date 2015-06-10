# deepstream.io-storage-rethinkdb [![npm version](https://badge.fury.io/js/deepstream.io-storage-rethinkdb.svg)](http://badge.fury.io/js/deepstream.io-storage-rethinkdb)

[deepstream](http://deepstream.io) storage connector for [rethinkdb](http://rethinkdb.com/)

This connector uses [the npm rethinkdb package](https://www.npmjs.com/package/rethinkdb). Please have a look there for detailed options.

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

