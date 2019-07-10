import { expect } from 'chai'
import { Connector } from '../src/connector'
import { config } from './connection-params'

describe('the storage connector has the correct structure', () => {
  let connector: Connector

  before('creates the connector', async () => {
    connector = new Connector(config, { logger: { getNameSpace: () => ({
      fatal: (e: any, m: any) => {
        console.error('Fatal exception', e, m)
      }
    })
    }})
    await connector.whenReady()
  })

  it('implements the cache/storage connector interface', () => {
    expect(typeof connector.description).to.equal('string')
    expect(typeof connector.deleteBulk).to.equal('function')
    // expect(typeof connector.head).to.equal('function')
    expect(typeof connector.get).to.equal('function')
    expect(typeof connector.set).to.equal('function')
    expect(typeof connector.delete).to.equal('function')
  })

  it('retrieves a non existing value', (done) => {
    connector.get('someValue', (error, version, value) => {
      expect(error).to.equal(null)
      expect(version).to.equal(-1)
      expect(value).to.equal(null)
      done()
    })
  })

  it('sets a value', (done) => {
    connector.set('someValue', 2, { firstname: 'Wolfram' }, (error) => {
      expect(error).to.equal(null)
      done()
    })
  })

  it('retrieves an existing value', (done) => {
    connector.get('someValue', (error, version, value) => {
      expect(error).to.equal(null)
      expect(version).to.equal(2)
      expect(value).to.deep.equal({ firstname: 'Wolfram' })
      done()
    })
  })

  it('deletes a value', (done) => {
    connector.delete('someValue', (error) => {
      expect(error).to.equal(null)
      done()
    })
  })

  it("Can't retrieve a deleted value", (done) => {
    connector.get('someValue', (error, version, value) => {
      expect(error).to.equal(null)
      expect(version).to.equal(-1)
      expect(value).to.equal(null)
      done()
    })
  })
})
