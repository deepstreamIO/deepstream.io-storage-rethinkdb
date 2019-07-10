import { Connector } from '../src/connector'
import { config } from './connection-params'
import { expect } from 'chai'
import * as rethinkdb from 'rethinkdb'

describe('it  distributes  records  between  multiple  tables',  () => {
  let storageConnector: Connector
  let conn: rethinkdb.Connection

  before(async () => {
    storageConnector = new Connector(config, { logger: { getNameSpace: () => ({
      fatal: (e: any, m: any) => {
        console.error('Fatal exception', e, m)
      }
    })
    }})
    await storageConnector.whenReady()

    conn = (storageConnector as any).connection

    try {
      await rethinkdb.db(config.db).tableDrop(  'dsTestA'  ).run(conn)
      await rethinkdb.db(config.db).tableDrop(  'dsTestB'  ).run(conn)
      await rethinkdb.db(config.db).tableDrop(  'dsTestDefault'  ).run(conn)
    } catch (e) {

    }
    await (storageConnector as any).tableManager.refreshTables()
  })

  // tslint:disable-next-line: no-unused-expression
  const tableNames = ['dsTestA', 'dsTestB']
  for (let i = 0; i < tableNames.length; i++) {
    const tableName = tableNames[i]

    it(`sets  a  value  for  ${tableName}`,  (done) =>   {
      storageConnector.set(`${tableName}/valueA`, 12, { isIn:  tableName },  () => { done() }  )
    })

    it(`has  created  ${tableName}`,  async () =>   {
      const tableList = await rethinkdb.db(config.db).tableList().run(conn)
      expect(  tableList.indexOf( tableName )  ).not.to.equal(  -1  )
    })

    it(`has  written  the  record  to  ${tableName}`,  async () =>   {
      const record = await rethinkdb
        .table(tableName)
        .get('valueA')
        .run(conn)
      expect(record).to.deep.equal({ __ds: { _v: 12 }, own_primary_key: 'valueA', isIn: tableName  })
    })

    it(`creates  and  immediatly  updates  a  value  for  ${tableName}`,  (  done  ) => {
      let  firstInsertionComplete  =  false

      storageConnector.set(`${tableName}/someTest`, 2, { state:  'A' },  (  error  ) => {
        expect(  firstInsertionComplete  ).to.equal(  false  )
        expect(  error  ).to.equal(  null  )
        firstInsertionComplete  = true
      })

      storageConnector.set(`${tableName}/someTest`, 3, { state:  'B' },  (  error  ) => {
        expect(  firstInsertionComplete  ).to.equal(  true  )
        expect(  error  ).to.equal(  null  )

        storageConnector.get(`${tableName}/someTest`,  ( e, version, value  ) => {
          expect(  e  ).to.equal(  null  )
          expect(  value  ).to.deep.equal({  state:  'B'  })
          done()
        })
      })
    })
  }
})
