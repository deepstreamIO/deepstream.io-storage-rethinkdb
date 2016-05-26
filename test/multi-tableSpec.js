/*  global  describe,  expect,  it,  jasmine  */
'use  strict'

const  expect  =  require('chai').expect
const  CacheConnector  =  require(  '../src/connector'  )
const  rethinkdb  =  require(  'rethinkdb'  )
const  EventEmitter  =  require(  'events'  ).EventEmitter
const  connectionParams  =  require(  './connection-params'  )
const  settings  =  {
  port:  connectionParams.port,
  host:  connectionParams.host,
  splitChar:  '/',
  defaultTable:  'dsTestDefault',
  database: 'deepstream_storage_provider_test'
}
const  MESSAGE_TIME  =  20

describe(  'it  distributes  records  between  multiple  tables',  () => {
  var cacheConnector
  var conn

  it(  'creates  the  cacheConnector',  (  done  ) => {
    cacheConnector  =  new  CacheConnector(  settings  )
    expect(  cacheConnector.isReady  ).to.equal(  false  )
    cacheConnector.on(  'ready',  done  )
    cacheConnector.on(  'error',  (  error  ) => {
      console.log(  error  )
    })
  })

  it(  'deletes  dsTestA',  (  done  ) => {
    conn  =  cacheConnector._connection.get()
    rethinkdb.tableDrop(  'dsTestA'  ).run(conn, () => { done() } )
  })

  it(  'deletes  dsTestB',  (  done  ) => {
    rethinkdb.tableDrop(  'dsTestB'  ).run(conn, done )
  })

  it(  'deletes  dsTestB',  (  done  ) => {
    rethinkdb.tableDrop(  'dsTestDefault'  ).run(conn, () => { done() })
  })

  it(  'resets  the  table  cache',  (done) =>   {
    cacheConnector._tableManager.refreshTables()
    setTimeout(  done,  50  )
  })

  it(  'doesn\'t  have  dsTestA  or  dsTestB',  (  done  ) => {
    rethinkdb.tableList().run(conn,  (  err,  tableList  ) => {
      expect(  err  ).to.equal(  null  )
      expect(  tableList.indexOf(  'dsTestA'  )  ).to.equal(  -1  )
      expect(  tableList.indexOf(  'dsTestB'  )  ).to.equal(  -1  )
      expect(  tableList.indexOf(  'dsTestDefault'  )  ).to.equal(  -1  )
      done()
    })
  })

  it(  'sets  a  value  for  tableA',  ( done ) =>   {
    cacheConnector.set(  'dsTestA/valueA',  { _d: {  isIn:  'tableA'  } },  () => { done() }  )
  })

  it(  'has  created  tableA',  (done) =>   {
    rethinkdb.tableList().run(conn,  (  err,  tableList  ) => {
      expect(  err  ).to.equal(  null  )
      expect(  tableList.indexOf(  'dsTestA'  )  ).not.to.equal(  -1  )
      done()
    })
  })

  it(  'has  written  the  record  to  tableA',  (done) =>   {
    rethinkdb
    .table(  'dsTestA'  )
    .run(  conn  )
    .then((  cursor  ) => {
      return  cursor.toArray()
    })
    .then((  entries  ) => {
      expect(  entries.length  ).to.equal(  1  )
      expect(  entries  ).to.deep.equal(  [  {  __ds: {}, ds_id:  'valueA',  isIn:  'tableA'  }  ]  )
      done()
    })
  })

  it(  'sets  a  value  for  tableB',  (done) =>   {
    cacheConnector.set(  'dsTestB/valueB',  { _d: {  isIn:  'tableB'  } },  done  )
  })

  it(  'has  created  tableB',  (done) =>   {
    rethinkdb.tableList().run(conn,  (  err,  tableList  ) => {
      expect(  err  ).to.equal(  null  )
      expect(  tableList.indexOf(  'dsTestB'  )  ).not.to.equal(  -1  )
      done()
    })
  })

  it(  'has  written  the  record  to  tableA',  (done) =>   {
    rethinkdb
    .table(  'dsTestB'  )
    .run(  conn  )
    .then((  cursor  ) => {
      return  cursor.toArray()
    })
    .then((  entries  ) => {
      expect(  entries.length  ).to.equal(  1  )
      expect(  entries  ).to.deep.equal(  [  {  __ds: {}, ds_id:  'valueB',  isIn:  'tableB'  }  ]  )
      done()
    })
  })

  it(  'sets  a  value  without  a  table',  (done) =>   {
    cacheConnector.set(  'someValue',  { _d: {  isIn:  'default'  } },  done  )
  })

  it(  'has  created  the  defaultTable',  (done) =>   {
    rethinkdb.tableList().run(conn,  (  err,  tableList  ) => {
      expect(  err  ).to.equal(  null  )
      expect(  tableList.indexOf(  'dsTestDefault'  )  ).not.to.equal(  -1  )
      done()
    })
  })

  it(  'has  written  the  record  to  tableA',  (done) =>   {
    rethinkdb
    .table(  'dsTestDefault'  )
    .run(  conn  )
    .then((  cursor  ) => {
      return  cursor.toArray()
    })
    .then((  entries  ) => {
      expect(  entries.length  ).to.equal(  1  )
      expect(  entries  ).to.deep.equal(  [  {  __ds:{}, ds_id:  'someValue',  isIn:  'default'  }  ]  )
      done()
    })
  })


  it(  'creates  and  immediatly  updates  a  value  for  a  new  table',  (  done  ) => {
    var  firstInsertionComplete  =  false

    cacheConnector.set(  'dsTestC/someTest',  {  _d: { state:  'A' } },  (  error  ) => {
      expect(  firstInsertionComplete  ).to.equal(  false  )
      expect(  error  ).to.equal(  null  )
      firstInsertionComplete  =  true
    })

    cacheConnector.set(  'dsTestC/someTest',  {  _d: { state:  'B' } },  (  error  ) => {
      expect(  firstInsertionComplete  ).to.equal(  true  )
      expect(  error  ).to.equal(  null  )

      cacheConnector.get(  'dsTestC/someTest',  (  error,  value  ) => {
        expect(  error  ).to.equal(  null  )
        expect(  value  ).to.deep.equal({ _d: {  state:  'B'  } })
        done()
      })
    })
  })
})