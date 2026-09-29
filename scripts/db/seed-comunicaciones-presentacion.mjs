import { createClient } from '@libsql/client';

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const autor = await db.execute({ sql: "SELECT id FROM Usuario WHERE nombre = ? AND rol = 'Coordinador' AND activo = 1 LIMIT 1", args: ['Alejandro Hurtado'] });
if (!autor.rows.length) throw new Error('No se encontró la cuenta de coordinación.');

const comunicaciones = [
  {
    tipo: 'Circular', destinatarios: 'Toda la comunidad',
    titulo: 'Encuentro de familias y seguimiento académico',
    contenido: 'Estimadas familias y acudientes:\n\nLos invitamos a participar en los espacios de encuentro y seguimiento académico de la institución. En ellos revisaremos avances, resolveremos inquietudes y acordaremos acciones de acompañamiento para los estudiantes.\n\nLa fecha y el horario de cada grupo se comunicarán por los canales institucionales. Agradecemos mantener actualizados sus datos de contacto.',
  },
  {
    tipo: 'Comunicado', destinatarios: 'Toda la comunidad',
    titulo: 'Canales oficiales de comunicación institucional',
    contenido: 'La institución recuerda a la comunidad educativa que las novedades académicas, de convivencia y administrativas se consultan en los canales oficiales de SIGDE.\n\nAntes de compartir información, verifiquen su origen y revisen los comunicados publicados. Para dudas sobre un caso particular, contacten al director de grupo o a coordinación.',
  },
  {
    tipo: 'Aviso', destinatarios: 'Solo estudiantes',
    titulo: 'Recordatorio de actualización de datos escolares',
    contenido: 'Estudiantes: revisen que sus datos de contacto y los de sus acudientes estén actualizados en la institución. La información correcta permite que las comunicaciones y citaciones lleguen a sus destinatarios.\n\nSi encuentran un dato desactualizado, soliciten su corrección en secretaría.',
  },
  {
    tipo: 'Citación', destinatarios: '8-3',
    titulo: 'Espacio de acompañamiento para familias de 8-3',
    contenido: 'A las familias del grupo 8-3: el equipo institucional dispondrá un espacio de acompañamiento para conversar sobre el proceso académico y de convivencia del grupo.\n\nLa convocatoria individual con fecha, hora y lugar se informará por el canal institucional correspondiente. Para consultas previas, pueden comunicarse con el director de grupo.',
  },
  {
    tipo: 'Circular', destinatarios: 'Solo docentes',
    titulo: 'Orientaciones para el seguimiento de estudiantes',
    contenido: 'Equipo docente:\n\nLes recordamos registrar de forma oportuna las observaciones y acuerdos de seguimiento en SIGDE. El registro debe describir los hechos con claridad y permitir que coordinación y los directores de grupo acompañen cada situación.\n\nCuando se requiera citar a un acudiente, indiquen el motivo y los acuerdos de la reunión en el reporte correspondiente.',
  },
];

let creadas = 0;
for (const item of comunicaciones) {
  const existe = await db.execute({ sql: 'SELECT id FROM Comunicacion WHERE titulo = ? LIMIT 1', args: [item.titulo] });
  if (existe.rows.length) continue;
  const creado = await db.execute({
    sql: "INSERT INTO Comunicacion (titulo, tipo, destinatarios, contenido, estado, autorId, publicadoEn) VALUES (?, ?, ?, ?, 'Publicado', ?, ?) RETURNING id",
    args: [item.titulo, item.tipo, item.destinatarios, item.contenido, Number(autor.rows[0].id), new Date().toISOString()],
  });
  process.stdout.write(`${creado.rows[0].id}: ${item.titulo}\n`);
  creadas += 1;
}
process.stdout.write(`${creadas} comunicaciones creadas.\n`);
