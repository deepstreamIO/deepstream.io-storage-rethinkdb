import { expect } from 'chai'
import { Connector } from '../src/connector'
import { config } from './connection-params'
import * as rethinkdb from 'rethinkdb'

describe('the storage connector uses a custom version key', () => {
  let connector: Connector
  let connection: rethinkdb.Connection

  before('creates the connector', async () => {
    connector = new Connector({ ...config, versionKey: '__v' }, { logger: { getNameSpace: () => ({
      fatal: (e: any, m: any) => {
        console.error('Fatal exception', e, m)
      }
    })
    }})

    await connector.whenReady()
    connection = (connector as any).connection
  })

  it('sets a value', (done) => {
    connector.set('someValueWithCustomVersion', 2, { firstname: 'Wolfram' }, (error) => {
      expect(error).to.equal(null)

      rethinkdb
        .table(config.defaultTable)
        .get('someValueWithCustomVersion')
        .run(connection)
        .then((result) => {
            expect(result).to.deep.equal({ __v: 2, firstname: 'Wolfram', own_primary_key: 'someValueWithCustomVersion' })
        })
        .then(() => done())
    })
  })

  it('retrieves an existing value', (done) => {
    connector.get('someValueWithCustomVersion', (error, version, value) => {
      expect(error).to.equal(null)
      expect(version).to.equal(2)
      expect(value).to.deep.equal({ __v: 2, firstname: 'Wolfram' })
      done()
    })
  })
})
