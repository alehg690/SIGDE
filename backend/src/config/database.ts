import { createClient } from '@libsql/client';
import { getTursoConfig } from '@backend/config/env';

const config = getTursoConfig();
export const db = createClient({
  url: config.url,
  authToken: config.authToken,
});
