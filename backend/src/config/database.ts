import { createClient } from '@libsql/client';
import { getTursoConfig } from '@backend/config/env';

type DatabaseClient = ReturnType<typeof createClient>;

let client: DatabaseClient | undefined;

function getDatabaseClient() {
  if (!client) {
    const config = getTursoConfig();
    client = createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  return client;
}

export const db = new Proxy({} as DatabaseClient, {
  get(_target, property) {
    const database = getDatabaseClient();
    const value = Reflect.get(database, property);
    return typeof value === 'function' ? value.bind(database) : value;
  },
});
