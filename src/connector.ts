import * as rethinkdb from 'rethinkdb'
import { TableManager } from './table-manager'

import * as crypto from 'crypto'
import { version as pluginVersion } from '../package.json'
import { EventEmitter } from 'events'
import { DeepstreamPlugin, DeepstreamStorage, StorageReadCallback, StorageWriteCallback, EVENT } from '@deepstream/types'

interface RethinkDBOptions extends rethinkdb.ConnectionOptions {
  primaryKey: string,
  db: string,
  defaultTable: string,
  splitChar: string,
  host: string,
  port: number,
  versionKey?: string,
  readOnly: boolean
}

interface Params {
  fullKey?: string,
  table: string,
  id: string
}

export class Connector extends DeepstreamPlugin implements DeepstreamStorage {
  public apiVersion = 2
  public description = `Rethinkdb Storage Connector ${pluginVersion}`

  private connection!: rethinkdb.Connection
  private tableManager!: TableManager
  private defaultTable: string = this.options.defaultTable || 'deepstream_records'
  private splitChar: string | null = this.options.splitChar || null
  private tableMatch!: RegExp | null
  private primaryKey: string = this.options.primaryKey || 'ds_id'
  private emitter = new EventEmitter()
  private isReady: boolean = false
  private logger = this.services.logger.getNameSpace('RETHINDB')

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
   */
  constructor (private options: RethinkDBOptions, private services: any) {
    super ()
    this.checkOptions(options)

    this.tableMatch = this.splitChar
      ? new RegExp('^(\\w+)' + this.escapeRegExp(this.splitChar))
      : null

    options.db = options.db || 'deepstream'

    this.connect()
  }

  private async connect () {
    try {
      this.connection = await rethinkdb.connect(this.options)
      const dbList = await rethinkdb.dbList().run(this.connection)
      if (!dbList.includes(this.options.db)) {
        await rethinkdb.dbCreate(this.options.db).run(this.connection)
      }
      this.connection.use(this.options.db)
      this.tableManager = new TableManager(this.connection, this.options.db)
      await this.tableManager.refreshTables()
      this.isReady = true
      this.emitter.emit('ready')
    } catch (error) {
      this.logger.fatal('CONNECTION_ERROR', error.toString())
    }
  }

  public async whenReady (): Promise<void> {
    if (!this.isReady) {
      return new Promise(resolve => this.emitter.once('ready', resolve))
    }
  }

  public async close () {
    await this.connection.close()
  }

  /**
   * Writes a value to the database. If the specified table doesn't exist yet, it will be created
   * before the write is excecuted. If a table creation is already in progress, create table will
   * only add the method to its array of callbacks
   */
  public set (recordName: string, version: number, data: any, callback: StorageWriteCallback) {
    if (this.options.readOnly) {
      this.logger.error(EVENT.ERROR, 'Rethinkdb running in read-only mode, yet set was called')
    }

    const params = this.getParams(recordName)

    if (this.tableManager.hasTable(params.table)) {
      this.insert(params, version, data, callback)
    } else {
      this.tableManager.createTable(params.table, this.primaryKey)
        .then(() => {
          this.insert(params, version, data, callback)
        })
    }
  }

  /**
   * Retrieves a value from the cache
   */
  public get (key: string, callback: StorageReadCallback) {
    const params = this.getParams(key)

    if (this.tableManager.hasTable(params.table)) {
      rethinkdb
        .table(params.table)
        .get( params.id )
        .run(this.connection, (error: Error | null, entry: any) => {
          if (error) {
            callback(error.toString())
            return
          }
          if (!entry) {
            callback(null, -1, null)
            return
          }
          let version
          if (this.options.versionKey) {
            version = entry[this.options.versionKey]
          } else {
            version = entry.__ds._v
          }
          delete entry[this.primaryKey]
          delete entry.__ds // in case is set
          if (entry.__dsList) {
            callback(null, version, entry.__dsList)
          } else {
            callback(null, version, entry)
          }
        } )
    } else {
      callback(null, -1, null)
    }
  }

  /**
   * Deletes an entry from the cache.
   */
  public delete (key: string, callback: StorageWriteCallback) {
    if (this.options.readOnly) {
      this.logger.error(EVENT.ERROR, 'Rethinkdb running in read-only mode, yet set was called')
    }

    const params = this.getParams( key )

    if (this.tableManager.hasTable(params.table) ) {
      rethinkdb
        .table(params.table)
        .get(params.id)
        .delete()
        .run(this.connection, callback as any)
    } else {
      callback(`Table '${params.table}' does not exist`)
    }
  }

  public deleteBulk (recordNames: string[], callback: StorageWriteCallback): void {
    throw new Error('Delete bulk only required in cache')
  }

  /**
   * Parses the provided record name and returns an object
   * containing a table name and a record name
   */
  private getParams (recordName: string) {
    const table = this.tableMatch ? recordName.match(this.tableMatch) : recordName
    const params: Params = { table: this.defaultTable, id: recordName }

    if (table) {
      params.table = table[1]
      params.id = recordName.substr(table[1].length + 1)
    }

    // rethink can't have a key > 127 bytes; hash key and store alongside
    if (params.id.length > 127) {
      params.fullKey = params.id
      params.id = crypto.createHash('sha256').update(params.id).digest('hex')
    }

    return params
  }

  /**
   * Augments a value with a primary key and writes it to the database
   */
  private insert (params: Params, version: number, data: any, callback: StorageWriteCallback) {
    let value
    if (data instanceof Array) {
      if (this.options.versionKey) {
        value = { __dsList: data, [this.options.versionKey]: version, [this.primaryKey]: params.id }
      } else {
        value = { __dsList: data, __ds: { _v: version }, [this.primaryKey]: params.id }
      }
    } else {
      if (this.options.versionKey) {
        value = { ...data, [this.options.versionKey]: version, [this.primaryKey]: params.id }
      } else {
        value = { ...data, __ds: { _v: version }, [this.primaryKey]: params.id }
      }
    }

    if (params.fullKey) {
      value.__ds.fullKey = params.fullKey
    }

    rethinkdb
      .table(params.table)
      .insert(value, { returnChanges: false, conflict: 'replace' } )
      .run(this.connection, callback as any)
  }

  /**
   * Makes sure that the options object contains all mandatory
   * settings
   */
  private checkOptions (options: RethinkDBOptions) {
    if ( typeof options.host !== 'string' ) {
      throw new Error( 'Missing option host' )
    }
    if (isNaN(options.port)) {
      throw new Error( 'Missing option port' )
    }
  }

  /**
   * Escapes user input for use in a regular expression
   */
  private escapeRegExp (value: string) {
    return value.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) // $& means the whole matched string
  }
}

export default Connector
