import {createClient} from '@libsql/client';
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
try {
 const columns=(await db.execute('PRAGMA table_info("Reporte")')).rows;
 if(!columns.some(c=>c.name==='observador')) await db.execute('ALTER TABLE "Reporte" ADD COLUMN "observador" TEXT');
 console.log('Observador preparado; reportes anteriores conservados.');
}finally{db.close();}
