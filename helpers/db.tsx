import {type GeneratedAlways, Kysely, CamelCasePlugin} from 'kysely'
import {PostgresJSDialect} from 'kysely-postgres-js'
import {DB} from './schema'
import postgres from 'postgres'

export const db = new Kysely<DB>({
  plugins: [new CamelCasePlugin()],
  dialect: new PostgresJSDialect({
    postgres: postgres(process.env.DATABASE_URL!, {
      prepare: false,
      idle_timeout: 10,
      max: 3,
      options: "-c search_path=public"
    }),
  }),
})