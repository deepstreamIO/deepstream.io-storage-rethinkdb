import * as rethinkdb from 'rethinkdb'
import { EventEmitter } from 'events'

export class TableManager {
  private tables = new Set<string>()
  private emitter = new EventEmitter()

  constructor (private connection: rethinkdb.Connection, private database: string) {
    this.emitter.setMaxListeners(0)
  }

  /**
   * Creates the table if it doesn't exist yet
   */
  public async createTable (table: string, primaryKey: string) {
    if (this.emitter.listeners(table).length === 0) {
      this.emitter.once(table, () => {})
      try {
        await rethinkdb
          .db(this.database)
          .tableCreate(table, { primary_key: primaryKey, durability: 'soft' })
          .run(this.connection)

        await this.refreshTables()
        this.emitter.emit(table)
      } catch (e) {
        this.emitter.emit(table)
        if (this.isTableExistsError(e) === false) {
          throw e
        }
      }
      return
    }

    return new Promise((resolve) => this.emitter.once(table, resolve))
  }

  /**
   * Checks if a specific table name exists. The list of tables is retrieved
   * on initialisation and can be updated at runtime using refreshTables
   */
  public hasTable (table: string) {
    return this.tables.has(table)
  }

  /**
   * Called whenever the list of tables has gotten out of sync. E.g. after
   * receiving a "table exists"
   */
  public async refreshTables () {
    const tables = await rethinkdb
      .db(this.database)
      .tableList()
      .run(this.connection)

    this.tables = new Set([...tables])
  }

  /**
   * If tableCreate is called for an existing table, rethinkdb returns a
   * RqlRuntimeError. This error unfortunately doesn't come with a code or constant to check
   * its type, so this method tries to parse its error message instead
   */
  private isTableExistsError (error: any) {
    return error.msg.indexOf('already exists') !== -1
  }
}
