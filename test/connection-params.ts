export const config = {
    host: process.env.RETHINKDB_HOST || 'localhost',
    port: 28015,
    primaryKey: 'own_primary_key',
    db: 'rethinkdb_db_test',
    defaultTable: 'default',
    splitChar: '/',
    storageKey: null,
    readOnly: false
}
