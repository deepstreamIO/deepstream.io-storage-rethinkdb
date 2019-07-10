import { expect } from 'chai'
import { Connector } from '../src/connector'
import { config } from './connection-params'
import * as rethinkdb from 'rethinkdb'

describe( 'is able to insert a larger number of values in quick succession', () => {
  let storageConnector: Connector

  before(async () => {
    storageConnector = new Connector(config, { logger: { getNameSpace: () => ({
      fatal: (e: any, m: any) => {
        console.error('Fatal exception', e, m)
      }
    })
    }})
    await storageConnector.whenReady()
  })

  after(async () => {
    await rethinkdb
      .db(config.db)
      .tableDrop( 'quickInsertTestTable' )
      .run((storageConnector as any).connection)
  })

  it('inserts 20 values in quick succession', (done) => {
    const expected = 20
    let completed = 0

    const callback = (err: Error | null) =>  {
      completed++
      expect(err).to.equal( null )

      if (expected === completed) {
        done()
      }
    }

    expect(() => {
      for (let i = 0; i <= expected; i++) {
        storageConnector.set('quickInsertTestTable/key' + i, i, {}, callback as any)
      }
    }).not.to.throw()
  })
})
