import Link from 'next/link';

export function LegalPage({ title, kind }: { title: string; kind: 'terminos' | 'datos' }) {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back" href="/">← Volver al inicio de sesión</Link>
        <p className="legal-eyebrow">SIGDE · Documento institucional</p>
        <h1>{title}</h1>
        <p className="legal-date">Versión 1.0 · Última actualización: 4 de agosto de 2026</p>
        {kind === 'terminos' ? <TerminosContent /> : <DatosContent />}
      </article>
    </main>
  );
}

function TerminosContent() {
  return (
    <div className="legal-content">
      <p className="legal-lead">Lee este documento antes de usar SIGDE. Regula las condiciones de acceso a la plataforma, los deberes de cada usuario y el alcance de los servicios digitales de gestión de convivencia escolar.</p>

      <h2>1. Identificación del responsable</h2>
      <p>SIGDE (Sistema de Gestión Digital Escolar) es operado por <strong>Institución Educativa Técnica Industrial Rafael Navia Varón</strong>, identificada con NIT <strong>805.027.641-9</strong>, con domicilio en <strong>Calle 11 #45-46, Cali, Colombia</strong>. Para soporte, solicitudes o reclamos: <strong>[CORREO INSTITUCIONAL EN DESARROLLO]</strong> y <strong>[TELÉFONO POR DEFINIR]</strong>.</p>
      <p>Si SIGDE es usado como producto ofrecido por una empresa distinta de la institución educativa, la institución y la empresa deberán definir por escrito quién actúa como Responsable y quién como Encargado del Tratamiento. La versión publicada no debe conservar estos corchetes.</p>

      <h2>2. Objeto y alcance</h2>
      <p>SIGDE es una herramienta de apoyo para administrar usuarios, estudiantes, acudientes, reportes de convivencia, alertas configurables, observaciones, evidencias, salidas, notificaciones, auditoría e informes institucionales. No constituye una autoridad disciplinaria independiente, no reemplaza el manual de convivencia, el debido proceso, las decisiones de los órganos escolares ni las obligaciones legales de la institución.</p>
      <p>Estos términos aplican al sitio web, sus rutas, formularios, paneles, APIs, correos automáticos y cualquier módulo que se incorpore posteriormente. El acceso puede estar limitado a la red, dominio de correo o grupos autorizados por la institución.</p>

      <h2>3. Aceptación y capacidad</h2>
      <p>Al iniciar sesión o utilizar una funcionalidad, el usuario declara que conoce estos términos y la Política de Tratamiento de Datos. Cuando la ley exija autorización de un representante legal o una autorización institucional previa, el acceso técnico por sí solo no reemplaza dicha autorización.</p>
      <p>Los usuarios menores de edad no deben crear cuentas por su cuenta si la institución exige cuenta institucional o autorización del representante legal. La institución debe definir el mecanismo verificable de autorización y conservar la evidencia correspondiente.</p>

      <h2>4. Roles, permisos y principio de mínimo acceso</h2>
      <p>SIGDE tiene tres roles con acceso al sistema: Coordinador, Docente y Portería. El rol de mayor responsabilidad es Coordinador; no existe un usuario independiente llamado Administrador. Los permisos dependen del rol asignado por la institución y se aplican con el principio de mínimo acceso: cada persona consulta o modifica solo los datos necesarios para cumplir su función.</p>
      <ul>
        <li><strong>Coordinador:</strong> es el responsable de la administración institucional de SIGDE. Puede gestionar usuarios, estudiantes, configuraciones, auditoría y los módulos de convivencia; además revisa reportes, alertas, observaciones, salidas e informes. Este privilegio no autoriza consultas por curiosidad ni cambios sin justificación institucional.</li>
        <li><strong>Docente:</strong> puede crear reportes de convivencia, consultar reportes por estudiante, ver alertas y usar los módulos pedagógicos y de convivencia que le correspondan. Solo debe registrar hechos relevantes, verificables y pertinentes. La edición de un reporte corresponde al docente que lo creó, dentro de las reglas del sistema.</li>
        <li><strong>Portería:</strong> tiene acceso exclusivamente al módulo de salidas. Puede consultar las salidas necesarias para el control de su turno y crear nuevos registros de salida, pero no puede eliminar salidas ni acceder a reportes, alertas, estudiantes, usuarios, configuraciones o expedientes disciplinarios.</li>
        <li><strong>Acudiente:</strong> no tiene cuenta ni acceso al sistema. Hace parte de los registros institucionales como representante o contacto autorizado del estudiante y recibe las notificaciones relacionadas con su hijo o acudido por los canales registrados y autorizados.</li>
      </ul>
      <p>Los nombres de los roles no amplían los permisos definidos aquí. Las cuentas antiguas con rol Administrador se trasladan al rol Coordinador para conservar la continuidad institucional.</p>

      <h2>5. Cuenta, credenciales y autenticación</h2>
      <p>Las credenciales son personales, confidenciales e intransferibles. Está prohibido compartir contraseñas, usar la cuenta de otra persona, almacenar credenciales en equipos públicos, intentar adivinar contraseñas, automatizar accesos o evadir controles de sesión.</p>
      <p>El usuario debe informar inmediatamente a <strong>[CORREO DE SEGURIDAD EN DESARROLLO]</strong> cualquier acceso sospechoso, pérdida del dispositivo, correo de recuperación no solicitado, modificación no reconocida o exposición de sus credenciales. La institución podrá bloquear, restablecer o suspender la cuenta para proteger la información.</p>

      <h2>6. Uso permitido de los registros</h2>
      <p>Los reportes deben describir hechos relevantes, verificables y pertinentes, con lenguaje respetuoso, sin insultos, diagnósticos médicos no autorizados, opiniones discriminatorias ni acusaciones presentadas como hechos probados. Las evidencias deben ser legales, necesarias y estar relacionadas con el caso.</p>
      <p>Las alertas automáticas son reglas de apoyo basadas en umbrales configurables. No son inteligencia artificial ni determinan por sí mismas responsabilidad, sanción, culpabilidad o riesgo. Toda decisión debe contar con revisión humana, contexto, posibilidad de aclaración y aplicación del manual de convivencia.</p>

      <h2>7. Salidas y notificaciones</h2>
      <p>El módulo de salidas permite registrar la identidad del estudiante, fecha, hora, motivo, persona autorizada, estado y observaciones necesarias para el control institucional. El personal de Portería puede crear y consultar las salidas de su periodo y turno autorizado, pero no eliminarlas ni usar otros módulos del sistema.</p>
      <p>Las notificaciones por correo o por otro canal se envían a los contactos registrados y autorizados. La entrega puede fallar por causas externas; por eso la institución debe mantener un procedimiento alternativo para comunicaciones urgentes y no debe incluir en el asunto o cuerpo más información de la necesaria.</p>

      <h2>8. Propiedad intelectual y contenido</h2>
      <p>La marca SIGDE, su interfaz, código, documentación y elementos gráficos pertenecen a sus respectivos titulares. La información cargada por la institución sigue sometida a las obligaciones de confidencialidad y protección de datos aplicables.</p>
      <p>El usuario concede a la institución únicamente la autorización operativa necesaria para almacenar, organizar, consultar y conservar el contenido dentro de las finalidades institucionales. No se autoriza la publicación de reportes, imágenes o datos de estudiantes en sitios públicos.</p>

      <h2>9. Disponibilidad, mantenimiento y terceros</h2>
      <p>La plataforma puede presentar interrupciones por mantenimiento, actualizaciones, fallas de conectividad, proveedores, correo electrónico, alojamiento o circunstancias de fuerza mayor. La institución procurará continuidad y copias de seguridad conforme a sus capacidades, pero no promete disponibilidad ininterrumpida.</p>
      <p>El alojamiento, base de datos, correo y despliegue pueden estar a cargo de proveedores tecnológicos. La institución debe identificarlos internamente, revisar sus condiciones, limitar sus permisos, celebrar los acuerdos necesarios y verificar dónde se almacenan o procesan los datos.</p>

      <h2>10. Seguridad y respuesta a incidentes</h2>
      <p>La institución aplicará medidas razonables de control de acceso, autenticación, confidencialidad, trazabilidad, respaldos y actualización. Estas medidas no eliminan todos los riesgos de Internet. Ante una pérdida, acceso, alteración, consulta o divulgación no autorizada, se activará el protocolo institucional, se preservarán evidencias, se evaluará el impacto y se realizarán las comunicaciones o reportes que correspondan.</p>

      <h2>11. Suspensión y terminación</h2>
      <p>La institución podrá suspender o retirar el acceso por seguridad, mantenimiento, terminación del vínculo, incumplimiento, orden de autoridad o necesidad institucional. La suspensión no elimina los deberes de confidencialidad ni los registros que deban conservarse por obligación legal, defensa de derechos, auditoría o investigación.</p>

      <h2>12. Modificaciones</h2>
      <p>Estos términos pueden actualizarse por cambios legales, técnicos o institucionales. Se publicará la fecha y versión vigente. Cuando el cambio sea sustancial, la institución deberá informar y, si corresponde, solicitar una nueva aceptación o autorización.</p>

      <h2>13. Ley aplicable y contacto</h2>
      <p>Estos términos se interpretan conforme a la legislación colombiana. Las solicitudes relacionadas con la plataforma pueden dirigirse a <strong>[CORREO INSTITUCIONAL EN DESARROLLO]</strong>; las relacionadas con datos personales, a <strong>[CORREO DE DATOS EN DESARROLLO]</strong>. Las controversias se atenderán primero mediante los canales institucionales y sin perjuicio de los derechos que la ley reconoce ante las autoridades competentes.</p>

      <Link href="/politica-datos">Consultar Política de Tratamiento de Datos →</Link>
    </div>
  );
}

function DatosContent() {
  return (
    <div className="legal-content">
      <p>Esta política explica de forma detallada qué datos personales puede tratar SIGDE, para qué los usa, quién puede consultarlos, cuánto tiempo se conservan, qué derechos tienen los titulares y cómo ejercerlos. Se adopta con referencia al artículo 15 de la Constitución Política, la Ley 1581 de 2012, el Decreto 1074 de 2015 y las instrucciones de la Superintendencia de Industria y Comercio (SIC).</p>

      <h2>1. Responsable, encargado y datos de contacto</h2>
      <p><strong>Responsable:</strong> Institución Educativa Técnica Industrial Rafael Navia Varón · <strong>NIT:</strong> 805.027.641-9 · <strong>Domicilio:</strong> Calle 11 #45-46, Cali, Colombia · <strong>Correo:</strong> [CORREO DE DATOS EN DESARROLLO] · <strong>Teléfono:</strong> [TELÉFONO POR DEFINIR].</p>
      <p>La institución decide las finalidades y medios del tratamiento. Los proveedores que alojan, mantienen o transmiten la plataforma actúan como Encargados únicamente bajo instrucciones documentadas, confidencialidad y medidas de seguridad. La institución debe mantener la lista actualizada de esos proveedores.</p>

      <h2>2. Definiciones</h2>
      <p><strong>Dato personal:</strong> información vinculada o asociable a una persona natural. <strong>Titular:</strong> persona a quien pertenece el dato. <strong>Tratamiento:</strong> recolección, almacenamiento, uso, consulta, circulación, actualización, bloqueo o supresión. <strong>Responsable:</strong> quien decide sobre el tratamiento. <strong>Encargado:</strong> quien lo realiza por cuenta del responsable. <strong>Dato sensible:</strong> información cuyo uso indebido puede afectar la intimidad o generar discriminación, incluyendo salud, biometría, orientación sexual, convicciones y otros previstos por la ley.</p>

      <h2>3. Categorías de datos que puede tratar SIGDE</h2>
      <ul>
        <li><strong>Identificación:</strong> nombres, apellidos, tipo y número de documento, código estudiantil, fecha de nacimiento, edad, curso, grado, grupo, estado académico y fotografía si se habilita.</li>
        <li><strong>Contacto:</strong> correo institucional y personal, teléfono, dirección y datos del acudiente o contacto autorizado.</li>
        <li><strong>Cuenta y seguridad:</strong> usuario, rol, estado de cuenta, contraseña almacenada de forma protegida, códigos de recuperación, fechas de inicio/cierre de sesión, registros de auditoría, IP, navegador y eventos de seguridad.</li>
        <li><strong>Convivencia:</strong> fecha, lugar, descripción del hecho, personas relacionadas, clasificación, medidas pedagógicas, estado del caso, observaciones, compromisos y seguimiento.</li>
        <li><strong>Salidas:</strong> estudiante, hora de salida y regreso, motivo, persona autorizada, autorización, responsable de entrega, estado y observaciones.</li>
        <li><strong>Evidencias:</strong> archivos, imágenes, documentos o notas asociados a un reporte, únicamente cuando sean necesarios, legítimos y autorizados.</li>
        <li><strong>Comunicaciones:</strong> mensajes enviados, destinatarios, estado de entrega, fecha y respuesta o constancia de notificación.</li>
        <li><strong>Datos potencialmente sensibles:</strong> solo se tratarán cuando sean estrictamente necesarios, exista base legal y autorización reforzada cuando corresponda. No deben cargarse diagnósticos, historias clínicas, datos biométricos u otra información sensible si el módulo no la requiere.</li>
      </ul>

      <h2>4. Tratamiento por tipo de usuario</h2>
      <p><strong>Estudiantes:</strong> se tratan datos académicos, de identificación, contacto, convivencia y salidas para administrar la relación escolar, proteger su seguridad, hacer seguimiento pedagógico, notificar al acudiente autorizado y cumplir obligaciones institucionales.</p>
      <p><strong>Acudientes:</strong> se tratan identificación, parentesco o calidad de representante, contacto y trazabilidad para verificar autorizaciones, enviar notificaciones y facilitar el seguimiento del estudiante relacionado. No reciben credenciales ni tienen acceso a SIGDE.</p>
      <p><strong>Docentes:</strong> se tratan identificación, correo, rol, permisos y actividad de cuenta para autenticar, permitir la creación de reportes, la consulta de reportes por estudiante y la visualización de alertas, asignar responsabilidades y mantener auditoría.</p>
      <p><strong>Coordinadores:</strong> son el rol de mayor responsabilidad en SIGDE. Se tratan los datos necesarios para gestión de usuarios, revisión, configuración, informes, seguridad y auditoría. No existe un rol separado de Administrador y el privilegio técnico no permite consultar o divulgar información sin finalidad institucional.</p>
      <p><strong>Personal de Portería:</strong> se tratan los datos mínimos de identificación, autorizaciones y salida para crear y consultar registros de salida durante su turno. No puede eliminar salidas ni acceder a reportes disciplinarios, alertas, usuarios u otros módulos.</p>

      <h2>5. Finalidades específicas</h2>
      <ol>
        <li>Crear y administrar cuentas, roles, permisos y sesiones.</li>
        <li>Validar identidad, recuperar contraseñas y prevenir accesos fraudulentos.</li>
        <li>Registrar, consultar, actualizar y hacer seguimiento de reportes de convivencia.</li>
        <li>Generar alertas por reglas institucionales y facilitar revisión humana.</li>
        <li>Registrar salidas, autorizaciones, responsables y novedades de seguridad.</li>
        <li>Enviar notificaciones operativas al usuario o acudiente autorizado.</li>
        <li>Generar informes estadísticos, PDF o Excel con controles de acceso, preferiblemente agregados o anonimizados cuando no se requiera identificar.</li>
        <li>Atender peticiones, consultas, reclamos, auditorías, investigaciones y requerimientos de autoridad.</li>
        <li>Conservar evidencia y trazabilidad para seguridad, defensa de derechos y cumplimiento legal.</li>
        <li>Mejorar la operación y seguridad del sistema sin usar los datos para publicidad, venta, perfiles comerciales ni finalidades incompatibles.</li>
      </ol>

      <h2>6. Base de legitimidad y autorización</h2>
      <p>El tratamiento se realizará con autorización previa, expresa e informada cuando sea exigible, o con fundamento en una obligación legal, contractual o finalidad institucional legítima permitida por la normativa. La autorización debe poder consultarse posteriormente y explicar finalidades, derechos, responsable y canales.</p>
      <p>La negativa a entregar datos no necesarios no podrá generar consecuencias injustificadas. Los datos estrictamente necesarios para crear una cuenta o cumplir una obligación institucional pueden ser indispensables para prestar el servicio; los datos opcionales deben identificarse como tales.</p>

      <h2>7. Niños, niñas y adolescentes</h2>
      <p>SIGDE trata información de estudiantes menores de edad únicamente cuando responda a su interés superior, respete sus derechos fundamentales y sea adecuada, pertinente y necesaria. La institución debe escuchar al menor según su madurez y capacidad, valorar su opinión y obtener la autorización del representante legal cuando corresponda.</p>
      <p>No se usarán datos de estudiantes para publicidad, venta, publicaciones abiertas, rankings públicos ni perfiles de comportamiento ajenos a la finalidad educativa. Cualquier dato sensible requiere justificación reforzada, minimización, acceso limitado y controles adicionales.</p>

      <h2>8. Circulación, acceso y proveedores</h2>
      <p>El acceso se limita a usuarios autorizados por rol y necesidad. Puede existir acceso del proveedor de alojamiento, base de datos, correo, despliegue, copias de seguridad o soporte, siempre con instrucciones, confidencialidad, seguridad y supervisión. La institución debe informar los proveedores reales y verificar transferencias o transmisiones internacionales cuando existan.</p>
      <p>Los reportes y expedientes no deben hacerse públicos ni enviarse a destinatarios no autorizados. Las exportaciones deben protegerse, limitarse y eliminarse cuando ya no sean necesarias.</p>

      <h2>9. Conservación y supresión</h2>
      <p>Los datos se conservarán durante la relación institucional y por el tiempo adicional necesario para obligaciones legales, archivo, auditoría, defensa de derechos o investigación. La institución debe aprobar una tabla de retención por categoría, revisar periódicamente los datos y suprimir, anonimizar o bloquear aquellos que ya no sean necesarios, salvo excepción legal.</p>

      <h2>10. Medidas de seguridad</h2>
      <p>La institución aplicará, de acuerdo con el riesgo, controles de autenticación, autorización por rol, confidencialidad, registro de accesos, copias de seguridad, recuperación, actualizaciones, protección de secretos, capacitación y revisión de permisos. Las contraseñas no deben almacenarse en texto plano y las exportaciones deben controlarse.</p>
      <p>Ante pérdida, alteración, acceso, consulta, uso o divulgación no autorizada, se documentará el incidente, se contendrá el riesgo, se preservarán evidencias, se evaluarán titulares afectados y se realizarán los reportes y comunicaciones exigibles dentro de los términos aplicables.</p>

      <h2>11. Derechos de los titulares</h2>
      <p>El titular puede conocer, actualizar y rectificar sus datos; solicitar prueba de la autorización; ser informado del uso; presentar quejas ante la SIC; revocar la autorización cuando proceda; y solicitar supresión cuando no exista deber legal o contractual de conservarlos. También puede solicitar información sobre las finalidades, categorías, encargados y canales.</p>

      <h2>12. Consultas y reclamos</h2>
      <p>La solicitud debe dirigirse a <strong>[CORREO DE DATOS EN DESARROLLO]</strong> con nombre, identificación, descripción clara, datos a consultar o corregir y medio de respuesta. La institución verificará identidad, registrará la fecha, responderá dentro de los términos legales y conservará evidencia de la gestión. Si es un reclamo incompleto, solicitará la información faltante; si no puede resolverlo, lo remitirá al competente e informará al solicitante.</p>
      <p>El titular puede acudir a la SIC una vez agotado el trámite ante el responsable, sin perjuicio de otros derechos constitucionales o legales.</p>

      <h2>13. Cambios y vigencia</h2>
      <p>La política rige desde <strong>[FECHA DE VIGENCIA]</strong>. Toda modificación debe indicar versión, fecha, cambios relevantes y mecanismo de comunicación. Si cambia una finalidad o se requiere nueva autorización, la institución deberá informarlo y actuar conforme a la ley.</p>

      <Link href="/terminos">Consultar Términos y Condiciones →</Link>
    </div>
  );
}
